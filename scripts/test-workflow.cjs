#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const engine = path.join(__dirname, "workflow-state.cjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "analyze-workflow-test-"));
const tests = [];

function sha(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function shaFile(file) { return sha(fs.readFileSync(file)); }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, "utf8"); return file; }
function writeJson(file, value) { return write(file, `${JSON.stringify(value, null, 2)}\n`); }
function snap(file, root) { return { path: path.relative(root, file), sha256: shaFile(file), size_bytes: fs.statSync(file).size }; }
function invoke(args, expectedCode = 0) {
  const result = spawnSync(process.execPath, [engine, ...args], { encoding: "utf8" });
  const raw = (result.stdout || result.stderr || "").trim();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { raw }; }
  if (result.status !== expectedCode) throw new Error(`Expected exit ${expectedCode}, got ${result.status}: ${raw}`);
  return payload;
}
function test(name, fn) { try { fn(); tests.push({ name, ok: true }); } catch (error) { tests.push({ name, ok: false, error: error.message }); } }
function makeFixture(id) {
  const root = path.join(tempRoot, id);
  const runDir = path.join(root, ".analyze", "runs", id);
  fs.mkdirSync(runDir, { recursive: true });
  const sourceState = writeJson(path.join(runDir, "state.json"), { schema_version: "2.1", run_id: id, track: "specify", status: "completed" });
  const checkpoint = write(path.join(runDir, "checkpoint.md"), "# Final checkpoint\n");
  const result = write(path.join(runDir, "result.md"), "# Verified result\n");
  const evidence = write(path.join(runDir, "evidence.jsonl"), `${JSON.stringify({ timestamp: "2026-07-20T00:00:00.000Z", kind: "decision", source: "spec.md#D1", claim: "Use scoped roles", confidence: "high", status: "supports" })}\n`);
  const spec = write(path.join(root, "specs", `${id}.md`), `# ${id} Spec\n\n## Acceptance\n\n- AC-1\n`);
  const feedback = write(path.join(runDir, "execution-feedback.jsonl"), "");
  const packetFile = path.join(runDir, "handoff-packet.json");
  const packet = {
    schema_version: "analyze-handoff/1.0",
    packet_id: `${id}-handoff`,
    exported_at: "2026-07-20T00:00:00.000Z",
    source: {
      run_id: id, track: "specify", status: "completed", goal: `Implement ${id}`,
      project_root: root,
      state: snap(sourceState, root), checkpoint: snap(checkpoint, root), result: snap(result, root)
    },
    readiness: {
      status: "ready",
      gates_passed: ["G1", "G2", "G3", "G-Spec"].map((gate) => ({ id: gate, status: "pass", evidence: "test", evaluated_at: "2026-07-20T00:00:00.000Z" })),
      self_review: { id: "self-review", status: "pass", evidence: "scorecard" }, constitution: null
    },
    artifacts: [{ ...snap(spec, root), role: "primary_spec" }],
    context: { scope: ["CRM"], non_goals: ["billing"], assumptions: ["RBAC exists"], acceptance_evidence: ["AC-1"], decisions: [{ line: 1, kind: "decision", claim: "Use scoped roles" }] },
    evidence_ledger: { path: path.relative(root, evidence), sha256: shaFile(evidence), event_count: 1, events: [{ line: 1, kind: "decision", claim: "Use scoped roles" }] },
    execution: { target_stage: "plan", recommended_skill: "plan-authoring", objective: `Implement ${id}`, steps: [{ id: "S1", action: "Implement" }], verification: ["Run tests"], constraints: [] },
    authority: { host_policy: "Host policy applies", approval: "Use existing user authorization and obtain additional approval when required by the host", grants_implementation_authority: false, grants_external_action_authority: false, rule: "Host policy applies" },
    feedback: { path: path.relative(root, feedback), format: "jsonl", append_only: true, required_fields: ["timestamp", "kind", "step_id", "claim", "evidence", "impact", "recommended_route"] }
  };
  const serialized = `${JSON.stringify(packet, null, 2)}\n`;
  write(packetFile, serialized);
  write(path.join(runDir, "handoff-packet.sha256"), `${sha(Buffer.from(serialized))}  handoff-packet.json\n`);
  const plan = write(path.join(root, ".analyze", "plans", `${id}.md`), `# ${id} Implementation Plan\n\n**Goal:** Build the verified capability\n\n**Architecture:** Follow the verified Spec with one bounded component.\n\n**Tech Stack:** Node.js\n\n## Global Constraints\n\n- Preserve RBAC.\n\n### Task 1: Domain model\n\n- [ ] **Step 1: Write the failing test**\n\nRun: node test.js\nExpected: FAIL\n`);
  return { root, runDir, packetFile, plan, feedback };
}
function initFixture(id) {
  const f = makeFixture(id);
  const initialized = invoke(["init", "--packet", f.packetFile]);
  return { ...f, state: initialized.state };
}
function planThroughApproval(f) {
  invoke(["start", "--state", f.state, "--stage", "plan"]);
  invoke(["complete", "--state", f.state, "--stage", "plan", "--artifact", f.plan]);
  invoke(["approve", "--state", f.state, "--stage", "execute", "--by", "user", "--evidence", "user said start implementation"]);
}
function executeReadyForVerify(f) {
  planThroughApproval(f);
  invoke(["start", "--state", f.state, "--stage", "execute"]);
  const execution = writeJson(path.join(f.root, "execution-result.json"), {
    schema_version: "analyze-execution-result/1.0", status: "ready_for_verification",
    plan_sha256: shaFile(f.plan),
    changes: [{ path: "src/model.js", summary: "Implemented domain model" }],
    checks: [{ command: "node test.js", exit_code: 0, evidence: "1 test passed" }],
    unresolved_blockers: []
  });
  invoke(["complete", "--state", f.state, "--stage", "execute", "--artifact", execution]);
  return execution;
}

