import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CallSession } from "@/lib/call-audit";
import type { LiveCallEval } from "@/lib/call-eval";
import { computeLiveCallEval } from "@/lib/call-eval";

interface CallSessionContextValue {
  activeSession: CallSession | null;
  setActiveSession: (session: CallSession | null) => void;
  liveEval: LiveCallEval | null;
  refreshEval: (session: CallSession) => void;
  clearSession: () => void;
}

const CallSessionContext = createContext<CallSessionContextValue | null>(null);

export function CallSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);
  const [liveEval, setLiveEval] = useState<LiveCallEval | null>(null);

  const refreshEval = useCallback((session: CallSession) => {
    setActiveSession(session);
    setLiveEval(computeLiveCallEval(session));
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    setLiveEval(null);
  }, []);

  const value = useMemo(
    () => ({ activeSession, setActiveSession, liveEval, refreshEval, clearSession }),
    [activeSession, liveEval, refreshEval, clearSession],
  );

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>;
}

export function useCallSession() {
  const ctx = useContext(CallSessionContext);
  if (!ctx) throw new Error("useCallSession must be used within CallSessionProvider");
  return ctx;
}
