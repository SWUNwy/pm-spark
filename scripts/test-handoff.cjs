#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const stateEngine = path.join(__dirname, "run-state.cjs");
const exporter = path.join(__dirname, "export-handoff.cjs");
const verifier = path.join(__dirname, "verify-handoff.cjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "analyze-handoff-test-"));
const tests = [];

function invoke(script, args, expectedCode = 0) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  const raw = (result.stdout || result.stderr || "").trim();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { raw }; }
  if (result.status !== expectedCode) throw new Error(`Expected exit ${expectedCode}, got ${result.status}: ${raw}`);
  return payload;
}
function runState(args, expectedCode = 0) { return invoke(stateEngine, args, expectedCode); }
function test(name, fn) {
  try { fn(); tests.push({ name, ok: true }); }
  catch (error) { tests.push({ name, ok: false, error: error.message }); }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}
function completeSpecify(runId) {
  runState(["init", "--root", tempRoot, "--goal", `Specify ${runId}`, "--track", "specify", "--depth", "standard", "--run-id", runId]);
  const runDir = path.join(tempRoot, ".analyze", "runs", runId);
  const state = path.join(runDir, "state.json");
  const contract = writeJson(path.join(tempRoot, `${runId}-contract.json`), {
    scope: ["CRM capability"],
    non_goals: ["unrelated billing changes"],
    assumptions: ["Existing RBAC remains authoritative"],
    acceptance_evidence: ["AC-1 passes"],
    stage_contract: {
      purpose: "produce a verified CRM Spec",
      deliverable: "CRM Spec",
      completion_signals: ["all required gates pass"],
      next_stage_candidates: ["plan"]
    }
  });
  runState(["contract", "--state", state, "--input", contract]);
  runState(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "contract.json"]);
  runState(["transition", "--state", state, "--to", "scoped", "--reason", "scope frozen"]);
  runState(["transition", "--state", state, "--to", "synthesizing", "--reason", "sources available"]);
  runState(["evidence", "--state", state, "--kind", "decision", "--source", "spec.md#decision-1", "--claim", "Choose role-scoped access over record ACLs", "--confidence", "high", "--status", "supports"]);
  runState(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "evidence.jsonl#1"]);
  runState(["gate", "--state", state, "--id", "G-Spec", "--status", "pass", "--evidence", "spec-freeze.md"]);
  runState(["gate", "--state", state, "--id", "G-Section", "--status", "pass", "--evidence", "section-review.md"]);
  runState(["transition", "--state", state, "--to", "verifying", "--reason", "Spec ready"]);
  runState(["check", "--state", state, "--id", "self-review", "--status", "pass", "--evidence", "scorecard.json#self-review"]);
  runState(["gate", "--state", state, "--id", "G3", "--status", "pass", "--evidence", "scorecard.json"]);
  runState(["transition", "--state", state, "--to", "completed", "--reason", "verified"]);
  fs.mkdirSync(path.join(tempRoot, "specs"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "specs", `${runId}.md`), `# ${runId} Spec\n`, "utf8");
  fs.writeFileSync(path.join(runDir, "result.md"), "# Verified result\n", "utf8");
  const manifest = writeJson(path.join(tempRoot, `${runId}-handoff-input.json`), {
    schema_version: "1.0",
    target: { stage: "plan", recommended_skill: "plan-authoring" },
    spec_artifacts: [{ path: `specs/${runId}.md`, role: "primary_spec" }],
    execution_plan: {
      objective: `Implement ${runId}`,
      steps: [{ id: "S1", action: "Implement domain model", outputs: ["model"], depends_on: [] }],
      verification: ["Run unit tests"],
      constraints: ["No unrelated changes"]
    }
  });
  return { runDir, state, manifest, spec: path.join(tempRoot, "specs", `${runId}.md`) };
}

test("rejects handoff before Specify completion", () => {
  runState(["init", "--root", tempRoot, "--goal", "Incomplete", "--track", "specify", "--run-id", "incomplete"]);
  const input = writeJson(path.join(tempRoot, "incomplete-input.json"), {
    schema_version: "1.0",
    target: { stage: "plan", recommended_skill: "plan-authoring" },
    spec_artifacts: [{ path: "missing.md", role: "primary_spec" }],
    execution_plan: { objective: "Implement", steps: [{ id: "S1", action: "Work" }], verification: ["Test"] }
  });
  const result = invoke(exporter, ["--state", path.join(tempRoot, ".analyze", "runs", "incomplete", "state.json"), "--input", input], 1);
  if (!String(result.error).includes("completed")) throw new Error("incomplete run was not rejected at readiness boundary");
});

test("exports a bound ready packet", () => {
  const fixture = completeSpecify("ready-packet");
  const result = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  if (!result.ready || result.artifact_count !== 1 || result.decision_count !== 1) throw new Error("export summary is incomplete");
  const packet = JSON.parse(fs.readFileSync(result.packet, "utf8"));
  const expectedHash = crypto.createHash("sha256").update(fs.readFileSync(fixture.spec)).digest("hex");
  if (packet.artifacts[0].sha256 !== expectedHash) throw new Error("artifact hash was not bound");
  if (packet.authority.grants_implementation_authority !== false) throw new Error("authority boundary was not preserved");
  if ("source_action_level" in packet.authority) throw new Error("legacy action level was exported");
  if (!packet.authority.host_policy || !packet.authority.approval) throw new Error("host policy and approval instructions are missing");
  if (!fs.existsSync(result.feedback) || !fs.existsSync(result.checksum)) throw new Error("companion files were not created");
});

