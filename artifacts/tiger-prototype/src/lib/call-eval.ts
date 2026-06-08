import { STAGES, type StageId } from "@/data/model";
import { type CallRating, type CallSession, callDurationSeconds } from "./call-audit";

export interface EvalDimension {
  key: string;
  label: string;
  value: string;
  score: number;
  maxScore: number;
  pass: boolean;
  description: string;
}

export interface LiveCallEval {
  computedAt: number;
  dimensions: EvalDimension[];
  overallScore: number;
  overallPass: boolean;
  disposition: string;
  signals: string[];
}

const ESCALATION_PHRASES = [
  "specialist",
  "human agent",
  "inside sales",
  "escalat",
  "transfer you",
  "connect you to",
  "someone will call",
];

const STAGE_KEYWORDS: Record<StageId, string[]> = {
  APPROVED: ["approved", "ekyc", "link", "whatsapp", "identity", "step"],
  EKYC_PENDING: ["ekyc", "step", "selfie", "pan", "aadhaar", "wifi", "failure", "timeout", "retry", "link"],
  EKYC_COMPLETE: ["vkyc", "video", "slot", "schedule", "9", "prime"],
  VKYC_PENDING: ["vkyc", "video", "slot", "remind", "reschedule", "pan"],
  VKYC_COMPLETE: ["activ", "app", "virtual", "card", "pin"],
  ACTIVATION_PENDING: ["activ", "app", "fee", "pin", "screen"],
  ACTIVE: ["active", "virtual", "physical", "cashback", "welcome"],
  ESCALATED: ["specialist", "callback", "handoff", "context"],
};

const GUIDANCE_MARKERS = [
  "step",
  "wifi",
  "selfie",
  "pan",
  "aadhaar",
  "otp",
  "submit",
  "whatsapp",
  "video",
  "activ",
  "link",
];

function allAgentText(session: CallSession): string {
  return session.transcript
    .filter((t) => t.role === "assistant")
    .map((t) => t.text.toLowerCase())
    .join(" ");
}

function allUserText(session: CallSession): string {
  return session.transcript
    .filter((t) => t.role === "user")
    .map((t) => t.text.toLowerCase())
    .join(" ");
}

function keywordScore(text: string, keywords: string[]): number {
  if (!text.trim()) return 0;
  const hits = keywords.filter((k) => text.includes(k)).length;
  return Math.min(5, Math.round((hits / Math.max(3, keywords.length * 0.4)) * 5));
}

export function computeLiveCallEval(session: CallSession): LiveCallEval {
  const agentText = allAgentText(session);
  const userText = allUserText(session);
  const combined = `${agentText} ${userText}`;
  const stage = STAGES.find((s) => s.id === session.stageId)!;
  const durationSec = callDurationSeconds(session);
  const signals: string[] = [];

  const stageKw = STAGE_KEYWORDS[session.stageId];
  const stageScore = keywordScore(agentText, stageKw);
  const stagePass = stageScore >= 3 || session.transcript.filter((t) => t.role === "assistant").length >= 2;
  if (stagePass) signals.push("Agent language aligned with stage objective");
  else signals.push("Limited stage-specific guidance detected");

  const escalated =
    ESCALATION_PHRASES.some((p) => agentText.includes(p)) ||
    /\b(speak to (a )?human|real person|manager)\b/.test(userText);
  const containmentScore = escalated ? 1 : session.error ? 2 : 5;
  const contained = !escalated && !session.error;
  if (contained) signals.push("No escalation path taken on this call");
  if (escalated) signals.push("Escalation or human handoff language detected");

  const guidanceScore = keywordScore(agentText, GUIDANCE_MARKERS);
  const guidancePass = guidanceScore >= 2 || session.stageId === "ACTIVE";
  if (guidancePass) signals.push("Process steps or field guidance mentioned");

  const userTurns = session.transcript.filter((t) => t.role === "user").length;
  const agentTurns = session.transcript.filter((t) => t.role === "assistant").length;
  const engagementScore =
    userTurns === 0 ? 1 : Math.min(5, Math.round((Math.min(userTurns, agentTurns) / Math.max(userTurns, agentTurns, 1)) * 5));

  const csatScore = session.rating?.stars ?? null;
  const csatPass = csatScore !== null ? csatScore >= 4 : false;

  let disposition = "contact_logged";
  if (session.error) disposition = "call_failed";
  else if (durationSec < 15 && agentTurns < 2) disposition = "abandoned_early";
  else if (escalated) disposition = "escalation_offered";
  else if (session.stageId === "EKYC_PENDING" && agentText.includes("link")) disposition = "ekyc_retriggered";
  else if (session.stageId === "EKYC_COMPLETE" && agentText.includes("slot")) disposition = "vkyc_scheduling";
  else if (agentText.includes("activ")) disposition = "activation_guided";
  else if (userTurns >= 2) disposition = "customer_engaged";

  const dimensions: EvalDimension[] = [
    {
      key: "stage_alignment",
      label: "Stage alignment",
      value: `${stageScore}/5`,
      score: stageScore,
      maxScore: 5,
      pass: stagePass,
      description: `Did the agent pursue "${stage.shortLabel}" objectives?`,
    },
    {
      key: "containment",
      label: "Containment",
      value: contained ? "Contained" : "Escalated",
      score: containmentScore,
      maxScore: 5,
      pass: contained,
      description: "Resolved on the call without human handoff",
    },
    {
      key: "escalation_risk",
      label: "Escalation risk",
      value: escalated ? "Elevated" : "Low",
      score: escalated ? 1 : 5,
      maxScore: 5,
      pass: !escalated,
      description: "Human/specialist transfer signals in transcript",
    },
    {
      key: "call_duration",
      label: "Call duration",
      value: durationSec > 0 ? formatDuration(durationSec) : "—",
      score: durationSec >= 30 && durationSec <= 600 ? 5 : durationSec > 0 ? 3 : 0,
      maxScore: 5,
      pass: durationSec >= 20,
      description: "Length of live voice session",
    },
    {
      key: "guidance_depth",
      label: "Guidance depth",
      value: `${guidanceScore}/5`,
      score: guidanceScore,
      maxScore: 5,
      pass: guidancePass,
      description: "Step-by-step eKYC/VKYC/activation coaching in agent turns",
    },
    {
      key: "csat",
      label: "CSAT",
      value: csatScore !== null ? `${csatScore}/5` : "Awaiting rating",
      score: csatScore ?? 0,
      maxScore: 5,
      pass: csatPass,
      description: "Your post-call rating",
    },
  ];

  const ratedDims = dimensions.filter((d) => d.key !== "csat" || csatScore !== null);
  const overallScore =
    ratedDims.reduce((s, d) => s + d.score, 0) / Math.max(ratedDims.length, 1);
  const overallPass =
    overallScore >= 3.5 &&
    stagePass &&
    contained &&
    (csatScore === null || csatPass);

  if (session.failureMode) signals.push("Evaluated under degraded-system scenario");

  return {
    computedAt: Date.now(),
    dimensions,
    overallScore: Math.round(overallScore * 10) / 10,
    overallPass,
    disposition,
    signals,
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function evalUpdatesAfterRating(
  session: CallSession,
  rating: CallRating,
): LiveCallEval {
  return computeLiveCallEval({ ...session, rating });
}
