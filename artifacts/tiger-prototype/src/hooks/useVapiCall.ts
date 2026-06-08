import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import { VAPI_ASSISTANT_ID, VAPI_PUBLIC_KEY, VAPI_SESSION_API } from "@/config/vapi";
import { buildAssistantOverrides } from "@/data/vapi-prompt";
import { ensureMicrophoneAccess, resumeVapiAudioOutput } from "@/lib/audio";
import {
  createAuditEvent,
  type AuditEvent,
  type CallSession,
  type LiveTranscriptLine,
} from "@/lib/call-audit";
import type { StageId } from "@/data/model";

export type VapiCallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export type { LiveTranscriptLine };

interface SessionResponse {
  publicKey: string;
  assistantId: string;
  assistantOverrides: ReturnType<typeof buildAssistantOverrides>;
}

type VapiErrorPayload = {
  error?: { message?: string } | string;
  type?: string;
  stage?: string;
};

function parseVapiError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  const payload = e as VapiErrorPayload;
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error && typeof payload.error === "object" && "message" in payload.error) {
    return String(payload.error.message);
  }
  if (payload?.type) return `Call error: ${payload.type}`;
  return "Voice call error";
}

export function useVapiCall(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
  enabled: boolean,
) {
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef(`call-${Date.now()}`);
  const startedAtRef = useRef<number | null>(null);
  const endedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectStage, setConnectStage] = useState<string | null>(null);

  const appendAudit = useCallback((type: AuditEvent["type"], detail: string, meta?: Record<string, string>) => {
    setAuditLog((prev) => [...prev, createAuditEvent(type, detail, meta)]);
  }, []);

  const scrollTranscript = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const bindVapiEvents = useCallback(
    (vapi: Vapi) => {
      vapi.on("call-start", () => {
        startedAtRef.current = Date.now();
        setStatus("active");
        setError(null);
        setConnectStage(null);
        appendAudit("CALL_CONNECTED", "Voice session active with Aria");
        void resumeVapiAudioOutput();
      });

      vapi.on("call-end", () => {
        endedAtRef.current = Date.now();
        setStatus("ended");
        setIsSpeaking(false);
        setVolumeLevel(0);
        appendAudit("CALL_ENDED", "Customer or agent ended the call");
      });

      vapi.on("speech-start", () => setIsSpeaking(true));
      vapi.on("speech-end", () => setIsSpeaking(false));

      vapi.on("volume-level", (level: number) => {
        setVolumeLevel(typeof level === "number" ? level : 0);
      });

      vapi.on("call-start-progress", (event: { stage?: string; status?: string }) => {
        if (event?.status === "started" && event.stage) {
          setConnectStage(event.stage.replace(/-/g, " "));
        }
      });

      vapi.on("call-start-failed", (event: { error?: string; stage?: string }) => {
        const msg = event?.error ?? `Call failed at ${event?.stage ?? "unknown"} stage`;
        setStatus("error");
        setError(msg);
        appendAudit("CALL_ERROR", msg);
      });

      vapi.on("message", (message: Record<string, unknown>) => {
        if (message.type === "transcript" && typeof message.transcript === "string") {
          const transcriptType = message.transcriptType as string | undefined;
          if (transcriptType === "partial") return;

          const role = message.role === "user" ? "user" : "assistant";
          const text = message.transcript as string;
          appendAudit(
            role === "user" ? "TRANSCRIPT_USER" : "TRANSCRIPT_AGENT",
            text.length > 120 ? `${text.slice(0, 120)}…` : text,
          );

          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
              return [
                ...prev.slice(0, -1),
                { ...last, text, timestamp: Date.now() },
              ];
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${prev.length}`,
                role,
                text,
                timestamp: Date.now(),
              },
            ];
          });
          requestAnimationFrame(scrollTranscript);
        }
      });

      vapi.on("error", (e: unknown) => {
        const msg = parseVapiError(e);
        setStatus("error");
        setError(msg);
        appendAudit("CALL_ERROR", msg);
      });
    },
    [appendAudit, scrollTranscript],
  );

  const getVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current;
    const { default: VapiCtor } = await import("@vapi-ai/web");
    const vapi = new VapiCtor(
      VAPI_PUBLIC_KEY,
      undefined,
      { alwaysIncludeMicInPermissionPrompt: true },
      { audioSource: true },
    );
    bindVapiEvents(vapi);
    vapiRef.current = vapi;
    return vapi;
  }, [bindVapiEvents]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      vapiRef.current?.stop();
      vapiRef.current = null;
    };
  }, [enabled]);

  const fetchSession = useCallback(async (): Promise<SessionResponse> => {
    const params = new URLSearchParams({
      stage: stageId,
      failureMode: String(failureMode),
    });
    if (objectionId) params.set("objection", objectionId);

    try {
      const res = await fetch(`${VAPI_SESSION_API}?${params}`);
      if (res.ok) {
        appendAudit("SESSION_PATCH", "Assistant patched via /api/vapi-session", { stage: stageId });
        return (await res.json()) as SessionResponse;
      }
    } catch {
      appendAudit("SESSION_PATCH", "Client-side assistant overrides (dev fallback)", { stage: stageId });
    }

    return {
      publicKey: VAPI_PUBLIC_KEY,
      assistantId: VAPI_ASSISTANT_ID,
      assistantOverrides: buildAssistantOverrides(stageId, objectionId, failureMode),
    };
  }, [stageId, objectionId, failureMode, appendAudit]);

  const startCall = useCallback(async () => {
    if (status === "connecting" || status === "active") return;

    sessionIdRef.current = `call-${Date.now()}`;
    startedAtRef.current = null;
    endedAtRef.current = null;
    setStatus("connecting");
    setTranscript([]);
    setAuditLog([]);
    setError(null);
    setConnectStage("microphone check");

    appendAudit("CALL_INITIATED", `Outbound call for stage ${stageId}`, {
      stage: stageId,
      objection: objectionId ?? "none",
      failure_mode: String(failureMode),
    });

    try {
      await ensureMicrophoneAccess();
      appendAudit("MIC_CHECK_OK", "Microphone permission granted");
      const vapi = await getVapi();
      const session = await fetchSession();
      setConnectStage("connecting to Aria");
      await vapi.start(session.assistantId, session.assistantOverrides);
      await resumeVapiAudioOutput();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start call";
      setStatus("error");
      setError(msg);
      setConnectStage(null);
      appendAudit(
        msg.toLowerCase().includes("microphone") ? "MIC_CHECK_FAILED" : "CALL_ERROR",
        msg,
      );
    }
  }, [appendAudit, fetchSession, getVapi, status, stageId, objectionId, failureMode]);

  const endCall = useCallback(async () => {
    await vapiRef.current?.stop();
    endedAtRef.current = endedAtRef.current ?? Date.now();
    setStatus("ended");
    setIsSpeaking(false);
    setVolumeLevel(0);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    const next = !vapi.isMuted();
    vapi.setMuted(next);
    setIsMuted(next);
    appendAudit(next ? "MIC_MUTED" : "MIC_UNMUTED", next ? "Customer muted microphone" : "Customer unmuted microphone");
  }, [appendAudit]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript([]);
    setAuditLog([]);
    setError(null);
    setIsSpeaking(false);
    setVolumeLevel(0);
    setIsMuted(false);
    setConnectStage(null);
    startedAtRef.current = null;
    endedAtRef.current = null;
  }, []);

  const buildSession = useCallback((): CallSession => {
    return {
      id: sessionIdRef.current,
      stageId,
      objectionId,
      failureMode,
      startedAt: startedAtRef.current,
      endedAt: endedAtRef.current ?? (status === "ended" || status === "error" ? Date.now() : null),
      transcript,
      auditLog,
      error,
      rating: null,
    };
  }, [stageId, objectionId, failureMode, transcript, auditLog, error, status]);

  return {
    status,
    isSpeaking,
    volumeLevel,
    isMuted,
    transcript,
    auditLog,
    error,
    connectStage,
    transcriptEndRef,
    startCall,
    endCall,
    toggleMute,
    reset,
    buildSession,
    appendAudit,
    isActive: status === "active" || status === "connecting",
  };
}