test("verifies an unchanged packet", () => {
  const fixture = completeSpecify("verify-packet");
  const exported = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  const verified = invoke(verifier, ["--packet", exported.packet]);
  if (!verified.ok || verified.errors.length) throw new Error("valid packet failed verification");
});

test("detects Spec drift after export", () => {
  const fixture = completeSpecify("artifact-drift");
  const exported = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  fs.appendFileSync(fixture.spec, "\nChanged after freeze.\n", "utf8");
  const verified = invoke(verifier, ["--packet", exported.packet], 1);
  if (!verified.errors.some((item) => item.includes("artifact") && item.includes("hash mismatch"))) throw new Error("artifact drift was not detected");
});

test("refuses accidental packet overwrite", () => {
  const fixture = completeSpecify("no-overwrite");
  invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  const result = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest], 1);
  if (!String(result.error).includes("already exists")) throw new Error("existing packet was overwritten without --force");
});

test("rejects legacy packets even when their checksum is recomputed", () => {
  const fixture = completeSpecify("legacy-packet");
  const exported = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  const base = JSON.parse(fs.readFileSync(exported.packet, "utf8"));
  const mutations = [
    packet => { packet.source_action_level = "L3"; },
    packet => { packet.authority.level = "L3"; },
    packet => { packet.authority.source_action_level = "L2"; },
    packet => { packet.context.assumptions.push({ source_action_level: "L3" }); },
    packet => { packet.context.decisions.push({ claim: "Action level L3 approved" }); },
    packet => { packet.evidence_ledger.events.push({ authority: { level: "L3" } }); },
    packet => { delete packet.authority.host_policy; },
    packet => { packet.authority.approval = "  "; },
    packet => { packet.context.assumptions.push({ historical_compatibility: { level: "L3" } }); }
  ];
  for (const mutate of mutations) {
    const packet = structuredClone(base);
    mutate(packet);
    writeJson(exported.packet, packet);
    fs.writeFileSync(exported.checksum, crypto.createHash("sha256").update(fs.readFileSync(exported.packet)).digest("hex"));
    if (invoke(verifier, ["--packet", exported.packet], 1).ok) throw new Error("legacy packet passed");
  }
});

test("migrates source state before re-export while isolating legacy context and preserving evidence", () => {
  const fixture = completeSpecify("legacy-source");
  const original = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest]);
  const originalChecksum = fs.readFileSync(original.checksum, "utf8");
  const state = JSON.parse(fs.readFileSync(fixture.state, "utf8"));
  state.source_action_level = "L3";
  state.authority = { level: "L3", source_action_level: "L2" };
  state.assumptions.push("Action level L3 permits implementation", { authority: { level: "L3" } });
  state.history.push({ type: "action_level_changed", from: "L1", to: "L3" });
  const ledger = path.join(fixture.runDir, "evidence.jsonl");
  fs.appendFileSync(ledger, JSON.stringify({ kind: "decision", claim: "L3 grants implementation", source: "old", authority: { level: "L3" } }) + "\n");
  state.evidence_count += 1;
  const key = crypto.createHash("sha256").update(`analyze-state-key:${state.run_id}`).digest("hex");
  state._state_signature = crypto.createHmac("sha256", key).update(JSON.stringify(state, Object.keys(state).sort().filter(key => key !== "_state_signature"))).digest("hex");
  writeJson(fixture.state, state);
  const ledgerBytes = fs.readFileSync(ledger, "utf8");
  invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest, "--force"], 1);
  runState(["migrate", "--state", fixture.state]);
  const migrated = JSON.parse(fs.readFileSync(fixture.state, "utf8"));
  if (!migrated.historical_compatibility.records.length || !migrated.historical_compatibility.evidence.length) throw new Error("historical data was lost");
  if (migrated.history.at(-2).type !== "action_level_changed") throw new Error("audit history was lost");
  if (fs.readFileSync(ledger, "utf8") !== ledgerBytes) throw new Error("evidence ledger was rewritten");
  if (/\bL[0-3]\b|source_action_level/.test(fs.readFileSync(path.join(fixture.runDir, "checkpoint.md"), "utf8"))) throw new Error("legacy checkpoint leaked");
  if (runState(["migrate", "--state", fixture.state]).changed) throw new Error("migration is not idempotent");
  const exported = invoke(exporter, ["--state", fixture.state, "--input", fixture.manifest, "--force"]);
  const packet = JSON.parse(fs.readFileSync(exported.packet, "utf8"));
  if (/\bL[0-3]\b|source_action_level|historical_compatibility/.test(JSON.stringify(packet.context))) throw new Error("legacy context leaked");
  if (!packet.evidence_ledger.events.at(-1).historical_compatibility) throw new Error("historical evidence not isolated");
  if (fs.readFileSync(exported.checksum, "utf8") === originalChecksum) throw new Error("checksum was not renewed");
  if (!invoke(verifier, ["--packet", exported.packet]).ok) throw new Error("migrated packet failed");
});

const failed = tests.filter((item) => !item.ok);
const output = { ok: failed.length === 0, test_count: tests.length, passed: tests.length - failed.length, failed: failed.length, tests };
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 1);
