#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const engine = path.join(__dirname, "run-state.cjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "analyze-test-"));
const tests = [];

function run(args, expectedCode = 0) {
  const result = spawnSync(process.execPath, [engine, ...args], { encoding: "utf8" });
  let payload = null;
  const raw = result.stdout && result.stdout.trim() ? result.stdout : result.stderr;
  try { payload = JSON.parse(raw); } catch { payload = { raw }; }
  if (result.status !== expectedCode) {
    throw new Error(`Expected exit ${expectedCode}, got ${result.status}: ${raw}`);
  }
  return payload;
}

function test(name, fn) {
  try {
    fn();
    tests.push({ name, ok: true });
  } catch (error) {
    tests.push({ name, ok: false, error: error.message });
  }
}

function statePath(runId) {
  return path.join(tempRoot, ".analyze", "runs", runId, "state.json");
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

function applyContract(state, slug, extra = {}) {
  const contract = writeJson(path.join(tempRoot, `${slug}-contract.json`), {
    scope: ["current task"],
    non_goals: ["unrelated work"],
    acceptance_evidence: ["gate evidence"],
    stage_contract: {
      purpose: "complete the selected track for this task",
      deliverable: "verified result",
      completion_signals: ["required gates pass"],
      next_stage_candidates: ["complete", "handoff"]
    },
    ...extra
  });
  run(["contract", "--state", state, "--input", contract]);
  return contract;
}

test("initializes a valid run", () => {
  run(["init", "--root", tempRoot, "--goal", "Evaluate CRM requirement", "--track", "analyze", "--run-id", "init-valid"]);
  const result = run(["validate", "--state", statePath("init-valid")]);
  if (!result.ok || result.status !== "intake") throw new Error("initialized state did not validate");
});

test("rejects legacy authority fields in contracts", () => {
  run(["init", "--root", tempRoot, "--goal", "Contract compatibility", "--run-id", "legacy-contract"]);
  const file = statePath("legacy-contract");
  const before = fs.readFileSync(file, "utf8");
  for (const contract of [{ action_level: "L3" }, { authority: { level: "L3" } }, { authority: { source_action_level: "L2" } }]) {
    const input = writeJson(path.join(tempRoot, "legacy-contract.json"), contract);
    const result = run(["contract", "--state", file, "--input", input], 1);
    if (!String(result.error).includes("unsupported")) throw new Error("legacy contract was accepted");
    if (fs.readFileSync(file, "utf8") !== before) throw new Error("rejected contract changed state");
  }
});

test("rejects illegal direct completion", () => {
  run(["init", "--root", tempRoot, "--goal", "Illegal transition test", "--run-id", "illegal-complete"]);
  const result = run(["transition", "--state", statePath("illegal-complete"), "--to", "completed", "--reason", "skip"], 1);
  if (result.error !== "Illegal state transition") throw new Error("wrong error for illegal completion");
});

test("executes the happy-path closed loop", () => {
  run(["init", "--root", tempRoot, "--goal", "Happy path", "--run-id", "happy-path"]);
  const state = statePath("happy-path");
  applyContract(state, "happy-path");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "checkpoint.md#goal"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "goal fixed"]);
  run(["transition", "--state", state, "--to", "discovering", "--reason", "questions prioritized"]);
  run(["evidence", "--state", state, "--kind", "user_fact", "--source", "user-request", "--claim", "User needs a recoverable loop", "--confidence", "high", "--status", "supports"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "evidence sufficient"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "evidence.jsonl#1"]);
  run(["gate", "--state", state, "--id", "G-Adversarial", "--status", "pass", "--evidence", "review-log.md#clear"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "draft ready"]);
  run(["check", "--state", state, "--id", "semantic-rubric", "--status", "pass", "--evidence", "scorecard.json"]);
  run(["check", "--state", state, "--id", "self-review", "--status", "pass", "--evidence", "scorecard.json#self-review"]);
  run(["gate", "--state", state, "--id", "G3", "--status", "pass", "--evidence", "scorecard.json"]);
  run(["transition", "--state", state, "--to", "completed", "--reason", "all gates pass"]);
  const result = run(["validate", "--state", state]);
  if (!result.ok || result.status !== "completed") throw new Error("happy path did not complete");
});