test("initializes from a verified packet and routes to plan-authoring", () => {
  const f = initFixture("route-plan");
  const routed = invoke(["route", "--state", f.state]);
  if (routed.route.skill !== "plan-authoring" || routed.route.stage !== "plan") throw new Error("wrong first route");
  if (!fs.existsSync(routed.route.request)) throw new Error("stage request was not created");
});

test("requires explicit human approval before execution", () => {
  const f = initFixture("approval-gate");
  invoke(["start", "--state", f.state, "--stage", "plan"]);
  const completed = invoke(["complete", "--state", f.state, "--stage", "plan", "--artifact", f.plan]);
  if (completed.status !== "awaiting_execution_approval") throw new Error("plan did not stop at approval");
  const result = invoke(["start", "--state", f.state, "--stage", "execute"], 1);
  if (!String(result.error).includes("not ready")) throw new Error("execution was not blocked before approval");
});

test("completes the full plan-execute-verify chain", () => {
  const f = initFixture("full-chain");
  const execution = executeReadyForVerify(f);
  const started = invoke(["start", "--state", f.state, "--stage", "verify"]);
  if (started.status !== "verifying") throw new Error("verification did not start");
  const state = JSON.parse(fs.readFileSync(f.state, "utf8"));
  const verification = writeJson(path.join(f.root, "verification-result.json"), {
    schema_version: "analyze-verification-result/1.0", status: "pass",
    packet_sha256: state.packet.sha256, plan_sha256: shaFile(f.plan), execution_result_sha256: shaFile(execution),
    checks: [{ name: "unit tests", command: "node test.js", exit_code: 0, passed: true, evidence: "1 test passed" }],
    acceptance: [{ criterion: "AC-1", passed: true, evidence: "test.js" }], unresolved_blockers: []
  });
  const completed = invoke(["complete", "--state", f.state, "--stage", "verify", "--artifact", verification]);
  if (completed.status !== "completed") throw new Error("workflow did not complete");
  const validated = invoke(["validate", "--state", f.state]);
  if (!validated.ok || validated.status !== "completed") throw new Error("completed workflow failed validation");
});

test("detects plan drift before execution", () => {
  const f = initFixture("plan-drift");
  planThroughApproval(f);
  fs.appendFileSync(f.plan, "\nChanged after approval.\n", "utf8");
  const result = invoke(["start", "--state", f.state, "--stage", "execute"], 1);
  if (!String(result.error).includes("plan hash mismatch")) throw new Error("plan drift was not detected");
});

test("failed verification cannot complete", () => {
  const f = initFixture("verify-fail");
  const execution = executeReadyForVerify(f);
  invoke(["start", "--state", f.state, "--stage", "verify"]);
  const state = JSON.parse(fs.readFileSync(f.state, "utf8"));
  const verification = writeJson(path.join(f.root, "verification-failed.json"), {
    schema_version: "analyze-verification-result/1.0", status: "fail",
    packet_sha256: state.packet.sha256, plan_sha256: shaFile(f.plan), execution_result_sha256: shaFile(execution),
    checks: [{ name: "tests", command: "node test.js", exit_code: 1, passed: false, evidence: "failure" }],
    acceptance: [{ criterion: "AC-1", passed: false, evidence: "test failed" }], unresolved_blockers: ["test failure"]
  });
  const result = invoke(["complete", "--state", f.state, "--stage", "verify", "--artifact", verification], 1);
  if (!String(result.error).includes("did not pass")) throw new Error("failed verification was accepted");
  const current = JSON.parse(fs.readFileSync(f.state, "utf8"));
  if (current.status !== "verifying") throw new Error("state falsely advanced after failed verification");
});

test("invalidating execution feedback blocks and returns to Analyze", () => {
  const f = initFixture("feedback-block");
  planThroughApproval(f);
  invoke(["start", "--state", f.state, "--stage", "execute"]);
  const feedback = writeJson(path.join(f.root, "feedback.json"), {
    timestamp: "2026-07-20T01:00:00.000Z", kind: "assumption_invalidated", step_id: "S1",
    claim: "RBAC cannot express the required scope", evidence: "src/rbac.js:42",
    impact: "Decision D1 is invalid", recommended_route: "return_to_analyze"
  });
  const result = invoke(["feedback", "--state", f.state, "--input", feedback]);
  if (!result.blocks || result.status !== "blocked" || result.next_route.skill !== "analyze") throw new Error("invalidating feedback did not block and route back");
  if (!fs.readFileSync(f.feedback, "utf8").includes("assumption_invalidated")) throw new Error("feedback was not appended");
});

test("detects packet drift before routing", () => {
  const f = initFixture("packet-drift");
  fs.appendFileSync(f.packetFile, "\n", "utf8");
  const result = invoke(["route", "--state", f.state], 1);
  if (!String(result.error).includes("hash mismatch")) throw new Error("packet drift was not detected");
});

const failed = tests.filter((item) => !item.ok);
const output = { ok: failed.length === 0, test_count: tests.length, passed: tests.length - failed.length, failed: failed.length, tests };
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 1);
