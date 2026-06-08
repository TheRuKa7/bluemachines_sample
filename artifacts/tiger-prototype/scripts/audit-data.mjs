import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/data");
const model = readFileSync(join(dir, "model.ts"), "utf8");
const transcript = readFileSync(join(dir, "transcript.ts"), "utf8");
const vapiPrompt = readFileSync(join(dir, "vapi-prompt.ts"), "utf8");

const stageBlock = model.split("export const STAGES")[1].split("export const OBJECTIONS")[0];
const stages = [...stageBlock.matchAll(/id: "([A-Z_]+)"/g)].map((m) => m[1]);
const systems = [...model.split("export const SYSTEMS")[1].split("export const STAGES")[0].matchAll(/id: "([a-z_]+)"/g)].map((m) => m[1]);
const objections = [...model.split("export const OBJECTIONS")[1].split("export const STAGE_ORDER")[0].matchAll(/id: "([a-z_]+)"/g)].map((m) => m[1]);

const stageTx = new Set([...transcript.split("STAGE_TRANSCRIPTS")[1].split("OBJECTION_TRANSCRIPTS")[0].matchAll(/^\s+([A-Z_]+):/gm)].map((m) => m[1]));
const objTx = new Set([...transcript.split("OBJECTION_TRANSCRIPTS")[1].split("FAILURE_TRANSCRIPTS")[0].matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1]));
const failureTx = new Set([...transcript.split("FAILURE_TRANSCRIPTS")[1].split("generateTranscript")[0].matchAll(/^\s+([A-Z_]+):/gm)].map((m) => m[1]));

const stagePrompts = [...vapiPrompt.matchAll(/^\s+([A-Z_]+): `/gm)].map((m) => m[1]);

console.log(JSON.stringify({
  counts: { stages: stages.length, systems: systems.length, objections: objections.length },
  stages,
  systems,
  objections,
  parity: {
    missingStageTranscripts: stages.filter((s) => !stageTx.has(s)),
    missingObjectionTranscripts: objections.filter((o) => !objTx.has(o)),
    missingFailureTranscripts: stages.filter((s) => !failureTx.has(s)),
    missingStagePrompts: stages.filter((s) => !stagePrompts.includes(s)),
  },
}, null, 2));
