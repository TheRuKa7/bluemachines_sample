/** Simulates netlify vapi-session PATCH + response shape */
import { buildAssistantOverrides, composeSystemPrompt } from "../src/data/vapi-prompt.ts";

const PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY ?? "1ca3efaa-6fa4-4eb6-b90b-149a452146be";
const ASSISTANT_ID = "c341c52c-69bb-4a37-a6f8-b31d1910273f";

const cases = [
  { stage: "APPROVED", objection: null, failureMode: false },
  { stage: "EKYC_PENDING", objection: "joining_fee", failureMode: false },
  { stage: "VKYC_PENDING", objection: null, failureMode: true },
];

for (const c of cases) {
  const overrides = buildAssistantOverrides(c.stage, c.objection, c.failureMode);
  const prompt = composeSystemPrompt(c.stage, c.objection, c.failureMode);
  const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstMessage: overrides.firstMessage,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }],
      },
    }),
  });
  console.log(
    JSON.stringify({
      case: c,
      patchStatus: res.status,
      promptLen: prompt.length,
      firstMessagePreview: overrides.firstMessage.slice(0, 80),
    }),
  );
}