test("enforces the repair budget", () => {
  run(["init", "--root", tempRoot, "--goal", "Repair budget", "--max-iterations", "1", "--run-id", "repair-budget"]);
  const state = statePath("repair-budget");
  applyContract(state, "repair-budget");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "checkpoint.md#goal"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "scoped"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "local facts sufficient"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "evidence.jsonl"]);
  run(["gate", "--state", state, "--id", "G-Adversarial", "--status", "pass", "--evidence", "review-log.md#clear"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "draft"]);
  run(["transition", "--state", state, "--to", "repairing", "--reason", "failed coverage"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "coverage repaired"]);
  const result = run(["transition", "--state", state, "--to", "repairing", "--reason", "failed again"], 1);
  if (result.error !== "Repair budget exhausted") throw new Error("repair budget was not enforced");
});

test("requires evidence to pass a gate", () => {
  run(["init", "--root", tempRoot, "--goal", "Gate evidence", "--run-id", "gate-evidence"]);
  const result = run(["gate", "--state", statePath("gate-evidence"), "--id", "G1", "--status", "pass"], 1);
  if (!String(result.error).includes("evidence")) throw new Error("gate passed without evidence");
});

test("records a recoverable stop", () => {
  run(["init", "--root", tempRoot, "--goal", "Stop state", "--run-id", "stop-state"]);
  const state = statePath("stop-state");
  run(["transition", "--state", state, "--to", "stopped", "--reason", "user cancelled", "--next-action", "start a new run if needed"]);
  const result = run(["validate", "--state", state]);
  if (!result.ok || result.status !== "stopped") throw new Error("stopped state did not validate");
});

test("detects and enforces a project constitution", () => {
  const root = path.join(tempRoot, "constitution-project");
  const constitution = path.join(root, ".claude", "constitution.md");
  fs.mkdirSync(path.dirname(constitution), { recursive: true });
  fs.writeFileSync(constitution, "# Constitution\n\n- Execution disabled\n- Require maturity gate\n", "utf8");
  run(["init", "--root", root, "--goal", "Constitution run", "--run-id", "constitution-run"]);
  const state = path.join(root, ".analyze", "runs", "constitution-run", "state.json");
  applyContract(state, "constitution-run");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "checkpoint.md#goal"]);
  const blocked = run(["transition", "--state", state, "--to", "scoped", "--reason", "goal ready"], 1);
  if (!String(blocked.error).includes("constitution")) throw new Error("constitution did not block scope");
  const assessment = writeJson(path.join(root, "assessment.json"), {
    mode_overrides: { execution_disabled: true },
    output_paths: { spec: "specs/" },
    additional_gates: [{ id: "G-Maturity", description: "Requirement maturity", required_before: "scope" }],
    post_spec_flow: "handoff"
  });
  run(["constitution", "--state", state, "--input", assessment, "--evidence", ".claude/constitution.md"]);
  const gated = run(["transition", "--state", state, "--to", "scoped", "--reason", "goal ready"], 1);
  if (gated.gate !== "G-Maturity") throw new Error("custom constitution gate did not block scope");
  run(["gate", "--state", state, "--id", "G-Maturity", "--status", "pass", "--evidence", "assessment.json"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "constitution applied"]);
});

test("detects constitution drift", () => {
  const root = path.join(tempRoot, "constitution-drift-project");
  const constitution = path.join(root, "constitution.md");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(constitution, "# Constitution v1\n", "utf8");
  run(["init", "--root", root, "--goal", "Drift run", "--run-id", "drift-run"]);
  fs.writeFileSync(constitution, "# Constitution v2\n", "utf8");
  const result = run(["validate", "--state", path.join(root, ".analyze", "runs", "drift-run", "state.json")], 1);
  if (!result.errors.some((item) => item.includes("constitution changed"))) throw new Error("constitution drift was not detected");
});

