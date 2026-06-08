import type { StageId } from "@/data/model";

export interface LiveTranscriptLine {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
}

export type AuditEventType =
  | "CALL_INITIATED"
  | "MIC_CHECK_OK"
  | "MIC_CHECK_FAILED"
  | "SESSION_PATCH"
  | "CALL_CONNECTED"
  | "TRANSCRIPT_USER"
  | "TRANSCRIPT_AGENT"
  | "MIC_MUTED"
  | "MIC_UNMUTED"
  | "SPEECH_AGENT_START"
  | "SPEECH_AGENT_END"
  | "CALL_ENDED"
  | "CALL_ERROR"
  | "RATING_SUBMITTED"
  | "EVAL_COMPUTED";

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  detail: string;
  meta?: Record<string, string>;
}

export interface CallRating {
  stars: number;
  comment?: string;
}

export interface CallSession {
  id: string;
  stageId: StageId;
  objectionId: string | null;
  failureMode: boolean;
  startedAt: number | null;
  endedAt: number | null;
  transcript: LiveTranscriptLine[];
  auditLog: AuditEvent[];
  error: string | null;
  rating: CallRating | null;
}

let auditSeq = 0;

export function createAuditEvent(
  type: AuditEventType,
  detail: string,
  meta?: Record<string, string>,
): AuditEvent {
  auditSeq += 1;
  return {
    id: `audit-${Date.now()}-${auditSeq}`,
    timestamp: Date.now(),
    type,
    detail,
    meta,
  };
}

export function formatAuditTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function callDurationSeconds(session: CallSession): number {
  if (!session.startedAt || !session.endedAt) return 0;
  return Math.max(0, Math.round((session.endedAt - session.startedAt) / 1000));
}
