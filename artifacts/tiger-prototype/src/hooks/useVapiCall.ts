import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import { VAPI_ASSISTANT_ID, VAPI_PUBLIC_KEY, VAPI_SESSION_API } from "@/config/vapi";
import { buildAssistantOverrides } from "@/data/vapi-prompt";
import { ensureMicrophoneAccess, resumeVapiAudioOutput } from "@/lib/audio";
import type { StageId } from "@/data/model";

export type VapiCallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export interface LiveTranscriptLine {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
}

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
  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectStage, setConnectStage] = useState<string | null>(null);

  const scrollTranscript = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const bindVapiEvents = useCallback(
    (vapi: Vapi) => {
      vapi.on("call-start", () => {
        setStatus("active");
        setError(null);
        setConnectStage(null);
        void resumeVapiAudioOutput();
      });

      vapi.on("call-end", () => {
        setStatus("ended");
        setIsSpeaking(false);
        setVolumeLevel(0);
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
        setStatus("error");
        setError(event?.error ?? `Call failed at ${event?.stage ?? "unknown"} stage`);
      });

      vapi.on("message", (message: Record<string, unknown>) => {
        if (message.type === "transcript" && typeof message.transcript === "string") {
          const transcriptType = message.transcriptType as string | undefined;
          if (transcriptType === "partial") return;

          const role = message.role === "user" ? "user" : "assistant";
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
              return [
                ...prev.slice(0, -1),
                { ...last, text: message.transcript as string, timestamp: Date.now() },
              ];
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${prev.length}`,
                role,
                text: message.transcript as string,
                timestamp: Date.now(),
              },
            ];
          });
          requestAnimationFrame(scrollTranscript);
        }
      });

      vapi.on("error", (e: unknown) => {
        setStatus("error");
        setError(parseVapiError(e));
      });
    },
    [scrollTranscript],
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
        return (await res.json()) as SessionResponse;
      }
    } catch {
      /* Netlify function unavailable in vite dev — client overrides */
    }

    return {
      publicKey: VAPI_PUBLIC_KEY,
      assistantId: VAPI_ASSISTANT_ID,
      assistantOverrides: buildAssistantOverrides(stageId, objectionId, failureMode),
    };
  }, [stageId, objectionId, failureMode]);

  const startCall = useCallback(async () => {
    if (status === "connecting" || status === "active") return;

    setStatus("connecting");
    setTranscript([]);
    setError(null);
    setConnectStage("microphone check");

    try {
      await ensureMicrophoneAccess();
      const vapi = await getVapi();
      const session = await fetchSession();
      setConnectStage("connecting to Aria");
      await vapi.start(session.assistantId, session.assistantOverrides);
      await resumeVapiAudioOutput();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not start call");
      setConnectStage(null);
    }
  }, [fetchSession, getVapi, status]);

  const endCall = useCallback(async () => {
    await vapiRef.current?.stop();
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
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript([]);
    setError(null);
    setIsSpeaking(false);
    setVolumeLevel(0);
    setIsMuted(false);
    setConnectStage(null);
  }, []);

  return {
    status,
    isSpeaking,
    volumeLevel,
    isMuted,
    transcript,
    error,
    connectStage,
    transcriptEndRef,
    startCall,
    endCall,
    toggleMute,
    reset,
    isActive: status === "active" || status === "connecting",
  };
}