test("enforces decomposition before scope", () => {
  run(["init", "--root", tempRoot, "--goal", "Multi-system platform", "--run-id", "decompose-run"]);
  const state = statePath("decompose-run");
  applyContract(state, "decompose", { decomposition_required: true });
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "contract.json"]);
  const result = run(["transition", "--state", state, "--to", "scoped", "--reason", "scope selected"], 1);
  if (result.gate !== "G-Decompose") throw new Error("decomposition gate did not block scope");
  run(["gate", "--state", state, "--id", "G-Decompose", "--status", "pass", "--evidence", "decomposition-map.md"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "vertical slice selected"]);
});

test("enforces Explore convergence before verification", () => {
  run(["init", "--root", tempRoot, "--goal", "Explore CRM directions", "--track", "explore", "--run-id", "explore-run"]);
  const state = statePath("explore-run");
  applyContract(state, "explore-run");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "goal.md"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "exploration boundary set"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "branches visible"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "idea-map.md"]);
  const result = run(["transition", "--state", state, "--to", "verifying", "--reason", "direction brief ready"], 1);
  if (result.gate !== "G-Explore") throw new Error("Explore convergence gate did not block verification");
  run(["gate", "--state", state, "--id", "G-Explore", "--status", "pass", "--evidence", "direction-brief.md"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "convergence criteria met"]);
});

test("enforces Architecture Cleanliness for solution analysis", () => {
  run(["init", "--root", tempRoot, "--goal", "Compare solution designs", "--run-id", "architecture-run"]);
  const state = statePath("architecture-run");
  applyContract(state, "architecture", { analysis_type: "solution" });
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "goal.md"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "solution scope set"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "options compared"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "comparison.md"]);
  const result = run(["transition", "--state", state, "--to", "verifying", "--reason", "recommendation drafted"], 1);
  if (result.gate !== "G-Architecture") throw new Error("Architecture gate did not block verification");
  run(["gate", "--state", state, "--id", "G-Architecture", "--status", "pass", "--evidence", "architecture-cleanliness.md"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "architecture checks pass"]);
});

test("enforces section review for Standard Specify", () => {
  run(["init", "--root", tempRoot, "--goal", "Specify CRM workflow", "--track", "specify", "--depth", "standard", "--run-id", "section-run"]);
  const state = statePath("section-run");
  applyContract(state, "section-run");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "goal.md"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "spec scope set"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "spec drafted"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "spec-evidence.md"]);
  run(["gate", "--state", state, "--id", "G-Spec", "--status", "pass", "--evidence", "freeze.md"]);
  const result = run(["transition", "--state", state, "--to", "verifying", "--reason", "spec draft ready"], 1);
  if (result.gate !== "G-Section") throw new Error("Section review gate did not block verification");
  run(["gate", "--state", state, "--id", "G-Section", "--status", "pass", "--evidence", "section-review.md"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "section review complete"]);
});

test("rejects scope without a Track stage contract", () => {
  run(["init", "--root", tempRoot, "--goal", "Missing stage contract", "--run-id", "missing-stage-contract"]);
  const state = statePath("missing-stage-contract");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "goal.md"]);
  const result = run(["transition", "--state", state, "--to", "scoped", "--reason", "try scope"], 1);
  if (result.error !== "Track stage contract is incomplete") throw new Error("missing stage contract did not block scope");
});

