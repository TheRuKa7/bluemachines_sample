import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CallSession } from "@/lib/call-audit";
import type { LiveCallEval } from "@/lib/call-eval";
import { computeLiveCallEval } from "@/lib/call-eval";

const STORAGE_KEY = "tiger-last-call-session";

interface StoredSession {
  session: CallSession;
  eval: LiveCallEval;
}

interface CallSessionContextValue {
  activeSession: CallSession | null;
  liveEval: LiveCallEval | null;
  refreshEval: (session: CallSession) => void;
  clearSession: () => void;
}

const CallSessionContext = createContext<CallSessionContextValue | null>(null);

function loadStored(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveStored(session: CallSession, evalResult: LiveCallEval) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ session, eval: evalResult }));
  } catch {
    /* quota or private mode */
  }
}

export function CallSessionProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [activeSession, setActiveSession] = useState<CallSession | null>(stored?.session ?? null);
  const [liveEval, setLiveEval] = useState<LiveCallEval | null>(stored?.eval ?? null);

  const refreshEval = useCallback((session: CallSession) => {
    const evalResult = computeLiveCallEval(session);
    setActiveSession(session);
    setLiveEval(evalResult);
    saveStored(session, evalResult);
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    setLiveEval(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        setActiveSession(null);
        setLiveEval(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ activeSession, liveEval, refreshEval, clearSession }),
    [activeSession, liveEval, refreshEval, clearSession],
  );

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>;
}

export function useCallSession() {
  const ctx = useContext(CallSessionContext);
  if (!ctx) throw new Error("useCallSession must be used within CallSessionProvider");
  return ctx;
}
