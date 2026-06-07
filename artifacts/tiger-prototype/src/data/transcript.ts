import { STAGES, OBJECTIONS, SYSTEMS, type StageId, type StageData, type ObjectionData, type SystemId } from "./model";

export type TurnRole = "agent" | "customer" | "system";

export interface TranscriptTurn {
  role: TurnRole;
  text: string;
  systemTag?: string;
}

const systemShortLabels: Record<string, string> = {};
SYSTEMS.forEach((s) => { systemShortLabels[s.id] = s.shortLabel.toUpperCase(); });

function systemTag(systemId: SystemId, opType: string): string {
  return `${systemShortLabels[systemId] ?? systemId.toUpperCase()} ${opType}`;
}

const CUSTOMER_NAME = "Priya";

function openingTurns(stage: StageData): TranscriptTurn[] {
  const readConns = stage.connections.filter((c) => c.type === "READ");
  const readSummary = readConns.map((c) => c.label).join(" · ");
  const primarySource = readConns[0]?.from ?? "crm";

  return [
    {
      role: "system",
      text: `Call initiated · Stage: ${stage.label} · Loading: ${readSummary}`,
      systemTag: systemTag(primarySource, "READ"),
    },
    {
      role: "agent",
      text: `Hello, am I speaking with ${CUSTOMER_NAME}? This is Aria, Tiger Credit Card onboarding assistant. Is this a good time to talk?`,
    },
    {
      role: "customer",
      text: `Yes, this is ${CUSTOMER_NAME}. Go ahead.`,
    },
  ];
}

function goalTurns(stage: StageData, failureMode: boolean): TranscriptTurn[] {
  if (failureMode) {
    const affectedNames = stage.failureMode.affectedSystems
      .map((s) => systemShortLabels[s] ?? s)
      .join(", ");
    return [
      {
        role: "system",
        text: `SYSTEM ALERT: ${affectedNames || "core systems"} unavailable · switching to fallback`,
        systemTag: "FAILURE",
      },
      {
        role: "agent",
        text: stage.failureMode.agentBehavior,
      },
      {
        role: "customer",
        text: `Okay, I understand. What happens next?`,
      },
      {
        role: "agent",
        text: stage.failureMode.fallbackAction,
      },
      {
        role: "system",
        text: `Fallback action logged · retry task created`,
        systemTag: systemTag("crm", "WRITE"),
      },
    ];
  }

  return [
    {
      role: "agent",
      text: `I'm calling because: ${stage.agentGoal}`,
    },
    {
      role: "customer",
      text: stageCustomerReaction(stage.id),
    },
  ];
}

function nextBestActionTurns(stage: StageData, failureMode: boolean): TranscriptTurn[] {
  if (failureMode) return [];
  return [
    {
      role: "agent",
      text: stage.nextBestAction,
    },
    {
      role: "customer",
      text: stageCustomerAcknowledgement(stage.id),
    },
  ];
}

function systemWriteEvents(stage: StageData): TranscriptTurn[] {
  return stage.connections
    .filter((c) => c.type === "WRITE" || c.type === "NOTIFY" || c.type === "ESCALATE")
    .map((c) => ({
      role: "system" as TurnRole,
      text: c.label,
      systemTag: systemTag(c.to, c.type),
    }));
}

function objectionTurns(objection: ObjectionData): TranscriptTurn[] {
  const dataReadSummary = objection.dataNeeded.map((d) => d.field).join(" · ");
  const primaryDataSource = objection.dataNeeded[0]?.system ?? "card_core";

  return [
    {
      role: "customer",
      text: `Actually, I have a concern — ${objection.label.toLowerCase()}. Can you clarify?`,
    },
    {
      role: "system",
      text: `Loading: ${dataReadSummary} · ${objection.systemBehavior}`,
      systemTag: systemTag(primaryDataSource, "READ"),
    },
    {
      role: "agent",
      text: objection.agentLogic,
    },
    {
      role: "customer",
      text: `That makes sense. Thank you for explaining.`,
    },
  ];
}

function closingTurns(stage: StageData, failureMode: boolean): TranscriptTurn[] {
  if (failureMode) return [];
  return [
    {
      role: "system",
      text: `Compliance audit log written · call outcome recorded`,
      systemTag: systemTag("compliance", "WRITE"),
    },
    {
      role: "system",
      text: `Stage metrics logged · transition event: ${stage.transitionEvent}`,
      systemTag: systemTag("analytics", "WRITE"),
    },
    {
      role: "agent",
      text: `Is there anything else I can help you with today, ${CUSTOMER_NAME}?`,
    },
    {
      role: "customer",
      text: `No, that's all. Thanks.`,
    },
  ];
}

function stageCustomerReaction(stageId: StageId): string {
  const reactions: Record<StageId, string> = {
    APPROVED: `Oh, I wasn't expecting a call. What do I need to do?`,
    EKYC_PENDING: `Yes, I started it but ran into some trouble completing it.`,
    EKYC_COMPLETE: `That went smoothly! What's the next step?`,
    VKYC_PENDING: `Sorry, I missed my appointment. Can I reschedule?`,
    VKYC_COMPLETE: `Great, I completed the video call. What now?`,
    ACTIVATION_PENDING: `I tried to activate it but couldn't figure out how.`,
    ACTIVE: `Yes, the card is working. I already made a purchase.`,
    ESCALATED: `I've called multiple times and nothing has been resolved yet.`,
  };
  return reactions[stageId] ?? `I see. What do I need to do?`;
}

function stageCustomerAcknowledgement(stageId: StageId): string {
  const acks: Record<StageId, string> = {
    APPROVED: `Sure, that sounds straightforward. Go ahead.`,
    EKYC_PENDING: `Okay, I'll try that. Can you send the link again?`,
    EKYC_COMPLETE: `That works. 6 PM sounds fine.`,
    VKYC_PENDING: `7 PM works better for me. Let's do that.`,
    VKYC_COMPLETE: `I'll install the app now. Thanks for the link.`,
    ACTIVATION_PENDING: `I can see it now. Tapping... okay, it's asking for a PIN.`,
    ACTIVE: `I noticed the Prime benefit too — that's a nice addition.`,
    ESCALATED: `Okay, I'll wait for the specialist. Please make sure they have everything.`,
  };
  return acks[stageId] ?? `Understood. I'll do that.`;
}

export function generateTranscript(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean
): TranscriptTurn[] {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const objection = objectionId
    ? OBJECTIONS.find((o) => o.id === objectionId) ?? null
    : null;

  const turns: TranscriptTurn[] = [
    ...openingTurns(stage),
    ...goalTurns(stage, failureMode),
  ];

  if (objection && !failureMode) {
    turns.push(...objectionTurns(objection));
  }

  turns.push(...nextBestActionTurns(stage, failureMode));
  turns.push(...systemWriteEvents(stage));
  turns.push(...closingTurns(stage, failureMode));

  return turns;
}