test("rejects completion without a self-review check", () => {
  run(["init", "--root", tempRoot, "--goal", "Self-review enforcement", "--run-id", "self-review-run"]);
  const state = statePath("self-review-run");
  applyContract(state, "self-review-run");
  run(["gate", "--state", state, "--id", "G1", "--status", "pass", "--evidence", "goal.md"]);
  run(["transition", "--state", state, "--to", "scoped", "--reason", "scope ready"]);
  run(["transition", "--state", state, "--to", "synthesizing", "--reason", "evidence available"]);
  run(["gate", "--state", state, "--id", "G2", "--status", "pass", "--evidence", "evidence.jsonl"]);
  run(["transition", "--state", state, "--to", "verifying", "--reason", "draft ready"]);
  run(["gate", "--state", state, "--id", "G3", "--status", "pass", "--evidence", "scorecard.json"]);
  const result = run(["transition", "--state", state, "--to", "completed", "--reason", "attempt without self-review"], 1);
  if (result.error !== "Self-review check not satisfied") throw new Error("missing self-review did not block completion");
});

function signTestState(state) {
  const copy = { ...state };
  delete copy._state_signature;
  const key = require("crypto").createHash("sha256").update(`analyze-state-key:${state.run_id}`).digest("hex");
  const payload = JSON.stringify(copy, Object.keys(copy).sort().filter((key) => key !== "_state_signature"));
  state._state_signature = require("crypto").createHmac("sha256", key).update(payload).digest("hex");
}

test("initializes with the built-in adversarial gate", () => {
  run(["init", "--root", tempRoot, "--goal", "Adversarial gate", "--run-id", "adversarial-init"]);
  const state = JSON.parse(fs.readFileSync(statePath("adversarial-init"), "utf8"));
  if (!state.gates["G-Adversarial"] || state.gates["G-Adversarial"].status !== "pending") throw new Error("G-Adversarial was not initialized");
  const result = run(["validate", "--state", statePath("adversarial-init")]);
  if (!result.ok) throw new Error("new state with G-Adversarial did not validate");
});

test("migrates an old state without overwriting existing gates", () => {
  run(["init", "--root", tempRoot, "--goal", "Migrate old state", "--run-id", "migrate-old"]);
  const stateFile = statePath("migrate-old");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  state.gates["G1"] = { id: "G1", status: "pass", evidence: "legacy.md", reason: null, evaluated_at: "2020-01-01T00:00:00.000Z" };
  delete state.gates["G-Adversarial"];
  signTestState(state);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  const migrated = run(["migrate", "--state", stateFile]);
  if (!migrated.changed || !migrated.added_gates.includes("G-Adversarial")) throw new Error("migration did not add missing gate");
  const after = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  if (after.gates.G1.evidence !== "legacy.md" || after.gates.G1.status !== "pass") throw new Error("migration overwrote existing gate");
  if (!after.gates["G-Adversarial"] || after.history.at(-1).type !== "state_migrated") throw new Error("migration was not auditable");
  const second = run(["migrate", "--state", stateFile]);
  if (second.changed) throw new Error("migration was not idempotent");
  const invalid = run(["gate", "--state", stateFile, "--id", "G-Adversarial", "--status", "fail", "--reason", "B-01..B-04 blocking findings"]);
  if (invalid.gate.status !== "fail") throw new Error("failed adversarial review was not recorded");
});

test("migrates legacy permission fields even with all built-in gates present", () => {
  run(["init", "--root", tempRoot, "--goal", "Legacy permissions", "--run-id", "migrate-permissions"]);
  const file = statePath("migrate-permissions");
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  state.action_level = "L3";
  state.source_action_level = "L2";
  state.authority = { level: "L3", source_action_level: "L2", notes: "Set by action command", approval: "Existing user authorization" };
  state.history.push({ type: "action_level_changed", from: "L1", to: "L3" });
  signTestState(state);
  writeJson(file, state);
  const migrated = run(["migrate", "--state", file]);
  if (!migrated.changed || migrated.added_gates.length || migrated.removed_fields.length !== 5) throw new Error("permission-only migration failed");
  const after = JSON.parse(fs.readFileSync(file, "utf8"));
  if ("action_level" in after || "source_action_level" in after || "level" in after.authority || "source_action_level" in after.authority) throw new Error("legacy fields remain");
  if (after.authority.approval !== "Existing user authorization") throw new Error("unrelated approval was lost");
  if (after.history.at(-1).type !== "state_migrated" || after.history.at(-2).type !== "action_level_changed") throw new Error("migration history was not preserved");
  const checkpoint = fs.readFileSync(path.join(path.dirname(file), "checkpoint.md"), "utf8");
  if (/Action level|\bL[0-3]\b/i.test(checkpoint)) throw new Error("checkpoint still reports a level");
  if (!run(["validate", "--state", file]).ok) throw new Error("migrated state is invalid");
  if (run(["migrate", "--state", file]).changed) throw new Error("permission migration is not idempotent");
});

