import type { Handler, HandlerEvent } from "@netlify/functions";
import { buildAssistantOverrides, composeSystemPrompt } from "../../artifacts/tiger-prototype/src/data/vapi-prompt";
import type { StageId } from "../../artifacts/tiger-prototype/src/data/model";

const PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY ?? "1ca3efaa-6fa4-4eb6-b90b-149a452146be";
const PUBLIC_KEY = process.env.VITE_VAPI_PUBLIC_KEY ?? "7eb1f78f-53d5-4a6d-8efe-af3e9a045157";
const ASSISTANT_ID = process.env.VITE_VAPI_ASSISTANT_ID ?? "c341c52c-69bb-4a37-a6f8-b31d1910273f";

const VALID_STAGES: StageId[] = [
  "APPROVED",
  "EKYC_PENDING",
  "EKYC_COMPLETE",
  "VKYC_PENDING",
  "VKYC_COMPLETE",
  "ACTIVATION_PENDING",
  "ACTIVE",
  "ESCALATED",
];

async function patchAssistant(stage: StageId, objection: string | null, failureMode: boolean) {
  const overrides = buildAssistantOverrides(stage, objection, failureMode);
  const prompt = composeSystemPrompt(stage, objection, failureMode);

  const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Aria - Tiger Credit Card Onboarding",
      firstMessage: overrides.firstMessage,
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.4,
        messages: [{ role: "system", content: prompt }],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("VAPI PATCH assistant failed:", res.status, text);
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const params = event.queryStringParameters ?? {};
  const stage = (params.stage ?? "APPROVED") as StageId;
  const objection = params.objection?.trim() || null;
  const failureMode = params.failureMode === "true";

  if (!VALID_STAGES.includes(stage)) {
    return json(400, { error: `Invalid stage: ${stage}` });
  }

  try {
    await patchAssistant(stage, objection, failureMode);
    const assistantOverrides = buildAssistantOverrides(stage, objection, failureMode);

    return json(200, {
      publicKey: PUBLIC_KEY,
      assistantId: ASSISTANT_ID,
      assistantOverrides,
      stage,
      objection,
      failureMode,
    });
  } catch (err) {
    console.error(err);
    return json(500, {
      error: "Failed to prepare VAPI session",
      publicKey: PUBLIC_KEY,
      assistantId: ASSISTANT_ID,
      assistantOverrides: buildAssistantOverrides(stage, objection, failureMode),
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
