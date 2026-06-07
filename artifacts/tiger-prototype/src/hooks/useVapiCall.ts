import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { VAPI_ASSISTANT_ID, VAPI_PUBLIC_KEY, VAPI_SESSION_API } from "@/config/vapi";
import { buildAssistantOverrides } from "@/data/vapi-prompt";
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

export function useVapiCall(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
) {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setStatus("active");
      setError(null);
    });

    vapi.on("call-end", () => {
      setStatus("ended");
      setIsSpeaking(false);
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));

    vapi.on("message", (message) => {
      if (message.type === "transcript" && message.transcript) {
        const role = message.role === "user" ? "user" : "assistant";
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: message.transcript, timestamp: Date.now() },
            ];
          }
          return [
            ...prev,
            {
              id: `${Date.now()}-${prev.length}`,
              role,
              text: message.transcript,
              timestamp: Date.now(),
            },
          ];
        });
      }
    });

    vapi.on("error", (e: unknown) => {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Voice call error";
      setError(msg);
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, []);

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
      /* local dev without Netlify — fall through */
    }

    return {
      publicKey: VAPI_PUBLIC_KEY,
      assistantId: VAPI_ASSISTANT_ID,
      assistantOverrides: buildAssistantOverrides(stageId, objectionId, failureMode),
    };
  }, [stageId, objectionId, failureMode]);

  const startCall = useCallback(async () => {
    const vapi = vapiRef.current;
    if (!vapi || status === "connecting" || status === "active") return;

    setStatus("connecting");
    setTranscript([]);
    setError(null);

    try {
      const session = await fetchSession();
      await vapi.start(session.assistantId, session.assistantOverrides);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not start call");
    }
  }, [fetchSession, status]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    setStatus("ended");
    setIsSpeaking(false);
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript([]);
    setError(null);
    setIsSpeaking(false);
  }, []);

  return {
    status,
    isSpeaking,
    transcript,
    error,
    startCall,
    endCall,
    reset,
    isActive: status === "active" || status === "connecting",
  };
}