test("migration rejects unsigned state", () => {
  run(["init", "--root", tempRoot, "--goal", "Unsigned migration", "--run-id", "migrate-unsigned"]);
  const stateFile = statePath("migrate-unsigned");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  delete state._state_signature;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  const result = run(["migrate", "--state", stateFile], 1);
  if (!String(result.error).includes("signature")) throw new Error("unsigned migration was accepted");
});

test("quarantines legacy assumptions and working memory without rewriting audit evidence", () => {
  run(["init", "--root", tempRoot, "--goal", "Compatibility isolation", "--run-id", "isolate-context"]);
  const file = statePath("isolate-context");
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  state.assumptions = ["Keep RBAC", "L2 allows writes", { source_action_level: "L3" }, { authority: { level: "L1" } }];
  state.working_memory = { active_decisions: [{ content: "Action level L3 approved" }, { content: "Keep RBAC" }] };
  state.history.push({ type: "action_level_changed", from: "L1", to: "L3" });
  const ledger = path.join(path.dirname(file), "evidence.jsonl");
  const evidence = JSON.stringify({ kind: "decision", claim: "L3 permits execution", source: "legacy", status: "supports" }) + "\n";
  fs.writeFileSync(ledger, evidence);
  state.evidence_count = 1;
  signTestState(state);
  writeJson(file, state);
  run(["checkpoint", "--state", file]);
  if (/\bL[0-3]\b|source_action_level/.test(fs.readFileSync(path.join(path.dirname(file), "checkpoint.md"), "utf8"))) throw new Error("pre-migration checkpoint propagated old levels");
  const historyBefore = JSON.parse(fs.readFileSync(file, "utf8")).history;
  run(["migrate", "--state", file]);
  const after = JSON.parse(fs.readFileSync(file, "utf8"));
  if (JSON.stringify(after.assumptions) !== '["Keep RBAC"]') throw new Error("current assumptions were contaminated or lost");
  if (after.working_memory.active_decisions.length !== 1) throw new Error("legacy working memory remains active");
  if (JSON.stringify(after.history.slice(0, -1)) !== JSON.stringify(historyBefore)) throw new Error("audit history was changed");
  if (!after.historical_compatibility.excluded_from_current_context || after.historical_compatibility.records.length !== 4 || after.historical_compatibility.evidence.length !== 1) throw new Error("isolation archive is incomplete");
  if (fs.readFileSync(ledger, "utf8") !== evidence) throw new Error("evidence bytes changed");
  if (run(["migrate", "--state", file]).changed) throw new Error("isolation migration not idempotent");
});

test("checkpoint instructs evidence-first recovery without granting authority", () => {
  run(["init", "--root", tempRoot, "--goal", "Resume PRD", "--run-id", "checkpoint-recovery"]);
  const file = statePath("checkpoint-recovery");
  run(["checkpoint", "--state", file]);
  const checkpoint = fs.readFileSync(path.join(path.dirname(file), "checkpoint.md"), "utf8");
  for (const phrase of [file, "this checkpoint is an index, not completion evidence", "without asking whether to continue", "do not authorize implementation"]) {
    if (!checkpoint.includes(phrase)) throw new Error(`missing recovery instruction: ${phrase}`);
  }
});

const failed = tests.filter((item) => !item.ok);
const output = { ok: failed.length === 0, test_count: tests.length, passed: tests.length - failed.length, failed: failed.length, tests };
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 1);
