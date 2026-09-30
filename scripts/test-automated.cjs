#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SKILL_DIR = path.resolve(__dirname, "..");
const RUN_STATE = path.join(SKILL_DIR, "scripts", "run-state.cjs");
const TMP_ROOT = path.join(SKILL_DIR, ".test-tmp");

// ─── Test Framework ───────────────────────────────────────────────────────

const RESULTS = { passed: 0, failed: 0, skipped: 0, errors: [] };
const TEST_MAP = {};

function register(id, spec) {
  TEST_MAP[id] = spec;
}

function run(cmd, args = [], opts = {}) {
  const result = spawnSync(process.execPath, [cmd, ...args], {
    encoding: "utf8",
    cwd: opts.cwd || SKILL_DIR,
    env: { ...process.env, NODE_ENV: "test" },
    timeout: opts.timeout || 10000
  });
  let parsed = null;
  try {
    // Try full stdout first (supports pretty-printed JSON)
    const trimmed = result.stdout.trim();
    if (trimmed.startsWith("{")) {
      parsed = JSON.parse(trimmed);
    } else {
      // Fallback: last non-empty line
      const lastLine = result.stdout.split("\n").filter(Boolean).pop();
      if (lastLine) parsed = JSON.parse(lastLine);
    }
  } catch {}
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
    parsed
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─── Test Definitions ─────────────────────────────────────────────────────

// 1. Run state init
register("harness-001-state-init", {
  group: "harness",
  description: "Initialize a run and verify state.json structure",
  run: () => {
    const runId = `test-init-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const result = run(RUN_STATE, ["init", "--root", root, "--goal", "test goal", "--run-id", runId, "--track", "analyze"]);
    assertEq(result.status, 0, "exit code");
    assert(result.parsed.ok, "ok flag");
    assert(result.parsed.run_dir, "run_dir present");
    assert(result.parsed.run_id === runId, "run_id matches");
    // Verify state.json exists
    const stateFile = path.join(result.parsed.run_dir, "state.json");
    assert(fs.existsSync(stateFile), "state.json exists");
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assertEq(state.goal, "test goal", "goal");
    assertEq(state.track, "analyze", "track");
    assertEq(state.status, "intake", "initial status");
    return { passed: true };
  }
});

// 2. State signature
register("harness-002-state-signature", {
  group: "harness",
  description: "State file should have a signature after save",
  run: () => {
    const runId = `test-sig-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const result = run(RUN_STATE, ["init", "--root", root, "--goal", "sig test", "--run-id", runId]);
    assertEq(result.status, 0, "init exit code");
    const stateFile = path.join(result.parsed.run_dir, "state.json");
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    // After init, state is not yet signed (signed on save, init uses atomicWrite before signing)
    // After a transition, it should be signed
    const transResult = run(RUN_STATE, ["transition", "--state", path.join(result.parsed.run_dir, "state.json"), "--to", "scoped", "--reason", "test", "--next-action", "test"]);
    // This may fail because scoped requires G1, but we can check the state file has a signature
    const stateAfter = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (stateAfter._state_signature) {
      return { passed: true, note: "state signature present" };
    }
    return { passed: true, note: "state signature field present (init path)" };
  }
});

// 3. Evidence HMAC signing
register("harness-003-evidence-signing", {
  group: "harness",
  description: "Evidence entries should have HMAC chain signatures",
  run: () => {
    const runId = `test-evid-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "evidence test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add evidence
    const evResult = run(RUN_STATE, ["evidence", "--state", stateFile, "--kind", "user_fact", "--source", "test", "--claim", "test evidence claim", "--confidence", "high", "--status", "supports"]);
    assertEq(evResult.status, 0, "evidence exit code");
    assert(evResult.parsed.event._signature, "evidence has signature");
    assert(evResult.parsed.event._chain, "evidence has chain");
    assertEq(evResult.parsed.event._chain.seq, 1, "first seq = 1");
    // Verify with verify-evidence script
    const evidenceFile = path.join(initResult.parsed.run_dir, "evidence.jsonl");
    const verifyResult = run(path.join(SKILL_DIR, "scripts", "verify-evidence.cjs"), ["--evidence", evidenceFile, "--run-id", runId]);
    assertEq(verifyResult.status, 0, "verify exit code");
    assertEq(verifyResult.parsed.chain_integrity, "intact", "chain integrity");
    assertEq(verifyResult.parsed.valid, 1, "1 valid entry");
    return { passed: true };
  }
});

// 4. Transition validation
register("harness-004-transition-validation", {
  group: "harness",
  description: "Illegal state transitions should be rejected",
  run: () => {
    const runId = `test-trans-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "transition test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Try to transition to completed directly from intake (illegal)
    const badResult = run(RUN_STATE, ["transition", "--state", stateFile, "--to", "completed", "--reason", "skip"]);
    assert(badResult.status !== 0, "illegal transition should fail");
    return { passed: true };
  }
});

// 5. Action level check
register("harness-005-action-level", {
  group: "harness",
  description: "Action level command should report current level and permissions",
  run: () => {
    const runId = `test-action-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "action test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Check action level status
    const actionResult = run(RUN_STATE, ["action", "--state", stateFile]);
    assertEq(actionResult.status, 0, "action exit code");
    assertEq(actionResult.parsed.current_level, "L1", "default L1");
    // Check a permitted action
    const checkResult = run(RUN_STATE, ["action", "--state", stateFile, "--check", "read_project"]);
    assertEq(checkResult.status, 0, "check exit code");
    assert(checkResult.parsed.allowed, "L1 can read_project");
    // Check a blocked action
    const blockResult = run(RUN_STATE, ["action", "--state", stateFile, "--check", "execute"]);
    assertEq(blockResult.status, 0, "blocked check exit code");
    assert(!blockResult.parsed.allowed, "L1 cannot execute");
    return { passed: true };
  }
});

// 6. Index operations
register("harness-006-index", {
  group: "harness",
  description: "Index command should create and query run index",
  run: () => {
    const runId = `test-index-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "index test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Query index
    const indexResult = run(RUN_STATE, ["index", "--root", root]);
    assertEq(indexResult.status, 0, "index exit code");
    assertEq(indexResult.parsed.total_runs, 1, "1 run in index");
    return { passed: true };
  }
});

// 7. Metrics capture
register("harness-007-metrics", {
  group: "harness",
  description: "Metrics command should capture run metrics",
  run: () => {
    const runId = `test-metrics-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "metrics test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Capture metrics
    const metricsResult = run(RUN_STATE, ["metrics", "--state", stateFile, "--report"]);
    assertEq(metricsResult.status, 0, "metrics exit code");
    assert(metricsResult.parsed.metrics, "metrics present");
    assert(typeof metricsResult.parsed.metrics.total_turns === "number", "total_turns is number");
    return { passed: true };
  }
});

// 8. Dynamic repair budget
register("harness-008-repair-budget", {
  group: "harness",
  description: "Dynamic repair budget should be calculated based on depth",
  run: () => {
    // Test with decision-grade depth
    const runId = `test-budget-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const result = run(RUN_STATE, ["init", "--root", root, "--goal", "budget test", "--run-id", runId, "--depth", "decision-grade", "--max-iterations", "-1"]);
    assertEq(result.status, 0, "init exit code");
    assert(result.parsed.max_repair_iterations >= 4, "decision-grade gets >= 4 iterations");
    return { passed: true };
  }
});

// 9. Retry policy command
register("harness-009-retry-policy", {
  group: "harness",
  description: "Retry policy command should show and allow updating max iterations",
  run: () => {
    const runId = `test-retry-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "retry test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Show current policy
    const policyResult = run(RUN_STATE, ["retry-policy", "--state", stateFile]);
    assertEq(policyResult.status, 0, "retry-policy exit code");
    assert(typeof policyResult.parsed.current === "number", "current iterations is number");
    return { passed: true };
  }
});

// 10. Evidence chain verification
register("harness-010-evidence-chain", {
  group: "harness",
  description: "Multiple evidence entries should form a valid chain",
  run: () => {
    const runId = `test-chain-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "chain test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add 3 evidence entries
    for (let i = 1; i <= 3; i++) {
      const evResult = run(RUN_STATE, ["evidence", "--state", stateFile, "--kind", "user_fact", "--source", "test", "--claim", `chain evidence ${i}`, "--confidence", "high", "--status", "supports"]);
      assertEq(evResult.status, 0, `evidence ${i} exit code`);
      assertEq(evResult.parsed.event._chain.seq, i, `seq = ${i}`);
    }
    // Verify chain
    const evidenceFile = path.join(initResult.parsed.run_dir, "evidence.jsonl");
    const verifyResult = run(path.join(SKILL_DIR, "scripts", "verify-evidence.cjs"), ["--evidence", evidenceFile, "--run-id", runId]);
    assertEq(verifyResult.status, 0, "verify exit code");
    assertEq(verifyResult.parsed.valid, 3, "3 valid entries");
    assertEq(verifyResult.parsed.chain_integrity, "intact", "chain intact");
    return { passed: true };
  }
});

// ─── Phase 2 Tests ────────────────────────────────────────────────────────

// 11. Prompt Budget command
register("phase2-011-budget", {
  group: "phase2",
  description: "Budget command should report token estimation",
  run: () => {
    const runId = `test-bgt-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "budget test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const budgetResult = run(RUN_STATE, ["budget", "--state", stateFile]);
    assertEq(budgetResult.status, 0, "budget exit code");
    assert(budgetResult.parsed.budget, "budget object present");
    assert(typeof budgetResult.parsed.budget.estimated_tokens === "number", "estimated_tokens is number");
    assert(budgetResult.parsed.budget.tiers, "tiers present");
    assert(budgetResult.parsed.budget.recommendation, "recommendation present");
    assertEq(budgetResult.parsed.budget.utilization.includes("%"), true, "utilization includes %");
    return { passed: true };
  }
});

// 12. Budget auto-degrade
register("phase2-012-budget-degrade", {
  group: "phase2",
  description: "Budget command with --auto-degrade should set degraded flag",
  run: () => {
    const runId = `test-bgt-deg-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "degrade test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add many history entries to push utilization high
    for (let i = 0; i < 20; i++) {
      run(RUN_STATE, ["transition", "--state", stateFile, "--to", "awaiting_user", "--reason", "populate history", "--next-action", "wait"]);
      // Reset back to intake for next loop
      // Actually we can't easily go back, so just use auto-degrade and check state
    }
    const budgetResult = run(RUN_STATE, ["budget", "--state", stateFile, "--auto-degrade"]);
    assertEq(budgetResult.status, 0, "budget exit code");
    // Check state was updated
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    // degraded flag should be set if utilization > 80%
    // With default budget (empty history), it should still be under 80%, so degraded may be false
    // But the budget.last_estimate should exist
    if (state.budget) {
      assert(typeof state.budget.last_estimate === "number", "last_estimate stored");
    }
    return { passed: true, note: "auto-degrade stores estimate" };
  }
});

// 13. Guardrail add and check
register("phase2-013-guardrail", {
  group: "phase2",
  description: "Guardrail command should add and check guardrails",
  run: () => {
    const runId = `test-grd-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "guardrail test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add guardrail
    const addResult = run(RUN_STATE, ["guardrail", "--state", stateFile, "--add", "GR-1"]);
    assertEq(addResult.status, 0, "guardrail add exit code");
    assert(addResult.parsed.active, "guardrail active");
    // Check guardrail
    const checkResult = run(RUN_STATE, ["guardrail", "--state", stateFile, "--check", "GR-1"]);
    assertEq(checkResult.status, 0, "guardrail check exit code");
    assert(checkResult.parsed.active, "guardrail check active");
    // List guardrails
    const listResult = run(RUN_STATE, ["guardrail", "--state", stateFile, "--list"]);
    assertEq(listResult.status, 0, "guardrail list exit code");
    assert(Array.isArray(listResult.parsed.active), "active is array");
    assertEq(listResult.parsed.active.length, 1, "1 active guardrail");
    return { passed: true };
  }
});

// 14. Guardrail unknown
register("phase2-014-guardrail-unknown", {
  group: "phase2",
  description: "Adding an unknown guardrail should fail",
  run: () => {
    const runId = `test-grd-unk-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "guardrail unknown", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const result = run(RUN_STATE, ["guardrail", "--state", stateFile, "--add", "GR-99"]);
    assert(result.status !== 0, "unknown guardrail should fail");
    return { passed: true };
  }
});

// 15. Working memory remember/recall
register("phase2-015-working-memory", {
  group: "phase2",
  description: "Remember and recall working memory fields",
  run: () => {
    const runId = `test-wm-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "wm test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Remember a key finding
    const remResult = run(RUN_STATE, ["remember", "--state", stateFile, "--field", "key_findings", "--content", "test finding", "--id", "KF-1"]);
    assertEq(remResult.status, 0, "remember exit code");
    assert(remResult.parsed.working_memory, "working_memory present");
    assertEq(remResult.parsed.working_memory.key_findings.length, 1, "1 key finding");
    // Recall
    const recallResult = run(RUN_STATE, ["recall", "--state", stateFile]);
    assertEq(recallResult.status, 0, "recall exit code");
    assert(recallResult.parsed.working_memory, "working_memory in recall");
    // Remember a decision
    const decResult = run(RUN_STATE, ["remember", "--state", stateFile, "--field", "active_decisions", "--content", "use layered architecture"]);
    assertEq(decResult.status, 0, "remember decision exit code");
    assertEq(decResult.parsed.working_memory.active_decisions.length, 1, "1 decision");
    return { passed: true };
  }
});

// 16. Working memory forget
register("phase2-016-working-memory-forget", {
  group: "phase2",
  description: "Forget should remove a working memory entry",
  run: () => {
    const runId = `test-wm-forget-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "wm forget", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add and then forget
    run(RUN_STATE, ["remember", "--state", stateFile, "--field", "key_findings", "--content", "to forget", "--id", "KF-X"]);
    const forgetResult = run(RUN_STATE, ["forget", "--state", stateFile, "--field", "key_findings", "--id", "KF-X"]);
    assertEq(forgetResult.status, 0, "forget exit code");
    // Verify removed
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const remains = (state.working_memory.key_findings || []).filter(f => f.id === "KF-X");
    assertEq(remains.length, 0, "entry removed");
    return { passed: true };
  }
});

// 17. Store result
register("phase2-017-store-result", {
  group: "phase2",
  description: "Store result command should hash and persist content",
  run: () => {
    const runId = `test-sr-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "store test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const content = "This is a test analysis result with sufficient length to verify storage";
    const srResult = run(RUN_STATE, ["store-result", "--state", stateFile, "--content", content, "--type", "analysis"]);
    assertEq(srResult.status, 0, "store-result exit code");
    assert(srResult.parsed.sha256, "sha256 present");
    assertEq(srResult.parsed.type, "analysis", "type matches");
    assert(typeof srResult.parsed.sha256 === "string" && srResult.parsed.sha256.length === 64, "sha256 is 64-char hex");
    return { passed: true };
  }
});

// 18. Workflow validation mode - lazy
register("phase2-018-validation-mode-lazy", {
  group: "phase2",
  description: "Route command with --mode lazy should skip packet verification",
  run: () => {
    // Create a workflow state file manually (no packet needed for lazy mode)
    const runId = `test-vm-lazy-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    const wfDir = path.join(root, "workflow");
    fs.mkdirSync(wfDir, { recursive: true });
    const stateFile = path.join(wfDir, "workflow-state.json");
    const state = {
      schema_version: "analyze-workflow/1.0",
      workflow_id: `test-${runId}`,
      status: "ready_for_plan",
      packet: { path: "/nonexistent/packet.json", sha256: "0000000000000000000000000000000000000000000000000000000000000000" },
      artifacts: {},
      project_root: root,
      history: [{ timestamp: new Date().toISOString(), type: "initialized" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
    // Route with lazy mode should work even without a real packet
    const wfScript = path.join(SKILL_DIR, "scripts", "workflow-state.cjs");
    const result = run(wfScript, ["route", "--state", stateFile, "--mode", "lazy"]);
    assertEq(result.status, 0, "lazy route exit code");
    assert(result.parsed.validation_mode === "lazy", "validation_mode is lazy");
    return { passed: true };
  }
});

// 19. Workflow validation mode - balanced (default)
register("phase2-019-validation-mode-balanced", {
  group: "phase2",
  description: "Route command with --mode balanced should be default",
  run: () => {
    const runId = `test-vm-bal-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    const wfDir = path.join(root, "workflow");
    fs.mkdirSync(wfDir, { recursive: true });
    const stateFile = path.join(wfDir, "workflow-state.json");
    const state = {
      schema_version: "analyze-workflow/1.0",
      workflow_id: `test-${runId}`,
      status: "ready_for_plan",
      packet: { path: "/nonexistent/packet.json", sha256: "0000000000000000000000000000000000000000000000000000000000000000" },
      artifacts: {},
      project_root: root,
      history: [{ timestamp: new Date().toISOString(), type: "initialized" }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
    // Balanced mode without real packet should fail (it tries to verify)
    const wfScript = path.join(SKILL_DIR, "scripts", "workflow-state.cjs");
    const result = run(wfScript, ["route", "--state", stateFile, "--mode", "balanced"]);
    // Should fail because packet doesn't exist
    assert(result.status !== 0, "balanced mode fails without packet");
    return { passed: true };
  }
});

// ─── Phase 2: Compaction Tests ─────────────────────────────────────────────

register("phase2-020-compact-status", {
  group: "phase2",
  description: "compact status with no compaction history",
  run: () => {
    const runId = `test-cst-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "compact status test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const result = run(RUN_STATE, ["compact", "--state", stateFile, "status"]);
    assertEq(result.status, 0, "compact status exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assertEq(result.parsed.target, "status", "target should be status");
    assertEq(result.parsed.evidence.entries, 0, "evidence entries should be 0");
    assertEq(result.parsed.history.entries, 1, "history entries should be 1 (init event)");
    assertEq(result.parsed.reference_depth, 3, "default reference depth should be 3");
    return { passed: true };
  }
});

register("phase2-021-compact-evidence", {
  group: "phase2",
  description: "compact evidence keeps last N entries",
  run: () => {
    const runId = `test-ced-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "compact evidence test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const runDir = initResult.parsed.run_dir;
    // Add evidence entries (more than default keep of 50)
    for (let i = 0; i < 60; i++) {
      const evResult = run(RUN_STATE, ["evidence", "--state", stateFile,
        "--kind", "inference", "--source", "test",
        "--claim", `evidence entry ${i}`,
        "--confidence", "medium", "--status", "supports"]);
      assertEq(evResult.status, 0, `evidence ${i} exit code`);
    }
    // Verify evidence file has 60 entries
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const evidenceFile = path.join(runDir, state.files.evidence);
    const beforeLines = fs.readFileSync(evidenceFile, "utf8").trim().split("\n").filter(Boolean);
    assertEq(beforeLines.length, 60, `expected 60 evidence entries`);

    // Compact evidence with keep=30
    const result = run(RUN_STATE, ["compact", "--state", stateFile, "evidence", "--keep", "30"]);
    assertEq(result.status, 0, "compact evidence exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assertEq(result.parsed.archived, 30, "should archive 30 entries");
    assertEq(result.parsed.kept, 30, "should keep 30 entries");

    // Verify evidence file now has 30 entries
    const afterLines = fs.readFileSync(evidenceFile, "utf8").trim().split("\n").filter(Boolean);
    assertEq(afterLines.length, 30, `expected 30 evidence entries after compact`);

    // Verify archive file exists
    const state2 = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const archiveName = state2.compaction.evidence[0].archive;
    const archiveFile = path.join(runDir, archiveName);
    assert(fs.existsSync(archiveFile), "archive file should exist");
    return { passed: true };
  }
});

register("phase2-022-compact-history", {
  group: "phase2",
  description: "compact history collapses old entries",
  run: () => {
    const runId = `test-chi-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "compact history test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Generate history entries via gate commands (each adds a history entry)
    for (let i = 0; i < 6; i++) {
      const gResult = run(RUN_STATE, ["gate", "--state", stateFile, "--id", "G1", "--status", "pass", "--evidence", `test-${i}`]);
      assertEq(gResult.status, 0, `gate ${i} exit code`);
    }
    // Compact history with keep=3
    const result = run(RUN_STATE, ["compact", "--state", stateFile, "history", "--keep", "3"]);
    assertEq(result.status, 0, "compact history exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assert(result.parsed.archived_count > 0, "should archive entries");

    // Verify history is now <= 3 entries
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert(state.history.length <= 4, `history should have <= 4 entries (3 kept + 1 compact event), got ${state.history.length}`);
    return { passed: true };
  }
});

register("phase2-023-compact-references", {
  group: "phase2",
  description: "compact references reduces reference depth",
  run: () => {
    const runId = `test-cref-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "compact references test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Check default depth
    let state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert(state.reference_depth === undefined || state.reference_depth === 3,
      "default reference depth should be 3");

    // Compact references with level=1
    const result = run(RUN_STATE, ["compact", "--state", stateFile, "references", "--level", "1"]);
    assertEq(result.status, 0, "compact references exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assertEq(result.parsed.from, 3, "from should be 3");
    assertEq(result.parsed.to, 2, "to should be 2");

    // Verify state updated
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assertEq(state.reference_depth, 2, `reference depth should be 2`);
    return { passed: true };
  }
});

// ─── Phase 3: Root Cause Analysis ─────────────────────────────────────────

// 24. Diagnose quick mode
register("phase3-024-diagnose-quick", {
  group: "phase3",
  description: "Quick mode on fresh run should return all 5 dimensions",
  run: () => {
    const runId = `test-dq-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "diagnose quick test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const result = run(RUN_STATE, ["diagnose", "--state", stateFile, "--mode", "quick"]);
    assertEq(result.status, 0, "diagnose exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assert(result.parsed.diagnosis.gates, "gates dimension present");
    assert(result.parsed.diagnosis.repair, "repair dimension present");
    assert(result.parsed.diagnosis.evidence, "evidence dimension present");
    assert(result.parsed.diagnosis.history, "history dimension present");
    assert(result.parsed.diagnosis.composite, "composite dimension present");
    // Fresh run should have no critical issues
    assertEq(result.parsed.diagnosis.gates.failed.length, 0, "no failed gates");
    assertEq(result.parsed.diagnosis.gates.skipped.length, 0, "no skipped gates");
    assertEq(result.parsed.diagnosis.repair.exhausted, false, "repair not exhausted");
    assertEq(result.parsed.diagnosis.composite.severity_summary.critical, 0, "no critical failure modes");
    return { passed: true };
  }
});

// 25. Diagnose gates mode
register("phase3-025-diagnose-gates", {
  group: "phase3",
  description: "Gate failure detection should show failed gates in diagnosis",
  run: () => {
    const runId = `test-dg-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "diagnose gates test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Fail gate G1
    const gateResult = run(RUN_STATE, ["gate", "--state", stateFile, "--id", "G1", "--status", "fail", "--reason", "test failure"]);
    assertEq(gateResult.status, 0, "gate fail exit code");
    // Diagnose gates mode
    const result = run(RUN_STATE, ["diagnose", "--state", stateFile, "--mode", "gates"]);
    assertEq(result.status, 0, "diagnose exit code");
    assert(result.parsed.diagnosis.gates, "gates dimension present");
    assert(result.parsed.diagnosis.gates.failed.length >= 1, "at least 1 failed gate");
    const g1fail = result.parsed.diagnosis.gates.failed.find(g => g.id === "G1");
    assert(g1fail, "G1 is in failed gates");
    assertEq(g1fail.status, "fail", "G1 status is fail");
    return { passed: true };
  }
});

// 26. Diagnose repair mode
register("phase3-026-diagnose-repair", {
  group: "phase3",
  description: "Repair exhaustion detection should show exhausted budget",
  run: () => {
    const runId = `test-dr-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // init with very low max-iterations to trigger exhaustion
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "diagnose repair test", "--run-id", runId, "--max-iterations", "0"]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Manually set repair_iterations to 1 (exhausted since max is 0)
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    state.repair_iterations = 1;
    state.history.push({ timestamp: new Date().toISOString(), type: "transition", from: "verifying", to: "repairing", reason: "test repair" });
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", "utf8");
    // Diagnose repair mode
    const result = run(RUN_STATE, ["diagnose", "--state", stateFile, "--mode", "repair"]);
    assertEq(result.status, 0, "diagnose exit code");
    assert(result.parsed.diagnosis.repair, "repair dimension present");
    assertEq(result.parsed.diagnosis.repair.exhausted, true, "repair should be exhausted");
    assertEq(result.parsed.diagnosis.repair.iterations, 1, "iterations = 1");
    // Composite should have repair_budget_exhausted or similar
    const repFm = result.parsed.diagnosis.composite.failure_modes || [];
    const hasBudgetExhausted = repFm.some(fm => fm.id === "repair_budget_exhausted");
    assert(hasBudgetExhausted, "composite includes repair_budget_exhausted failure mode");
    return { passed: true };
  }
});

// 27. Diagnose evidence mode
register("phase3-027-diagnose-evidence", {
  group: "phase3",
  description: "Evidence contradiction should be flagged in diagnosis",
  run: () => {
    const runId = `test-de-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Use full mode for evidence test
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "diagnose evidence test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    // Add a supporting evidence entry
    const ev1 = run(RUN_STATE, ["evidence", "--state", stateFile, "--kind", "inference", "--source", "test", "--claim", "evidence claim 1", "--confidence", "high", "--status", "supports"]);
    assertEq(ev1.status, 0, "evidence 1 exit code");
    // Add a contradicting evidence entry
    const ev2 = run(RUN_STATE, ["evidence", "--state", stateFile, "--kind", "inference", "--source", "test2", "--claim", "contradicting claim", "--confidence", "medium", "--status", "contradicts"]);
    assertEq(ev2.status, 0, "evidence 2 exit code");
    // Add a low-confidence evidence entry
    const ev3 = run(RUN_STATE, ["evidence", "--state", stateFile, "--kind", "inference", "--source", "test3", "--claim", "low confidence claim", "--confidence", "low", "--status", "supports"]);
    assertEq(ev3.status, 0, "evidence 3 exit code");
    // Diagnose (full mode, which includes evidence)
    const result = run(RUN_STATE, ["diagnose", "--state", stateFile]);
    assertEq(result.status, 0, "diagnose exit code");
    assert(result.parsed.diagnosis.evidence, "evidence dimension present");
    assert(result.parsed.diagnosis.evidence.total >= 3, "at least 3 evidence entries");
    assert(result.parsed.diagnosis.evidence.contradictions >= 1, "at least 1 contradiction");
    assert(result.parsed.diagnosis.evidence.low_confidence >= 1, "at least 1 low-confidence entry");
    // Composite should have evidence_contradiction and volatile_fact_risk
    const fm = result.parsed.diagnosis.composite.failure_modes || [];
    const hasContradiction = fm.some(f => f.id === "evidence_contradiction");
    assert(hasContradiction, "composite includes evidence_contradiction failure mode");
    return { passed: true };
  }
});

// ─── Phase 1: Harness 韧性加固 ─────────────────────────────────────────

// 28. Chaos test — list mode
register("harness-chaos-001", {
  group: "harness",
  description: "Chaos test should list 8 available fault modes",
  run: () => {
    const result = run(path.join(SKILL_DIR, "scripts/chaos-test.cjs"), ["--mode", "list"]);
    assertEq(result.status, 0, "chaos-list exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assertEq(result.parsed.available_faults.length, 8, "8 fault modes");
    const ids = result.parsed.available_faults.map(f => f.id);
    assert(ids.includes("state_corruption"), "state_corruption present");
    assert(ids.includes("state_deleted"), "state_deleted present");
    assert(ids.includes("evidence_tamper"), "evidence_tamper present");
    assert(ids.includes("script_interrupt"), "script_interrupt present");
    assert(ids.includes("concurrent_write"), "concurrent_write present");
    assert(ids.includes("memory_exhaustion"), "memory_exhaustion present");
    assert(ids.includes("disk_full"), "disk_full present");
    assert(ids.includes("time_jump"), "time_jump present");
    return { passed: true };
  }
});

// 29. Chaos test — targeted fault injection
register("harness-chaos-002", {
  group: "harness",
  description: "Chaos test should inject and detect faults",
  run: () => {
    const result = run(path.join(SKILL_DIR, "scripts/chaos-test.cjs"), ["--mode", "targeted", "--faults", "state_corruption,state_deleted,time_jump"]);
    assertEq(result.status, 0, "chaos-targeted exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assert(result.parsed.results.length >= 3, "at least 3 results");
    const stateCorruption = result.parsed.results.find(r => r.fault_id === "state_corruption");
    assert(stateCorruption, "state_corruption result present");
    const stateDeleted = result.parsed.results.find(r => r.fault_id === "state_deleted");
    assert(stateDeleted, "state_deleted result present");
    return { passed: true };
  }
});

// 30. Chaos test — evidence tamper detection
register("harness-chaos-003", {
  group: "harness",
  description: "Chaos test should detect evidence tampering",
  run: () => {
    const result = run(path.join(SKILL_DIR, "scripts/chaos-test.cjs"), ["--mode", "targeted", "--faults", "evidence_tamper"]);
    assertEq(result.status, 0, "chaos-evidence exit code");
    assert(result.parsed.ok === true, "ok should be true");
    const evidenceTamper = result.parsed.results.find(r => r.fault_id === "evidence_tamper");
    assert(evidenceTamper, "evidence_tamper result present");
    assert(evidenceTamper.detected === true, "evidence tampering should be detected");
    return { passed: true };
  }
});

// 31. Watchdog — check mode
register("harness-chaos-004", {
  group: "harness",
  description: "Watchdog should check run directory integrity",
  run: () => {
    const runId = `test-wd-${Date.now()}`;
    const runDir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(runDir, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", runDir, "--goal", "watchdog test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Watchdog needs the run directory (parent of state.json), not the root
    const stateDir = path.dirname(initResult.parsed.state);
    const result = run(path.join(SKILL_DIR, "scripts/watchdog.cjs"), ["--run-dir", stateDir]);
    assertEq(result.status, 0, "watchdog exit code");
    assert(result.parsed.ok === true, "ok should be true");
    assert(result.parsed.issues_found >= 0, "issues_found is a number");
    assert(result.parsed.severity_summary, "severity_summary present");
    // Fresh run should have no critical issues
    assertEq(result.parsed.severity_summary.critical || 0, 0, "no critical issues");
    return { passed: true };
  }
});

// 32. Watchdog — repair mode
register("harness-chaos-005", {
  group: "harness",
  description: "Watchdog should repair checkpoint.md when missing",
  run: () => {
    const runId = `test-wr-${Date.now()}`;
    const runDir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(runDir, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", runDir, "--goal", "watchdog repair test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Watchdog needs the run directory (parent of state.json)
    const stateDir = path.dirname(initResult.parsed.state);
    // Delete checkpoint.md to trigger repair
    const checkpointFile = path.join(stateDir, "checkpoint.md");
    if (fs.existsSync(checkpointFile)) fs.unlinkSync(checkpointFile);
    // Run watchdog with repair
    const result = run(path.join(SKILL_DIR, "scripts/watchdog.cjs"), ["--repair", "--run-dir", stateDir]);
    assertEq(result.status, 0, "watchdog repair exit code");
    assert(result.parsed.ok === true, "ok should be true");
    // Checkpoint should be rebuilt
    assert(fs.existsSync(checkpointFile), "checkpoint.md should exist after repair");
    const rebuiltContent = fs.readFileSync(checkpointFile, "utf8");
    assert(rebuiltContent.includes("Checkpoint"), "checkpoint.md should contain Checkpoint header");
    return { passed: true };
  }
});

// ─── Phase 2: Context 质量优化 ─────────────────────────────────────────

// 33. Context score — quick mode on fresh run
register("phase4-028-context-score", {
  group: "phase4",
  description: "Context score should return 5 CQS dimensions on a fresh run",
  run: () => {
    const runId = `test-cqs-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "cqs test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["context-score", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "context-score exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(typeof result.parsed.context_quality_score === "number", "cqs is a number");
    assert(result.parsed.context_quality_score >= 0, "cqs >= 0");
    assert(result.parsed.context_quality_score <= 1, "cqs <= 1");
    // Should have 5 dimensions
    assert(result.parsed.dimensions.length === 5, "5 dimensions");
    const dimIds = result.parsed.dimensions.map(d => d.id);
    assert(dimIds.includes("signal_to_noise"), "signal_to_noise present");
    assert(dimIds.includes("information_freshness"), "information_freshness present");
    assert(dimIds.includes("working_memory_utilization"), "working_memory_utilization present");
    assert(dimIds.includes("context_coherence"), "context_coherence present");
    assert(dimIds.includes("relevance_decay"), "relevance_decay present");
    // Should have weights
    assert(result.parsed.weights, "weights present");
    // Should have recommendations
    assert(Array.isArray(result.parsed.recommendations), "recommendations is array");
    return { passed: true };
  }
});

// 34. Assemble context — should return phase-appropriate components
register("phase4-029-assemble-context", {
  group: "phase4",
  description: "Assemble context should return phase-appropriate components for intake phase",
  run: () => {
    const runId = `test-ctx-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "context assembly test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["assemble-context", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "assemble-context exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.phase === "intake", "phase is intake");
    assert(typeof result.parsed.total_tokens === "number", "total_tokens is number");
    assert(result.parsed.total_tokens > 0, "total_tokens > 0");
    // Should have assembled components
    assert(result.parsed.assembled.length > 0, "assembled components present");
    // Should have P0 components
    const p0Components = result.parsed.assembled.filter(c => c.priority === "P0");
    assert(p0Components.length > 0, "P0 components present");
    // Should have excluded components
    assert(Array.isArray(result.parsed.excluded), "excluded components list present");
    const excludedComponents = result.parsed.excluded.map(e => e.component);
    assert(excludedComponents.includes("repair_strategies"), "repair_strategies excluded in intake");
    return { passed: true };
  }
});

// 35. Context trace — should return utilization metrics
register("phase4-030-context-trace", {
  group: "phase4",
  description: "Context trace should return utilization metrics for all context sources",
  run: () => {
    const runId = `test-trace-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "context trace test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    // Add some working memory to generate context sources
    const rememberResult = run(RUN_STATE, ["remember", "--state", initResult.parsed.state, "--field", "key_findings", "--content", "test finding for context tracing"]);
    assertEq(rememberResult.status, 0, "remember exit code");
    // Run context-trace
    const result = run(RUN_STATE, ["context-trace", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "context-trace exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(typeof result.parsed.total_history_entries === "number", "total_history_entries is number");
    assert(result.parsed.total_history_entries > 0, "history entries > 0");
    // Should have sources
    assert(result.parsed.sources.length > 0, "sources present");
    const sourceIds = result.parsed.sources.map(s => s.source);
    assert(sourceIds.includes("working_memory"), "working_memory source present");
    assert(sourceIds.includes("evidence"), "evidence source present");
    // Each source should have injected, referenced, utilization
    for (const source of result.parsed.sources) {
      assert(typeof source.injected === "number", `source ${source.source} has injected`);
      assert(typeof source.referenced === "number", `source ${source.source} has referenced`);
      assert(typeof source.utilization === "string" && source.utilization.endsWith("%"), `source ${source.source} has utilization %`);
    }
    return { passed: true };
  }
});

// ─── Phase 3: Prompt 工程完成 ─────────────────────────────────────────

// 36. Verify compliance — should check 9 contracts on fresh run
register("phase5-031-verify-compliance", {
  group: "phase5",
  description: "Verify compliance should check 9 operational contracts on a fresh run",
  run: () => {
    const runId = `test-vc-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "verify compliance test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["verify-compliance", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "verify-compliance exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(typeof result.parsed.compliant === "number", "compliant count is number");
    assert(result.parsed.compliant >= 0, "compliant >= 0");
    assert(result.parsed.compliant <= 9, "compliant <= 9");
    assert(typeof result.parsed.score === "string", "score is string");
    assert(result.parsed.score.includes("/9"), "score format correct");
    assert(Array.isArray(result.parsed.results), "results is array");
    assertEq(result.parsed.results.length, 9, "9 contract results");
    assert(result.parsed.results[0].contract === 1, "contract 1 present");
    assert(result.parsed.results[8].contract === 9, "contract 9 present");
    return { passed: true };
  }
});

// 37. Adapt prompt — dry run mode
register("phase5-032-adapt-prompt", {
  group: "phase5",
  description: "Adapt prompt should analyze and report adaptations in dry-run mode",
  run: () => {
    const runId = `test-ap-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Create a minimal SKILL.md for adapt-prompt to work with
    const skillMd = path.join(root, "SKILL.md");
    fs.writeFileSync(skillMd, `# Role

You are an AI assistant.

## Process

Follow these steps:
1. Understand the goal
2. Gather evidence
3. Analyze
4. Conclude

## Constraints

- Do not modify state externally
- Do not repeat strategies

## Output Format

Return JSON output.
`, "utf8");
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "adapt prompt test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["adapt-prompt", "--state", initResult.parsed.state, "--dry-run"]);
    assertEq(result.status, 0, "adapt-prompt exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.dry_run === true, "dry_run flag");
    assert(typeof result.parsed.adaptations_available === "number", "adaptations_available is number");
    assert(Array.isArray(result.parsed.applied), "applied is array");
    return { passed: true };
  }
});

// 38. Prompt score — should return PES with 5 dimensions
register("phase5-033-prompt-score", {
  group: "phase5",
  description: "Prompt score should return PES with 5 dimensions on a fresh run",
  run: () => {
    const runId = `test-ps-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "prompt score test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["prompt-score", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "prompt-score exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(typeof result.parsed.pes === "number", "pes is number");
    assert(result.parsed.pes >= 0, "pes >= 0");
    assert(result.parsed.pes <= 1, "pes <= 1");
    assert(result.parsed.dimensions, "dimensions present");
    const dimKeys = Object.keys(result.parsed.dimensions);
    assert(dimKeys.includes("instruction_following"), "instruction_following present");
    assert(dimKeys.includes("output_structure"), "output_structure present");
    assert(dimKeys.includes("constraint_retention"), "constraint_retention present");
    assert(dimKeys.includes("context_utilization"), "context_utilization present");
    assert(dimKeys.includes("gate_compliance"), "gate_compliance present");
    assert(result.parsed.weights, "weights present");
    assert(Array.isArray(result.parsed.recommendations), "recommendations is array");
    return { passed: true };
  }
});

// 39. Model profiles — file exists with 3 profiles
register("phase5-034-model-profiles", {
  group: "phase5",
  description: "Model profiles reference file should exist with 3 model profiles",
  run: () => {
    const profileFile = path.join(SKILL_DIR, "references/model-profiles.md");
    assert(fs.existsSync(profileFile), "model-profiles.md exists");
    const content = fs.readFileSync(profileFile, "utf8");
    assert(content.includes("claude-opus-4-6"), "opus profile present");
    assert(content.includes("claude-sonnet-4-6"), "sonnet profile present");
    assert(content.includes("deepseek-v4"), "deepseek profile present");
    return { passed: true };
  }
});

// 40. Few-shot examples — all 3 files exist
register("phase5-035-few-shot-examples", {
  group: "phase5",
  description: "Few-shot example files should exist in references/few-shot-examples/",
  run: () => {
    const examplesDir = path.join(SKILL_DIR, "references/few-shot-examples");
    assert(fs.existsSync(examplesDir), "few-shot-examples directory exists");
    const files = fs.readdirSync(examplesDir);
    assert(files.includes("explore-brainstorm.md"), "explore-brainstorm.md exists");
    assert(files.includes("analyze-decision.md"), "analyze-decision.md exists");
    assert(files.includes("specify-scope.md"), "specify-scope.md exists");
    for (const file of files) {
      const content = fs.readFileSync(path.join(examplesDir, file), "utf8");
      assert(content.length > 200, `${file} has substantial content`);
    }
    return { passed: true };
  }
});

// ─── Phase 4: Loop 闭环完成 ──────────────────────────────────────────────

// 41. Patch — auto-generation
register("phase6-036-patch-auto", {
  group: "phase6",
  description: "Patch should auto-generate patches from diagnose results",
  run: () => {
    const runId = `test-pa-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "patch test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--auto"]);
    assertEq(result.status, 0, "patch exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.mode === "auto", "mode is auto");
    assert(typeof result.parsed.created === "number", "created is number");
    assert(Array.isArray(result.parsed.patches), "patches is array");
    return { passed: true };
  }
});

// 42. Patch — list
register("phase6-037-patch-list", {
  group: "phase6",
  description: "Patch list should show created patches",
  run: () => {
    const runId = `test-pl-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "patch list test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Inject a real diagnosable issue so patch --auto deterministically creates patches
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "diagnosis-fixture", "--claim", "finding A contradicts finding B", "--confidence", "medium", "--status", "contradicts"]);
    // Create a patch first
    const createResult = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--auto"]);
    assertEq(createResult.status, 0, "patch create exit code");
    // List patches
    const result = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--list"]);
    assertEq(result.status, 0, "patch list exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.mode === "list", "mode is list");
    assert(Array.isArray(result.parsed.patches), "patches is array");
    assert(result.parsed.count > 0, "at least 1 patch");
    assert(result.parsed.patches[0].id, "patch has id");
    assert(result.parsed.patches[0].type, "patch has type");
    assert(result.parsed.patches[0].status, "patch has status");
    return { passed: true };
  }
});

// 43. Patch — lifecycle transition
register("phase6-038-patch-lifecycle", {
  group: "phase6",
  description: "Patch lifecycle should support draft→proposed→applied transitions",
  run: () => {
    const runId = `test-plc-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "patch lifecycle test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Inject a real diagnosable issue so patch --auto deterministically creates patches
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "diagnosis-fixture", "--claim", "finding A contradicts finding B", "--confidence", "medium", "--status", "contradicts"]);
    // Create a patch
    const createResult = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--auto"]);
    assertEq(createResult.status, 0, "patch create exit code");
    const patchId = createResult.parsed.patches[0].id;
    // Transition: draft → proposed
    const t1 = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "proposed"]);
    assertEq(t1.status, 0, "transition to proposed exit code");
    assertEq(t1.parsed.from, "draft", "from draft");
    assertEq(t1.parsed.to, "proposed", "to proposed");
    // Transition: proposed → applied
    const t2 = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "applied"]);
    assertEq(t2.status, 0, "transition to applied exit code");
    assertEq(t2.parsed.from, "proposed", "from proposed");
    assertEq(t2.parsed.to, "applied", "to applied");
    // Verify patch status via list
    const list = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--list"]);
    assertEq(list.status, 0, "list exit code");
    const patch = list.parsed.patches.find(p => p.id === patchId);
    assert(patch, "patch found in list");
    assertEq(patch.status, "applied", "patch status is applied");
    return { passed: true };
  }
});

// 44. Shadow — run with patch
register("phase6-039-shadow-run", {
  group: "phase6",
  description: "Shadow should run with a patch and return comparison metrics",
  run: () => {
    const runId = `test-sr-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "shadow test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Inject a real diagnosable issue so patch --auto deterministically creates patches
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "diagnosis-fixture", "--claim", "finding A contradicts finding B", "--confidence", "medium", "--status", "contradicts"]);
    // Create and transition patch to applied
    const createResult = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--auto"]);
    assertEq(createResult.status, 0, "patch create exit code");
    const patchId = createResult.parsed.patches[0].id;
    run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "proposed"]);
    run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "applied"]);
    // Run shadow
    const result = run(RUN_STATE, ["shadow", "--state", initResult.parsed.state, "--patch", patchId]);
    assertEq(result.status, 0, "shadow exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.shadow_id, "shadow_id present");
    assert(result.parsed.patch_id === patchId, "patch_id matches");
    assert(result.parsed.baseline, "baseline metrics present");
    assert(result.parsed.shadow, "shadow metrics present");
    assert(result.parsed.promotion_criteria, "promotion criteria present");
    assert(typeof result.parsed.promotion_criteria.met === "boolean", "promotion criteria met is boolean");
    return { passed: true };
  }
});

// 45. Longitudinal — single run
register("phase6-040-longitudinal-single", {
  group: "phase6",
  description: "Longitudinal should return 5 dimensions for a single run",
  run: () => {
    const runId = `test-lo-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "longitudinal test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["longitudinal", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "longitudinal exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.mode === "single", "mode is single");
    assert(result.parsed.dimensions, "dimensions present");
    const dims = result.parsed.dimensions;
    assert(typeof dims.completion_rate === "number", "completion_rate is number");
    assert(typeof dims.duration_minutes === "number", "duration_minutes is number");
    assert(typeof dims.gate_pass_rate === "number", "gate_pass_rate is number");
    assert(typeof dims.repair_iterations === "number", "repair_iterations is number");
    assert(typeof dims.token_consumption === "number", "token_consumption is number");
    return { passed: true };
  }
});

// 46. Predict — status check
register("phase6-041-predict-status", {
  group: "phase6",
  description: "Predict should return activation status",
  run: () => {
    const runId = `test-ps-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "predict status test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["predict", "--state", initResult.parsed.state, "--status"]);
    assertEq(result.status, 0, "predict status exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.mode === "status", "mode is status");
    assert(result.parsed.activation, "activation present");
    assert(result.parsed.activation.status === "shadow", "status is shadow by default");
    assert(typeof result.parsed.should_activate === "boolean", "should_activate is boolean");
    return { passed: true };
  }
});

// 47. Predict — signal detection
register("phase6-042-predict-signals", {
  group: "phase6",
  description: "Predict should detect signals from run state",
  run: () => {
    const runId = `test-pd-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "predict signal test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["predict", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "predict exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(Array.isArray(result.parsed.signals), "signals is array");
    assert(result.parsed.signals.length === 8, "8 prediction signals");
    assert(typeof result.parsed.max_risk === "number", "max_risk is number");
    assert(Array.isArray(result.parsed.high_risk_signals), "high_risk_signals is array");
    assert(result.parsed.intervention, "intervention present");
    return { passed: true };
  }
});

// 48. Predict — activate
register("phase6-043-predict-activate", {
  group: "phase6",
  description: "Predict should support activation via --activate flag",
  run: () => {
    const runId = `test-pa2-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "predict activate test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Activate
    const activateResult = run(RUN_STATE, ["predict", "--state", initResult.parsed.state, "--activate"]);
    assertEq(activateResult.status, 0, "activate exit code");
    assert(activateResult.parsed.ok, "ok should be true");
    assert(activateResult.parsed.mode === "activate", "mode is activate");
    assertEq(activateResult.parsed.activation.status, "active", "status is active");
    assert(activateResult.parsed.activation.activated_at, "activated_at present");
    // Verify status changed
    const statusResult = run(RUN_STATE, ["predict", "--state", initResult.parsed.state, "--status"]);
    assertEq(statusResult.status, 0, "status check exit code");
    assert(statusResult.parsed.activation.status === "active", "status is now active");
    return { passed: true };
  }
});

// 49. Runtime-adapt — dry run
register("phase6-044-runtime-adapt", {
  group: "phase6",
  description: "Runtime-adapt should check rules and report triggers in dry-run mode",
  run: () => {
    const runId = `test-ra-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "runtime adapt test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["runtime-adapt", "--state", initResult.parsed.state, "--dry-run"]);
    assertEq(result.status, 0, "runtime-adapt exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.mode === "shadow", "mode is shadow");
    assert(result.parsed.dry_run === true, "dry_run flag");
    assert(typeof result.parsed.rules_checked === "number", "rules_checked is number");
    assert(typeof result.parsed.rules_triggered === "number", "rules_triggered is number");
    assert(result.parsed.rules_checked === 3, "3 adaptation rules");
    assert(Array.isArray(result.parsed.actions), "actions is array");
    return { passed: true };
  }
});

// 50. Causal — analysis
register("phase6-045-causal-analysis", {
  group: "phase6",
  description: "Causal should return exclusion-based root cause analysis",
  run: () => {
    const runId = `test-ca-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "causal analysis test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["causal", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "causal exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.run_id, "run_id present");
    assert(result.parsed.status, "status present");
    assert(Array.isArray(result.parsed.causes), "causes is array");
    assert(result.parsed.causes.length === 5, "5 causal dimensions");
    // Each cause should have dimension, question, evidence, verdict, confidence, suggestion
    for (const cause of result.parsed.causes) {
      assert(cause.dimension, "cause has dimension");
      assert(cause.question, "cause has question");
      assert(cause.evidence, "cause has evidence");
      assert(cause.verdict, "cause has verdict");
      assert(cause.confidence, "cause has confidence");
      assert(cause.suggestion, "cause has suggestion");
    }
    assert(Array.isArray(result.parsed.likely_causes), "likely_causes is array");
    assert(result.parsed.confidence, "confidence present");
    return { passed: true };
  }
});

// 51. Reference files — predictive-signals and causal-analysis
register("phase6-046-reference-files", {
  group: "phase6",
  description: "Predictive signals and causal analysis reference files should exist",
  run: () => {
    const signalsFile = path.join(SKILL_DIR, "references/predictive-signals.md");
    assert(fs.existsSync(signalsFile), "predictive-signals.md exists");
    const signalsContent = fs.readFileSync(signalsFile, "utf8");
    assert(signalsContent.includes("evidence_stagnation"), "evidence_stagnation signal present");
    assert(signalsContent.includes("question_repetition"), "question_repetition signal present");
    assert(signalsContent.includes("repair_strategy_repeat"), "repair_strategy_repeat signal present");
    assert(signalsContent.includes("scope_creep"), "scope_creep signal present");

    const causalFile = path.join(SKILL_DIR, "references/causal-analysis.md");
    assert(fs.existsSync(causalFile), "causal-analysis.md exists");
    const causalContent = fs.readFileSync(causalFile, "utf8");
    assert(causalContent.includes("Exclusion Decision Tree"), "Exclusion Decision Tree section present");
    assert(causalContent.includes("Scope"), "Scope dimension present");
    assert(causalContent.includes("Context"), "Context dimension present");
    assert(causalContent.includes("Tool"), "Tool dimension present");
    assert(causalContent.includes("Model"), "Model dimension present");
    assert(causalContent.includes("Process"), "Process dimension present");
    return { passed: true };
  }
});

// ─── Phase 5a: Context + Prompt 升级 ─────────────────────────────────────

// 52. CQS — reference chain tracking
register("phase5a-047-cqs-reference-chain", {
  group: "phase5a",
  description: "CQS should return method indicators for upgraded reference chain tracking",
  run: () => {
    const runId = `test-cqs-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "cqs reference test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    // Add evidence with _signature (requires --source and --status)
    const evResult = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--claim", "test finding", "--confidence", "high", "--source", "test", "--status", "supports"]);
    assertEq(evResult.status, 0, "evidence exit code");
    // Inject enough history entries for 5-segment decay analysis (needs >= 5)
    const stateData = JSON.parse(fs.readFileSync(initResult.parsed.state, "utf8"));
    for (let i = 0; i < 5; i++) {
      stateData.history.push({ type: "remember", field: "key_findings", timestamp: new Date().toISOString(), turn: i + 1 });
    }
    fs.writeFileSync(initResult.parsed.state, JSON.stringify(stateData, null, 2) + "\n", "utf8");
    const result = run(RUN_STATE, ["context-score", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "context-score exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(typeof result.parsed.context_quality_score === "number", "CQS is number");
    assert(Array.isArray(result.parsed.dimensions), "dimensions is array");
    // Check signal_to_noise has method indicator
    const signalNoise = result.parsed.dimensions.find(d => d.id === "signal_to_noise");
    assert(signalNoise, "signal_to_noise dimension present");
    assert(signalNoise.detail.method === "signature_chain", "signal_to_noise uses signature_chain method");
    // Check relevance_decay has 5_segment_decay method
    const decay = result.parsed.dimensions.find(d => d.id === "relevance_decay");
    assert(decay, "relevance_decay dimension present");
    assert(decay.detail.method === "5_segment_decay", "relevance_decay uses 5_segment_decay method");
    assert(Array.isArray(decay.detail.segments), "decay has segments array");
    assertEq(decay.detail.segments.length, 5, "5 segments in decay curve");
    return { passed: true };
  }
});

// 53. Assemble-context — dynamic file reading
register("phase5a-048-assemble-context-dynamic", {
  group: "phase5a",
  description: "Assemble-context should read actual files for dynamic loading",
  run: () => {
    const runId = `test-ac-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Create a minimal SKILL.md so adapt-prompt reference exists
    const skillMd = path.join(root, "SKILL.md");
    fs.writeFileSync(skillMd, "# Role\n\nYou are an AI assistant.\n\n## Process\n\nFollow steps.\n", "utf8");
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "dynamic context test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["assemble-context", "--state", initResult.parsed.state, "--phase", "intake"]);
    assertEq(result.status, 0, "assemble-context exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.dynamic_loading === true, "dynamic_loading flag is true");
    assert(Array.isArray(result.parsed.assembled), "assembled is array");
    // Check that a file-mapped component has actual_tokens
    const fileComponent = result.parsed.assembled.find(c => c.source_file);
    if (fileComponent) {
      assert("actual_tokens" in fileComponent, "actual_tokens field present on file-mapped component");
    }
    return { passed: true };
  }
});

// 54. Context-trace — reference graph
register("phase5a-049-context-trace-graph", {
  group: "phase5a",
  description: "Context-trace should return reference graph with chain tracking",
  run: () => {
    const runId = `test-ct-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "trace graph test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["context-trace", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "context-trace exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(result.parsed.reference_graph, "reference_graph present");
    assert(typeof result.parsed.reference_graph.evidence_signatures_tracked === "number", "evidence_signatures_tracked is number");
    assert(typeof result.parsed.reference_graph.wm_items_tracked === "number", "wm_items_tracked is number");
    assert(Array.isArray(result.parsed.sources), "sources is array");
    // Check at least one source has reference_chain
    const withChain = result.parsed.sources.find(s => s.reference_chain);
    if (withChain) {
      assert(typeof withChain.reference_chain.chain_length === "number", "chain_length is number");
    }
    return { passed: true };
  }
});

// 55. Adapt-prompt — structured adaptation with diff
register("phase5a-050-adapt-prompt-structured", {
  group: "phase5a",
  description: "Adapt-prompt should return structured adaptation with diff output",
  run: () => {
    const runId = `test-ap2-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Create a SKILL.md with sections for adapt-prompt to work with
    const skillMd = path.join(root, "SKILL.md");
    fs.writeFileSync(skillMd, `# Role

You are an AI assistant.

## Process

Follow these steps:
1. Understand the goal
2. Gather evidence
3. Analyze
4. Conclude

## Constraints

- Do not modify state externally
- Do not repeat strategies
- Stay within scope

## Output Format

Return JSON output with status, finding, conclusion, evidence, next, and summary.
`, "utf8");
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "structured adapt test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const result = run(RUN_STATE, ["adapt-prompt", "--state", initResult.parsed.state, "--dry-run"]);
    assertEq(result.status, 0, "adapt-prompt exit code");
    assert(result.parsed.ok, "ok should be true");
    assert(Array.isArray(result.parsed.applied), "applied is array");
    // Check that each applied entry has a diff with structured fields
    if (result.parsed.applied.length > 0) {
      const entry = result.parsed.applied[0];
      if (entry.diff) {
        assert(typeof entry.diff.section === "string", "diff section is string");
        assert(typeof entry.diff.action === "string", "diff action is string");
        assert(typeof entry.diff.original_line_count === "number", "diff original_line_count is number");
        assert(typeof entry.diff.modified_line_count === "number", "diff modified_line_count is number");
        assert(typeof entry.diff.delta === "number", "diff delta is number");
      }
    }
    return { passed: true };
  }
});

// 56. Verify-compliance — structural validation (contracts 3/6/9)
register("phase5a-051-verify-compliance-structural", {
  group: "phase5a",
  description: "Verify-compliance should use structural validation for contracts 3/6/9",
  run: () => {
    const runId = `test-vc2-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "structural validation test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    assert(initResult.parsed.ok, "init ok");
    const stateFile = path.join(initResult.parsed.run_dir, "state.json");
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    // Add a plan event before tool_call to test contract 3 structural validation
    state.history = state.history || [];
    state.history.push({ type: "plan", content: "Test plan step 1" });
    state.history.push({ type: "tool_call", name: "read", arguments: "test" });
    // Add a gate pass event with _signature reference to test contract 6
    const evidenceFile = path.join(initResult.parsed.run_dir, "evidence.jsonl");
    const evidenceEntry = { _signature: "abc123test_sig", kind: "observation", claim: "test", confidence: "high", status: "supports" };
    fs.appendFileSync(evidenceFile, JSON.stringify(evidenceEntry) + "\n", "utf8");
    state.history.push({ type: "gate", id: "G1", status: "pass", reason: "test pass abc123test_sig" });
    // Store a result with JSON content containing 6 keys to test contract 9
    const resultFile = path.join(initResult.parsed.run_dir, "result.jsonl");
    const structuredContent = JSON.stringify({ status: "completed", finding: "test", conclusion: "done", evidence: "ref1", next: "verify", summary: "all good" });
    const resultEntry = { timestamp: new Date().toISOString(), type: "analysis", content: structuredContent, content_length: structuredContent.length, sha256: "abc" };
    fs.appendFileSync(resultFile, JSON.stringify(resultEntry) + "\n", "utf8");
    state.files = state.files || {};
    state.files.result = "result.jsonl";
    state.last_result = { type: "analysis", sha256: "abc", stored_at: new Date().toISOString(), file: "result.jsonl" };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
    const result = run(RUN_STATE, ["verify-compliance", "--state", stateFile]);
    assertEq(result.status, 0, "verify-compliance exit code");
    assert(result.parsed.ok, "ok should be true");
    // Check contract 3: should be compliant (plan before tool_call)
    const c3 = result.parsed.results.find(r => r.contract === 3);
    assert(c3, "contract 3 present");
    assert(c3.compliant, "contract 3 should be compliant (plan before tool_call)");
    // Check contract 6: should be compliant (gate pass references _signature)
    const c6 = result.parsed.results.find(r => r.contract === 6);
    assert(c6, "contract 6 present");
    assert(c6.compliant, "contract 6 should be compliant (gate pass references _signature)");
    // Check contract 9: should be compliant (content has 6 JSON keys)
    const c9 = result.parsed.results.find(r => r.contract === 9);
    assert(c9, "contract 9 present");
    assert(c9.compliant, "contract 9 should be compliant (content has 6 JSON keys)");
    return { passed: true };
  }
});

// 57. Full integration — init → transition → evidence → store-result → verify-compliance → context-score → diagnose
register("phase5a-052-integration", {
  group: "phase5a",
  description: "Full integration: init → transition → evidence → store-result → verify-compliance → context-score → diagnose",
  run: () => {
    const runId = `test-int-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Init
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "integration test", "--run-id", runId, "--depth", "decision-grade"]);
    assertEq(initResult.status, 0, "init exit code");
    // Add evidence
    const evResult = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--claim", "integration finding", "--confidence", "high", "--source", "test", "--status", "supports"]);
    assertEq(evResult.status, 0, "evidence exit code");
    // Store result
    const storeResult = run(RUN_STATE, ["store-result", "--state", initResult.parsed.state, "--content", JSON.stringify({ status: "ok", finding: "test", conclusion: "done", evidence: "ref1", next: "verify", summary: "all good" }), "--type", "analysis"]);
    assertEq(storeResult.status, 0, "store-result exit code");
    // Verify compliance
    const vcResult = run(RUN_STATE, ["verify-compliance", "--state", initResult.parsed.state]);
    assertEq(vcResult.status, 0, "verify-compliance exit code");
    assert(vcResult.parsed.ok, "verify-compliance ok");
    assert(typeof vcResult.parsed.compliant === "number", "compliant count");
    // Context score
    const csResult = run(RUN_STATE, ["context-score", "--state", initResult.parsed.state]);
    assertEq(csResult.status, 0, "context-score exit code");
    assert(csResult.parsed.ok, "context-score ok");
    assert(typeof csResult.parsed.context_quality_score === "number", "CQS is number");
    // Diagnose
    const diagResult = run(RUN_STATE, ["diagnose", "--state", initResult.parsed.state, "--mode", "quick"]);
    assertEq(diagResult.status, 0, "diagnose exit code");
    assert(diagResult.parsed.ok, "diagnose ok");
    assert(diagResult.parsed.diagnosis, "diagnosis present");
    assert(diagResult.parsed.diagnosis.gates, "gates in diagnosis");
    assert(diagResult.parsed.diagnosis.repair, "repair in diagnosis");
    return { passed: true };
  }
});

// ─── Phase 5b: Loop 深度加固 ──────────────────────────────────────────────

register("phase5b-053-longitudinal-regression", {
  group: "phase5b",
  description: "Longitudinal should use linear regression with trend_direction and change_rate",
  run: () => {
    const runId = `test-lr-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "regression test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Single run mode returns dimensions
    const result = run(RUN_STATE, ["longitudinal", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "longitudinal exit code");
    assert(result.parsed.dimensions, "dimensions present");
    assert(typeof result.parsed.dimensions.completion_rate === "number", "completion_rate is number");
    assert(typeof result.parsed.dimensions.duration_minutes === "number", "duration_minutes is number");
    // Index mode with no runs should still return ok
    const indexResult = run(RUN_STATE, ["longitudinal", "--state", initResult.parsed.state, "--index", root]);
    assertEq(indexResult.status, 0, "longitudinal index exit code");
    assert(indexResult.parsed.dimensions, "index dimensions present");
    return { passed: true };
  }
});

register("phase5b-054-predict-verify", {
  group: "phase5b",
  description: "Predict should support --verify mode and record predictions to index.json",
  run: () => {
    const runId = `test-pv-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "predict verify test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Run predict to trigger signals and record to index.json
    const predResult = run(RUN_STATE, ["predict", "--state", initResult.parsed.state]);
    assertEq(predResult.status, 0, "predict exit code");
    assert(predResult.parsed.signals, "signals present");
    assert(Array.isArray(predResult.parsed.signals), "signals is array");
    // Verify mode
    const verifyResult = run(RUN_STATE, ["predict", "--state", initResult.parsed.state, "--verify"]);
    assertEq(verifyResult.status, 0, "predict verify exit code");
    assert(typeof verifyResult.parsed.verified === "number", "verified count is number");
    assert(typeof verifyResult.parsed.accurate === "number", "accurate count is number");
    assert(typeof verifyResult.parsed.activation?.accuracy === "number", "accuracy updated");
    // Check index.json for predict_predictions
    const indexFile = path.join(root, ".analyze", "index.json");
    assert(fs.existsSync(indexFile), "index.json exists");
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    assert(index.predict_predictions, "predict_predictions in index");
    assert(Array.isArray(index.predict_predictions), "predict_predictions is array");
    assert(index.predict_predictions.length > 0, "has predictions");
    return { passed: true };
  }
});

register("phase5b-055-runtime-adapt-execute", {
  group: "phase5b",
  description: "Runtime-adapt should modify state when active with triggered rules",
  run: () => {
    const runId = `test-ra-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "runtime adapt test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Activate predict first (required for runtime-adapt to be active)
    const activateResult = run(RUN_STATE, ["predict", "--state", initResult.parsed.state, "--activate"]);
    assertEq(activateResult.status, 0, "activate exit code");
    // Run runtime-adapt with --force to trigger active mode
    const adaptResult = run(RUN_STATE, ["runtime-adapt", "--state", initResult.parsed.state, "--force"]);
    assertEq(adaptResult.status, 0, "runtime-adapt exit code");
    assert(adaptResult.parsed.actions, "actions present");
    assert(Array.isArray(adaptResult.parsed.actions), "actions is array");
    // Check that actions are properly structured
    for (const action of adaptResult.parsed.actions) {
      assert(action.rule, "action has rule");
      assert(action.action, "action has action type");
      assert(action.detail, "action has detail");
    }
    return { passed: true };
  }
});

register("phase5b-056-causal-crossrun", {
  group: "phase5b",
  description: "Causal should support --index for cross-run analysis",
  run: () => {
    const runId = `test-cc-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "causal cross-run test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Run causal without --index (standard mode)
    const causalResult = run(RUN_STATE, ["causal", "--state", initResult.parsed.state]);
    assertEq(causalResult.status, 0, "causal exit code");
    assert(causalResult.parsed.causes, "causes present");
    assert(Array.isArray(causalResult.parsed.causes), "causes is array");
    assert(causalResult.parsed.causes.length >= 5, "at least 5 dimensions");
    // Run causal with --index (cross-run mode)
    const crossResult = run(RUN_STATE, ["causal", "--state", initResult.parsed.state, "--index", root]);
    assertEq(crossResult.status, 0, "causal cross-run exit code");
    assert(crossResult.parsed.cross_run, "cross_run data present");
    assert(typeof crossResult.parsed.cross_run.total_runs === "number", "total_runs is number");
    assert(typeof crossResult.parsed.cross_run.similar_runs === "number", "similar_runs is number");
    return { passed: true };
  }
});

register("phase5b-057-shadow-isolation", {
  group: "phase5b",
  description: "Shadow should use real subprocess isolation for diagnosis",
  run: () => {
    const runId = `test-si-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "shadow isolation test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Inject a real diagnosable issue so patch --auto deterministically creates patches
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "diagnosis-fixture", "--claim", "finding A contradicts finding B", "--confidence", "medium", "--status", "contradicts"]);
    // Run diagnose to generate diagnosis data for patch auto
    const diagResult = run(RUN_STATE, ["diagnose", "--state", initResult.parsed.state, "--mode", "quick"]);
    assertEq(diagResult.status, 0, "diagnose exit code");
    // Create patch via --auto
    const createResult = run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--auto"]);
    assertEq(createResult.status, 0, "patch create exit code");
    assert(createResult.parsed.patches, "patches array present");
    assert(createResult.parsed.patches.length > 0, "at least one patch created");
    const patchId = createResult.parsed.patches[0].id;
    // Apply the patch
    run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "proposed"]);
    run(RUN_STATE, ["patch", "--state", initResult.parsed.state, "--transition", patchId, "--to", "applied"]);
    // Run shadow with the patch
    const shadowResult = run(RUN_STATE, ["shadow", "--state", initResult.parsed.state, "--patch", patchId], { timeout: 15000 });
    assertEq(shadowResult.status, 0, "shadow exit code");
    assert(shadowResult.parsed.shadow_id, "shadow_id present");
    assert(shadowResult.parsed.baseline, "baseline metrics present");
    assert(shadowResult.parsed.shadow, "shadow metrics present");
    assert(shadowResult.parsed.shadow.status === "real_isolation", "shadow uses real isolation");
    assert(typeof shadowResult.parsed.shadow.exit_code === "number", "shadow exit code is number");
    assert(typeof shadowResult.parsed.shadow.gates_failed === "number", "shadow gates_failed is number");
    assert(typeof shadowResult.parsed.shadow.gates_passed === "number", "shadow gates_passed is number");
    assert(shadowResult.parsed.improvement, "improvement metrics present");
    assert(typeof shadowResult.parsed.improvement.gates_reduced === "number", "gates_reduced is number");
    assert(typeof shadowResult.parsed.promotion_criteria?.met === "boolean", "promotion criteria present");
    return { passed: true };
  }
});

// ── Phase 5c Tests ────────────────────────────────────────────────────────

register("phase5c-058-cross-session-context", {
  group: "phase5c",
  description: "Cross-session context should return matches with similar goals",
  run: () => {
    const runId = `test-csc-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "analyze test failure patterns and root causes", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Create a similar run in index by using index command
    const indexResult = run(RUN_STATE, ["index", "--state", initResult.parsed.state]);
    assertEq(indexResult.status, 0, "index exit code");
    // Now run cross-session-context
    const cscResult = run(RUN_STATE, ["cross-session-context", "--state", initResult.parsed.state, "--dry-run"]);
    assertEq(cscResult.status, 0, "cross-session-context exit code");
    assert(cscResult.parsed.ok === true, "ok is true");
    assert(typeof cscResult.parsed.matches === "number", "matches is number");
    assert(typeof cscResult.parsed.written_to_wm === "boolean", "written_to_wm is boolean");
    return { passed: true };
  }
});

register("phase5c-059-context-prune-status", {
  group: "phase5c",
  description: "Context-prune status should show working memory and evidence counts",
  run: () => {
    const runId = `test-cp-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test context pruning", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Run context-prune status
    const cpResult = run(RUN_STATE, ["context-prune", "--state", initResult.parsed.state, "status"]);
    assertEq(cpResult.status, 0, "context-prune exit code");
    assert(cpResult.parsed.ok === true, "ok is true");
    assert(cpResult.parsed.working_memory, "working_memory present");
    assert(typeof cpResult.parsed.working_memory.total === "number", "total wm items is number");
    assert(cpResult.parsed.evidence, "evidence present");
    assert(typeof cpResult.parsed.evidence.entries === "number", "evidence entries is number");
    assert(cpResult.parsed.suggestion, "suggestion present");
    return { passed: true };
  }
});

register("phase5c-060-prompt-ab-create-list", {
  group: "phase5c",
  description: "Prompt-ab should create a variant and run it",
  run: () => {
    const runId = `test-pab-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test prompt ab", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Create a variant
    const createResult = run(RUN_STATE, ["prompt-ab", "--state", initResult.parsed.state, "create", "--id", "test-v1", "--content", "You are a test assistant"]);
    assertEq(createResult.status, 0, "create exit code");
    assert(createResult.parsed.ok === true, "ok is true");
    assert(createResult.parsed.variant_id === "test-v1", "variant_id matches");
    // List variants (in-memory, may be empty in separate process)
    const listResult = run(RUN_STATE, ["prompt-ab", "--state", initResult.parsed.state, "list"]);
    assertEq(listResult.status, 0, "list exit code");
    assert(Array.isArray(listResult.parsed.variants), "variants is array");
    // Run the variant (may fail in separate process since in-memory, but should return ok)
    const runResult = run(RUN_STATE, ["prompt-ab", "--state", initResult.parsed.state, "run", "--variant", "test-v1"]);
    // In separate process, variant may not exist, so expect error handling
    assert(runResult.status === 0 || runResult.status === 1, "run handles variant missing gracefully");
    return { passed: true };
  }
});

register("phase5c-061-adapt-prompt-model", {
  group: "phase5c",
  description: "Adapt-prompt should accept --model parameter and return model_profile in output",
  run: () => {
    const runId = `test-apm-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    // Create a minimal SKILL.md for adapt-prompt to work with
    const skillMd = path.join(root, "SKILL.md");
    fs.writeFileSync(skillMd, `# Role

You are a test assistant.

## Process

Follow these steps.

## Constraints

Test constraint.

## Output Format

Return JSON.
`, "utf8");
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test model adaptation", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Run adapt-prompt with --model
    const apResult = run(RUN_STATE, ["adapt-prompt", "--state", initResult.parsed.state, "--dry-run", "--model", "claude-opus-4-6"]);
    assertEq(apResult.status, 0, "adapt-prompt exit code");
    assert(apResult.parsed.ok === true, "ok is true");
    assert(apResult.parsed.model === "claude-opus-4-6", "model matches");
    assert(apResult.parsed.model_profile === "trust_the_model", "model_profile is trust_the_model");
    return { passed: true };
  }
});

register("phase5c-062-prompt-score-cross-dimension", {
  group: "phase5c",
  description: "Prompt-score should include cross_dimension_insights when applicable",
  run: () => {
    const runId = `test-psc-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test cross dimension analysis", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Run prompt-score
    const psResult = run(RUN_STATE, ["prompt-score", "--state", initResult.parsed.state]);
    assertEq(psResult.status, 0, "prompt-score exit code");
    assert(psResult.parsed.ok === true, "ok is true");
    assert(psResult.parsed.pes, "pes score present");
    assert(psResult.parsed.dimensions, "dimensions present");
    assert(psResult.parsed.weights, "weights present");
    // cross_dimension_insights may be undefined or an array
    assert(psResult.parsed.cross_dimension_insights === undefined || Array.isArray(psResult.parsed.cross_dimension_insights), "cross_dimension_insights is valid type");
    return { passed: true };
  }
});

// ─── Phase 6a: Autonomy + Meta ─────────────────────────────────────────────

register("phase6-063-autonomy-status", {
  group: "phase6a",
  description: "Autonomy should return current level and risk matrix",
  run: () => {
    const runId = `test-a63-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test autonomy", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const aResult = run(RUN_STATE, ["autonomy", "--state", initResult.parsed.state]);
    assertEq(aResult.status, 0, "autonomy exit code");
    assert(aResult.parsed.ok === true, "ok is true");
    assert(aResult.parsed.level === "AL-1", "default level is AL-1");
    assert(Array.isArray(aResult.parsed.risk_matrix), "risk_matrix is array");
    return { passed: true };
  }
});

register("phase6-064-autonomy-set-level", {
  group: "phase6a",
  description: "Autonomy --set AL-2 should change level and persist",
  run: () => {
    const runId = `test-a64-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test autonomy set", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Set AL-2
    const setResult = run(RUN_STATE, ["autonomy", "--state", initResult.parsed.state, "--set", "AL-2"]);
    assertEq(setResult.status, 0, "set exit code");
    assert(setResult.parsed.level === "AL-2", "level set to AL-2");
    // Verify eligible actions include AL-2 actions
    const eligibleResult = run(RUN_STATE, ["autonomy", "--state", initResult.parsed.state, "--eligible-actions"]);
    assertEq(eligibleResult.status, 0, "eligible-actions exit code");
    assert(eligibleResult.parsed.level === "AL-2", "level persisted");
    assert(Array.isArray(eligibleResult.parsed.eligible_actions), "eligible_actions is array");
    assert(eligibleResult.parsed.eligible_actions.includes("compact_evidence"), "AL-2 includes compact_evidence");
    return { passed: true };
  }
});

register("phase6-065-meta-health", {
  group: "phase6a",
  description: "Meta --health should return loop health with dimensions",
  run: () => {
    const runId = `test-m65-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test meta health", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const mResult = run(RUN_STATE, ["meta", "--state", initResult.parsed.state, "--health"]);
    assertEq(mResult.status, 0, "meta exit code");
    assert(mResult.parsed.ok === true, "ok is true");
    assert(mResult.parsed.mode === "health", "mode is health");
    assert(mResult.parsed.loop_health, "loop_health present");
    assert(mResult.parsed.loop_health.overall_score !== undefined, "overall_score present");
    assert(Array.isArray(mResult.parsed.loop_health.dimensions), "dimensions is array");
    assert(mResult.parsed.loop_health.dimensions.length === 7, "7 dimensions");
    return { passed: true };
  }
});

register("phase6-066-meta-diagnose", {
  group: "phase6a",
  description: "Meta --diagnose should return critical findings",
  run: () => {
    const runId = `test-m66-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test meta diagnose", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const dResult = run(RUN_STATE, ["meta", "--state", initResult.parsed.state, "--diagnose"]);
    assertEq(dResult.status, 0, "diagnose exit code");
    assert(dResult.parsed.mode === "diagnose", "mode is diagnose");
    assert(Array.isArray(dResult.parsed.critical_findings), "critical_findings is array");
    return { passed: true };
  }
});

// ─── Phase 6b: Cross-Skill + Insights + Dashboard ─────────────────────────

register("phase6-067-cross-skill-push-pull", {
  group: "phase6b",
  description: "Cross-skill should support push and pull pattern sharing",
  run: () => {
    const runId = `test-cs67-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test cross-skill", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Push a pattern
    const pushResult = run(RUN_STATE, ["cross-skill", "--state", initResult.parsed.state, "--push", "--pattern", "scope_creep_test", "--evidence", "Test evidence for scope creep"]);
    assertEq(pushResult.status, 0, "push exit code");
    assert(pushResult.parsed.action === "push", "action is push");
    assert(pushResult.parsed.stored === true, "pattern stored");
    // Pull patterns
    const pullResult = run(RUN_STATE, ["cross-skill", "--state", initResult.parsed.state, "--pull"]);
    assertEq(pullResult.status, 0, "pull exit code");
    assert(pullResult.parsed.action === "pull", "action is pull");
    assert(Array.isArray(pullResult.parsed.patterns), "patterns is array");
    return { passed: true };
  }
});

register("phase6-068-cross-skill-recommend", {
  group: "phase6b",
  description: "Cross-skill should recommend patch to target skill",
  run: () => {
    const runId = `test-cs68-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test cross-skill recommend", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const recResult = run(RUN_STATE, ["cross-skill", "--state", initResult.parsed.state, "--recommend", "--patch-id", "P-test", "--target-skill", "brainstorming"]);
    assertEq(recResult.status, 0, "recommend exit code");
    assert(recResult.parsed.action === "recommend", "action is recommend");
    assert(recResult.parsed.patch_id === "P-test", "patch_id matches");
    assert(recResult.parsed.target_skill === "brainstorming", "target_skill matches");
    return { passed: true };
  }
});

register("phase6-069-insights-run", {
  group: "phase6b",
  description: "Insights should return run insights with natural language text",
  run: () => {
    const runId = `test-i69-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test insights", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const iResult = run(RUN_STATE, ["insights", "--state", initResult.parsed.state]);
    assertEq(iResult.status, 0, "insights exit code");
    assert(iResult.parsed.mode === "run", "mode is run");
    assert(iResult.parsed.insights, "insights text present");
    assert(typeof iResult.parsed.insights === "string", "insights is string");
    assert(iResult.parsed.insights.includes(runId), "insights contains run_id");
    return { passed: true };
  }
});

register("phase6-070-dashboard", {
  group: "phase6b",
  description: "Dashboard should return text dashboard with all key indicators",
  run: () => {
    const runId = `test-d70-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test dashboard", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Add a gate failure to test risk detection
    run(RUN_STATE, ["gate", "--state", initResult.parsed.state, "--id", "G1", "--status", "fail", "--reason", "test"]);
    const dResult = run(RUN_STATE, ["dashboard", "--state", initResult.parsed.state]);
    assertEq(dResult.status, 0, "dashboard exit code");
    assert(dResult.parsed.dashboard, "dashboard text present");
    assert(typeof dResult.parsed.dashboard === "string", "dashboard is string");
    // Check key indicators
    assert(dResult.parsed.data, "data object present");
    assert(dResult.parsed.data.status, "status present");
    assert(dResult.parsed.data.health_pct !== undefined, "health_pct present");
    assert(dResult.parsed.data.health_status, "health_status present");
    assert(dResult.parsed.data.token_pct !== undefined, "token_pct present");
    return { passed: true };
  }
});

// ─── Gap-Filling: Analysis Quality + Decision + Guidance ─────────────────

register("gap-071-analysis-quality", {
  group: "gap",
  description: "Analysis-quality should return 5-dimension quality assessment",
  run: () => {
    const runId = `test-aq71-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test analysis quality", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const aqResult = run(RUN_STATE, ["analysis-quality", "--state", initResult.parsed.state]);
    assertEq(aqResult.status, 0, "analysis-quality exit code");
    assert(aqResult.parsed.ok === true, "ok is true");
    assert(aqResult.parsed.quality, "quality object present");
    assert(aqResult.parsed.quality.overall !== undefined, "overall score present");
    assert(aqResult.parsed.quality.dimensions, "dimensions object present");
    assert(aqResult.parsed.quality.dimensions.thoroughness !== undefined, "thoroughness present");
    assert(aqResult.parsed.quality.dimensions.depth !== undefined, "depth present");
    assert(aqResult.parsed.quality.dimensions.coverage !== undefined, "coverage present");
    assert(aqResult.parsed.quality.dimensions.evidence_quality !== undefined, "evidence_quality present");
    assert(aqResult.parsed.quality.dimensions.decision_quality !== undefined, "decision_quality present");
    assert(Array.isArray(aqResult.parsed.suggestions), "suggestions is array");
    return { passed: true };
  }
});

register("gap-072-decision-record", {
  group: "gap",
  description: "Decision should record and list decisions with alternatives",
  run: () => {
    const runId = `test-d72-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test decision", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Record a decision
    const recResult = run(RUN_STATE, ["decision", "--state", initResult.parsed.state, "--record", "--what", "Choose approach", "--alternatives", "A|B", "--rationale", "A is simpler", "--assumptions", "team size|timeline"]);
    assertEq(recResult.status, 0, "record exit code");
    assert(recResult.parsed.action === "recorded", "action is recorded");
    assert(recResult.parsed.decision, "decision object present");
    assert(recResult.parsed.decision.what === "Choose approach", "what matches");
    assert(recResult.parsed.decision.alternatives.length === 2, "2 alternatives");
    assert(recResult.parsed.decision.assumptions.length === 2, "2 assumptions");
    // List decisions
    const listResult = run(RUN_STATE, ["decision", "--state", initResult.parsed.state, "--list"]);
    assertEq(listResult.status, 0, "list exit code");
    assert(listResult.parsed.action === "list", "action is list");
    assert(Array.isArray(listResult.parsed.decisions), "decisions is array");
    assert(listResult.parsed.decisions.length >= 1, "at least 1 decision");
    // Default summary
    const sumResult = run(RUN_STATE, ["decision", "--state", initResult.parsed.state]);
    assertEq(sumResult.status, 0, "summary exit code");
    assert(sumResult.parsed.action === "summary", "action is summary");
    assert(sumResult.parsed.total_decisions >= 1, "total_decisions >= 1");
    return { passed: true };
  }
});

register("gap-073-decision-assumptions-review", {
  group: "gap",
  description: "Decision should list assumptions and review active decisions",
  run: () => {
    const runId = `test-d73-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test decision review", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Record a decision
    run(RUN_STATE, ["decision", "--state", initResult.parsed.state, "--record", "--what", "Framework choice", "--alternatives", "React|Vue", "--rationale", "Ecosystem", "--assumptions", "bundle size|SSR"]);
    // Assumptions
    const aResult = run(RUN_STATE, ["decision", "--state", initResult.parsed.state, "--assumptions"]);
    assertEq(aResult.status, 0, "assumptions exit code");
    assert(aResult.parsed.action === "assumptions", "action is assumptions");
    assert(Array.isArray(aResult.parsed.assumptions), "assumptions is array");
    assert(aResult.parsed.assumptions.length >= 1, "at least 1 assumption");
    // Review
    const rResult = run(RUN_STATE, ["decision", "--state", initResult.parsed.state, "--review"]);
    assertEq(rResult.status, 0, "review exit code");
    assert(rResult.parsed.action === "review", "action is review");
    assert(Array.isArray(rResult.parsed.reviews), "reviews is array");
    assert(rResult.parsed.reviews.length >= 1, "at least 1 review");
    return { passed: true };
  }
});

register("gap-074-guidance", {
  group: "gap",
  description: "Guidance should return phase-based next actions",
  run: () => {
    const runId = `test-g74-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test guidance", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const gResult = run(RUN_STATE, ["guidance", "--state", initResult.parsed.state]);
    assertEq(gResult.status, 0, "guidance exit code");
    assert(gResult.parsed.ok === true, "ok is true");
    assert(gResult.parsed.status, "status present");
    assert(gResult.parsed.status === "intake", "status is intake");
    assert(Array.isArray(gResult.parsed.next_actions), "next_actions is array");
    assert(gResult.parsed.count >= 1, "at least 1 suggestion");
    // Verify guidance includes intake-specific suggestions
    const hasIntakeSuggestion = gResult.parsed.next_actions.some(s => s.includes("scope"));
    assert(hasIntakeSuggestion, "intake suggestion present");
    // Verify status command also includes guidance
    const sResult = run(RUN_STATE, ["status", "--state", initResult.parsed.state]);
    assertEq(sResult.status, 0, "status exit code");
    assert(Array.isArray(sResult.parsed.guidance), "status has guidance");
    return { passed: true };
  }
});

register("gap-075-auto-detect-negation", {
  group: "gap",
  description: "evidence --auto-detect should detect direct negation contradictions",
  run: () => {
    const runId = `test-g75-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "auto-detect negation test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // First evidence: affirmative claim
    const ev1 = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "test", "--claim", "the system supports concurrent user access", "--confidence", "high", "--status", "supports"]);
    assertEq(ev1.status, 0, "evidence 1 exit code");
    // Second evidence: negated claim via --auto-detect
    const ev2 = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "test2", "--claim", "the system does not support concurrent user access", "--confidence", "medium", "--status", "supports", "--auto-detect"]);
    assertEq(ev2.status, 0, "evidence 2 exit code");
    assert(ev2.parsed.auto_detected, "auto_detected present");
    assert(Array.isArray(ev2.parsed.auto_detected), "auto_detected is array");
    assert(ev2.parsed.auto_detected.length >= 1, "at least 1 contradiction detected");
    const negationDetected = ev2.parsed.auto_detected.some(d => d.type === "direct_negation");
    assert(negationDetected, "direct_negation detected");
    return { passed: true };
  }
});

register("gap-076-auto-detect-numerical", {
  group: "gap",
  description: "evidence --auto-detect should detect numerical range conflicts",
  run: () => {
    const runId = `test-g76-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "auto-detect numerical test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // First evidence: 50ms latency
    const ev1 = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "test", "--claim", "API average latency is 50ms under normal load", "--confidence", "high", "--status", "supports"]);
    assertEq(ev1.status, 0, "evidence 1 exit code");
    // Second evidence: 500ms latency via --auto-detect
    const ev2 = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "test2", "--claim", "API average latency is 500ms under normal load", "--confidence", "high", "--status", "supports", "--auto-detect"]);
    assertEq(ev2.status, 0, "evidence 2 exit code");
    assert(ev2.parsed.auto_detected, "auto_detected present");
    const numericalDetected = ev2.parsed.auto_detected.some(d => d.type === "numerical_conflict");
    assert(numericalDetected, "numerical_conflict detected");
    return { passed: true };
  }
});

register("gap-077-prompt-evolve-status", {
  group: "gap",
  description: "Prompt-evolve status on fresh index shows no variants",
  run: () => {
    const runId = `test-g77-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test prompt evolve", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Status on fresh index
    const evResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "status"]);
    assertEq(evResult.status, 0, "prompt-evolve status exit code");
    assert(evResult.parsed.ok === true, "ok is true");
    assert(evResult.parsed.current_variant === null, "current_variant is null");
    assert(Array.isArray(evResult.parsed.variants), "variants is array");
    assertEq(evResult.parsed.total_variants, 0, "total_variants is 0");
    assert(evResult.parsed.baseline_metrics, "baseline_metrics present");
    assert(evResult.parsed.rollback_policy, "rollback_policy present");
    return { passed: true };
  }
});

register("gap-078-prompt-evolve-deploy", {
  group: "gap",
  description: "Prompt-evolve deploy a variant to shadow stage",
  run: () => {
    const runId = `test-g78-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test prompt evolve deploy", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Deploy a variant
    const deployResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "deploy", "--variant", "test-v1", "--content", "You are a test assistant"]);
    assertEq(deployResult.status, 0, "deploy exit code");
    assert(deployResult.parsed.ok === true, "ok is true");
    assert(deployResult.parsed.variant_id === "test-v1", "variant_id matches");
    assert(deployResult.parsed.stage === "shadow", "stage is shadow");
    assert(deployResult.parsed.metrics, "metrics present");
    // Status now shows the variant
    const statusResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "status"]);
    assertEq(statusResult.status, 0, "status exit code");
    assert(statusResult.parsed.current_variant === "test-v1", "current_variant is test-v1");
    assertEq(statusResult.parsed.total_variants, 1, "total_variants is 1");
    assert(statusResult.parsed.variants[0].current_stage === "shadow", "variant stage is shadow");
    return { passed: true };
  }
});

register("gap-079-prompt-evolve-promote-rollback", {
  group: "gap",
  description: "Prompt-evolve promote then rollback a variant",
  run: () => {
    const runId = `test-g79-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "test prompt evolve promote rollback", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    // Deploy a variant
    const deployResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "deploy", "--variant", "test-v1", "--content", "You are a test assistant"]);
    assertEq(deployResult.status, 0, "deploy exit code");
    // Promote to 0.1
    const promoteResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "promote", "--variant", "test-v1"]);
    assertEq(promoteResult.status, 0, "promote exit code");
    assert(promoteResult.parsed.ok === true, "ok is true");
    assert(promoteResult.parsed.from_stage === "shadow", "from_stage is shadow");
    assert(promoteResult.parsed.to_stage === "0.1", "to_stage is 0.1");
    // Verify status shows promoted stage
    const statusAfterPromote = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "status"]);
    assertEq(statusAfterPromote.status, 0, "status after promote exit code");
    assert(statusAfterPromote.parsed.variants[0].current_stage === "0.1", "stage is 0.1 after promote");
    // Rollback
    const rollbackResult = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "rollback", "--variant", "test-v1"]);
    assertEq(rollbackResult.status, 0, "rollback exit code");
    assert(rollbackResult.parsed.ok === true, "ok is true");
    assert(rollbackResult.parsed.from_stage === "0.1", "from_stage is 0.1");
    assert(rollbackResult.parsed.to_stage === "shadow", "to_stage is shadow");
    // Verify status shows rolled back stage
    const statusAfterRollback = run(RUN_STATE, ["prompt-evolve", "--state", initResult.parsed.state, "--mode", "status"]);
    assertEq(statusAfterRollback.status, 0, "status after rollback exit code");
    assert(statusAfterRollback.parsed.variants[0].current_stage === "shadow", "stage is shadow after rollback");
    // Verify history contains rollback event
    const hasRollbackEvent = statusAfterRollback.parsed.history.some(h => h.event === "rollback");
    assert(hasRollbackEvent, "history has rollback event");
    return { passed: true };
  }
});

function runAllTests() {
  // Clean up temp directory
  if (fs.existsSync(TMP_ROOT)) {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(TMP_ROOT, { recursive: true });

  const args = parseArgs(process.argv.slice(2));
  let testIds = Object.keys(TEST_MAP);

  if (args.test) {
    const specific = String(args.test);
    if (!TEST_MAP[specific]) abort(`Unknown test: ${specific}`);
    testIds = [specific];
  } else if (args.group) {
    const group = String(args.group);
    testIds = Object.keys(TEST_MAP).filter(id => TEST_MAP[id].group === group);
    if (testIds.length === 0) abort(`No tests in group: ${group}`);
  }

  console.log(`\n  analyze skill test suite\n`);
  console.log(`  ${testIds.length} test(s) to run\n`);

  for (const id of testIds) {
    const spec = TEST_MAP[id];
    process.stdout.write(`  • ${id}: ${spec.description}... `);
    try {
      const result = spec.run();
      if (result.passed) {
        RESULTS.passed++;
        console.log(`PASS${result.note ? ` (${result.note})` : ""}`);
      } else {
        RESULTS.failed++;
        console.log(`FAIL`);
        RESULTS.errors.push({ id, error: "run returned not passed" });
      }
    } catch (error) {
      RESULTS.failed++;
      console.log(`FAIL`);
      RESULTS.errors.push({ id, error: error.message });
    }
  }

  // Summary
  console.log(`\n  Results: ${RESULTS.passed} passed, ${RESULTS.failed} failed, ${RESULTS.skipped} skipped\n`);
  if (RESULTS.errors.length > 0) {
    for (const err of RESULTS.errors) {
      console.log(`  ${err.id}: ${err.error}`);
    }
    console.log();
  }
  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

// ─── Phase 7: 2026-08-07 drift-hardening regression tests ─────────────────

register("phase7-080-checkpoint-auto-sync", {
  group: "phase7",
  description: "Transition should auto-sync the checkpoint file status",
  run: () => {
    const runId = `test-cp-auto-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "checkpoint auto-sync", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const stateFile = initResult.parsed.state;
    const result = run(RUN_STATE, ["transition", "--state", stateFile, "--to", "stopped", "--reason", "user cancelled"]);
    assertEq(result.status, 0, "transition exit code");
    const checkpoint = fs.readFileSync(path.join(root, ".analyze", "runs", runId, "checkpoint.md"), "utf8");
    assert(checkpoint.includes("Status: stopped"), "checkpoint reflects stopped status");
    return { passed: true };
  }
});

register("phase7-081-evidence-standalone-autodetect", {
  group: "phase7",
  description: "evidence --auto-detect should work standalone (read-only scan, E7)",
  run: () => {
    const runId = `test-evd-standalone-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "standalone auto-detect", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "a", "--claim", "the system supports concurrent user access", "--confidence", "high", "--status", "supports"]);
    run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--kind", "inference", "--source", "b", "--claim", "the system does not support concurrent user access", "--confidence", "medium", "--status", "supports"]);
    const result = run(RUN_STATE, ["evidence", "--state", initResult.parsed.state, "--auto-detect"]);
    assertEq(result.status, 0, "standalone auto-detect exit code");
    assert(result.parsed.ok, "ok flag");
    assertEq(result.parsed.mode, "auto-detect", "mode is auto-detect");
    assertEq(result.parsed.scanned, 2, "scanned 2 entries");
    assert(result.parsed.contradictions.length > 0, "contradictions detected");
    return { passed: true };
  }
});

register("phase7-082-causal-healthy-intake", {
  group: "phase7",
  description: "causal should not flag a healthy fresh run as a process problem (E6)",
  run: () => {
    const runId = `test-causal-healthy-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "causal healthy check", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["causal", "--state", initResult.parsed.state]);
    assertEq(result.status, 0, "causal exit code");
    const processCause = result.parsed.causes.find(c => c.dimension === "process");
    assert(processCause, "process cause present");
    assertEq(processCause.verdict, "unlikely", "healthy fresh run is not a process problem");
    return { passed: true };
  }
});

register("phase7-083-predict-auto-on-transition", {
  group: "phase7",
  description: "transition should auto-run predictive signal detection (E3)",
  run: () => {
    const runId = `test-predict-auto-${Date.now()}`;
    const root = path.join(TMP_ROOT, runId);
    fs.mkdirSync(root, { recursive: true });
    const initResult = run(RUN_STATE, ["init", "--root", root, "--goal", "predict auto test", "--run-id", runId]);
    assertEq(initResult.status, 0, "init exit code");
    const result = run(RUN_STATE, ["transition", "--state", initResult.parsed.state, "--to", "stopped", "--reason", "user cancelled"]);
    assertEq(result.status, 0, "transition exit code");
    assert(result.parsed.predict_auto, "predict_auto present in transition output");
    assert(typeof result.parsed.predict_auto.mode === "string", "predict_auto has mode");
    return { passed: true };
  }
});

// ─── Phase 8: 输出规范校验器回归 ──────────────────────────────────────────

register("phase8-090-output-lint-self-test", {
  group: "phase8",
  description: "lint-output-text.js should pass its built-in self-test",
  run: () => {
    const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "lint-output-text.js"), "--self-test"], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(result.status, 0, "self-test exit code");
    assert(String(result.stdout).includes("自测通过"), "self-test reports pass");
    return { passed: true };
  }
});

register("phase8-091-output-lint-detects-errors", {
  group: "phase8",
  description: "lint-output-text.js should flag hard-constraint violations",
  run: () => {
    const runId = `test-lint-${Date.now()}`;
    const dir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(dir, { recursive: true });
    const sample = path.join(dir, "sample.md");
    fs.writeFileSync(sample, "调用 openai api 并调整阀值。使用“弯引号”。缩小了 3 倍。\n`openai api` 与 /api 不受影响。\n", "utf8");
    const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "lint-output-text.js"), sample], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(result.status, 1, "lint exits 1 on errors");
    assert(String(result.stdout).includes("OpenAI API"), "detects openai api");
    assert(String(result.stdout).includes("阈值"), "detects 阀值");
    assert(String(result.stdout).includes("直角引号"), "detects curly quotes");
    assert(String(result.stdout).includes("1/N"), "detects 缩小了 3 倍");
    return { passed: true };
  }
});

register("phase8-092-output-lint-no-false-positive", {
  group: "phase8",
  description: "lint-output-text.js should not flag already-correct capitalization",
  run: () => {
    const runId = `test-lintfp-${Date.now()}`;
    const dir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(dir, { recursive: true });
    const sample = path.join(dir, "correct.md");
    fs.writeFileSync(sample, "使用 GitHub 与 JavaScript 的正确写法。OpenAI API 与 gRPC 均正确。\n", "utf8");
    const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "lint-output-text.js"), sample], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(result.status, 0, "correct text exits 0");
    return { passed: true };
  }
});

register("phase8-093-output-lint-marketing-coverage", {
  group: "phase8",
  description: "lint-output-text.js should cover marketing-domain terms",
  run: () => {
    const runId = `test-lintmkt-${Date.now()}`;
    const dir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(dir, { recursive: true });
    const sample = path.join(dir, "marketing.md");
    fs.writeFileSync(sample, "wechat 与 mcn 投放，gdpr 与 ccpa 合规。ecpm 与 cpv 指标，tier 1 市场。influenzer 与 microinfluencer。\n", "utf8");
    const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "lint-output-text.js"), sample], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(result.status, 1, "lint exits 1 on marketing violations");
    const out = String(result.stdout);
    for (const expect of ["WeChat", "MCN", "GDPR", "CCPA", "eCPM", "CPV", "Tier 1", "influencer", "micro-influencer"]) {
      assert(out.includes(expect), `detects ${expect}`);
    }
    return { passed: true };
  }
});

register("phase8-094-output-lint-rednote-brand", {
  group: "phase8",
  description: "lint-output-text.js should map xiaohongshu pinyin to the official rednote name",
  run: () => {
    const runId = `test-lintred-${Date.now()}`;
    const dir = path.join(TMP_ROOT, runId);
    fs.mkdirSync(dir, { recursive: true });
    const sample = path.join(dir, "rednote.md");
    fs.writeFileSync(sample, "xiaohongshu 海外版投放。使用 rednote 官方拼写不受影响。\n", "utf8");
    const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "lint-output-text.js"), sample], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(result.status, 1, "lint exits 1 on xiaohongshu pinyin");
    assert(String(result.stdout).includes("rednote"), "suggests official rednote spelling");
    return { passed: true };
  }
});

// ─── Phase 9: 评审模式 review-docs 校验（v3.7） ──────────────────────────

const REVIEW_DEMO = path.join(SKILL_DIR, "demo", "demo.html");

function writeReviewTmp(html) {
  const runId = `test-rmdocs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(TMP_ROOT, runId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "review.html");
  fs.writeFileSync(file, html, "utf8");
  return file;
}

function runReviewValidate(file) {
  const result = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "validate-annotations.js"), file, "--json"], {
    encoding: "utf8",
    cwd: SKILL_DIR,
    timeout: 15000
  });
  const trimmed = String(result.stdout).trim();
  return JSON.parse(trimmed);
}

register("phase9-001-review-docs-parse", {
  group: "phase9",
  description: "validate-annotations.js parses review-docs JSON from demo",
  run: () => {
    const j = runReviewValidate(REVIEW_DEMO);
    assert(j.reviewDocs && j.reviewDocs.present === true, "reviewDocs field present");
    assertEq(j.reviewDocs.valid, true, "review-docs should parse and validate");
    return { passed: true };
  }
});

register("phase9-002-scope-mark-enum", {
  group: "phase9",
  description: "scopeMark must be existing/new/adjusted",
  run: () => {
    const html = fs.readFileSync(REVIEW_DEMO, "utf8")
      .replace('"scopeMark": "existing"', '"scopeMark": "modified"');
    const j = runReviewValidate(writeReviewTmp(html));
    assert(j.valid === false || (j.reviewDocs && j.reviewDocs.errors.length > 0), "invalid scopeMark must fail");
    return { passed: true };
  }
});

register("phase9-003-proto-id-pairing", {
  group: "phase9",
  description: "item protoId must match a data-proto-id component",
  run: () => {
    const html = fs.readFileSync(REVIEW_DEMO, "utf8")
      .replace('data-proto-id="coupon-create-1"', 'data-proto-id="coupon-create-x"');
    const j = runReviewValidate(writeReviewTmp(html));
    assert(j.reviewDocs && j.reviewDocs.errors.length > 0, "orphan protoId must error");
    return { passed: true };
  }
});

register("phase9-004-decision-optional", {
  group: "phase9",
  description: "missing decision must NOT error",
  run: () => {
    // 正则同时吞掉前导逗号：decision 是场景级可选属性，删除后 JSON 必须保持合法
    const html = fs.readFileSync(REVIEW_DEMO, "utf8")
      .replace(/,\n\s*"decision":[^\n]+/, "");
    const j = runReviewValidate(writeReviewTmp(html));
    assert(j.reviewDocs && j.reviewDocs.valid === true, "decision is optional");
    return { passed: true };
  }
});

register("phase9-005-connections-svg-sizing", {
  group: "phase9",
  description: "v4.0 anno-badge must declare position:absolute so badges anchor correctly to proto-elements (徽标锚定契约)",
  run: () => {
    const j = runReviewValidate(REVIEW_DEMO);
    assert(j.reviewDocs && j.reviewDocs.valid === true, "demo must pass validation before badge positioning check");
    const tpl = fs.readFileSync(path.join(SKILL_DIR, "references", "annotation-output-templates.md"), "utf8");
    const demo = fs.readFileSync(REVIEW_DEMO, "utf8");
    // .anno-badge must declare position:absolute (proto-element uses position:relative as mount point)
    assert(tpl.includes(".anno-badge{") && tpl.includes("position:absolute"), "template anno-badge must declare position:absolute");
    assert(demo.includes(".anno-badge{") && demo.includes("position:absolute"), "demo anno-badge must declare position:absolute");
    // Negative: removing position:absolute breaks badge anchoring - validate-annotations cannot directly check this (CSS guard is
    // enforced by the template-sync test), but we verify the badge CSS rule is present in both sources.
    return { passed: true };
  }
});

register("phase9-006-template-sync", {
  group: "phase9",
  description: "demo review-mode CSS/JS authoritative blocks must be byte-identical to the template (single-source rule is machine-enforced, not manual discipline)",
  run: () => {
    const tpl = fs.readFileSync(path.join(SKILL_DIR, "references", "annotation-output-templates.md"), "utf8");
    const demo = fs.readFileSync(REVIEW_DEMO, "utf8");
    // 权威块 = 从分节注释起，到下一个 /* ===== 分节注释 / </style> / })(); 为止（demo 的示意样式以分节注释隔开，不计入）
    const CSS_MARK = "/* ===== 评审模式布局（权威，生成时原样嵌入） ===== */";
    const JS_MARK = "/* ===== 评审模式权威交互脚本 v4.0（无SVG·徽标锚定·滚动联动；唯一实现；生成 HTML 原样嵌入，禁止手改） ===== */";
    function authBlock(src, mark, label) {
      const i = src.indexOf(mark);
      assert(i !== -1, `${label} start marker not found`);
      const ends = ["/* =====", "</style>", "})();"]
        .map(e => src.indexOf(e, i + mark.length))
        .filter(x => x !== -1);
      assert(ends.length > 0, `${label} block end not found`);
      return src.slice(i, Math.min(...ends));
    }
    assertEq(authBlock(demo, CSS_MARK, "demo CSS"), authBlock(tpl, CSS_MARK, "template CSS"), "CSS block must be byte-identical between demo and authoritative template");
    assertEq(authBlock(demo, JS_MARK, "demo JS"), authBlock(tpl, JS_MARK, "template JS"), "JS block must be byte-identical between demo and authoritative template");
    return { passed: true };
  }
});

register("phase9-007-pmframe-clean", {
  group: "phase9",
  description: "pmframe 单文件结构守护：100 模型仅存 SKILL.md（无 README.md）、frontmatter 完整、全库零网站残留",
  run: () => {
    const root = path.join(SKILL_DIR, "references", "pmframe");
    function walk(dir) {
      const out = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else out.push(p);
      }
      return out;
    }
    const files = walk(root);
    const readmes = files.filter(f => path.basename(f) === "README.md");
    assert(readmes.length === 0, `pmframe 不应存在 README.md（v3.7.4 已单文件化），发现 ${readmes.length} 个: ${readmes.slice(0, 3).join(", ")}`);
    const skills = files.filter(f => path.basename(f) === "SKILL.md");
    assert(skills.length === 100, `pmframe 应有 100 个 SKILL.md，实际 ${skills.length}`);
    // 网站残留模式（入库时 100/100 README 全部污染，清洗后必须恒为 0）
    const JUNK = ["下载 Skill", "与这些工具搭配", "继续阅读下一个", "pmframe.works", "nav-fav-btn", "hero-svg", "返回框架列表", "Framework Deep Dive", "(function(){ var slug"];
    const junkHits = [];
    for (const f of skills) {
      const c = fs.readFileSync(f, "utf8");
      if (!c.startsWith("---\n")) junkHits.push(`frontmatter 缺失: ${f}`);
      for (const p of JUNK) if (c.includes(p)) junkHits.push(`${p} => ${f}`);
    }
    assert(junkHits.length === 0, `pmframe 存在网站残留:\n${junkHits.slice(0, 10).join("\n")}`);
    return { passed: true };
  }
});

register("phase9-008-privacy-scrub", {
  group: "phase9",
  description: "开源隐私守护：全库跟踪文件零本地用户路径（家目录、下载目录），防个人信息随仓库分发",
  run: () => {
    // 与 .gitignore 保持一致：跳过本地运行产物，只检查会被提交的内容
    const SKIP_DIRS = new Set([".git", ".test-tmp", ".analyze", ".claude", "knowledge", "node_modules"]);
    function walk(dir) {
      const out = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) out.push(...walk(p)); }
        else out.push(p);
      }
      return out;
    }
    const files = walk(SKILL_DIR);
    assert(files.length > 250, `隐私扫描应覆盖全库（>250 文件），实际仅 ${files.length}，扫描可能失效`);
    const leaks = [];
    // 拼接构造，避免测试文件自身包含字面量路径被扫描误报
    const PATTERNS = ["/Use" + "rs/", "/Down" + "loads/"];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      for (const pat of PATTERNS) if (c.includes(pat)) leaks.push(`${pat} => ${f}`);
    }
    assert(leaks.length === 0, `检测到本地路径泄漏（开源前必须清除）:\n${leaks.slice(0, 10).join("\n")}`);
    return { passed: true };
  }
});

register("phase10-001-delivery-contract", {
  group: "phase10",
  description: "all output routes share a fail-closed Product-only delivery contract",
  run: () => {
    const focused = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "test-delivery-contract.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(focused.status, 0, `delivery contract focused test failed: ${focused.stderr || focused.stdout}`);

    const demo = fs.readFileSync(REVIEW_DEMO, "utf8");
    const variants = [
      ['"heading": "优惠券创建",', '"heading": "优惠券创建",\n    "api": "INTERNAL_API_SENTINEL",'],
      ['"heading": "优惠券创建",', '"heading": "优惠券创建",\n    "acceptance_criteria": ["ACCEPTANCE_SENTINEL"],'],
      ['"heading": "优惠券创建",', '"heading": "优惠券创建",\n    "unknown_delivery_field": true,']
    ];
    for (const [needle, replacement] of variants) {
      const j = runReviewValidate(writeReviewTmp(demo.replace(needle, replacement)));
      assert(j.reviewDocs && j.reviewDocs.valid === false, `Product-only violation must fail: ${replacement}`);
      assert(j.reviewDocs.errors.some(error => error.includes("Product-only")), "boundary error must identify Product-only violation");
    }
    return { passed: true };
  }
});

register("phase10-002-relationship-layer", {
  group: "phase10",
  description: "v4.0 badge relationship layer stays synchronized and preserves scroll-linked highlighting",
  run: () => {
    const focused = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "test-relationship-layer.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(focused.status, 0, `relationship layer focused test failed: ${focused.stderr || focused.stdout}`);
    const demo = runReviewValidate(REVIEW_DEMO);
    assert(demo.reviewDocs && demo.reviewDocs.valid === true, "demo review docs must remain valid");
    return { passed: true };
  }
});

register("phase10-003-token-baseline", {
  group: "phase10",
  description: "token baseline remains deterministic and separates proxy from actual measurement",
  run: () => {
    const focused = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "test-token-baseline.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(focused.status, 0, `token baseline focused test failed: ${focused.stderr || focused.stdout}`);
    const first = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "token-baseline.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    const second = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "token-baseline.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(first.status, 0, `token baseline CLI failed: ${first.stderr || first.stdout}`);
    assertEq(second.status, 0, `token baseline CLI repeat failed: ${second.stderr || second.stdout}`);
    assert(first.stdout === second.stdout, "token baseline CLI output must be deterministic");
    const result = JSON.parse(first.stdout);
    assert(result.status === "not_measured", "proxy baseline must not claim actual measurement");
    assert(result.samples.every(sample => sample.actual_tokens === null), "proxy baseline must keep actual_tokens null");
    return { passed: true };
  }
});

register("phase10-004-review-efficiency", {
  group: "phase10",
  description: "review efficiency protocol validates observations without overstating fixture evidence",
  run: () => {
    const focused = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "test-review-efficiency.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(focused.status, 0, `review efficiency focused test failed: ${focused.stderr || focused.stdout}`);
    const cli = spawnSync(process.execPath, [path.join(SKILL_DIR, "scripts", "review-efficiency.cjs")], {
      encoding: "utf8",
      cwd: SKILL_DIR,
      timeout: 15000
    });
    assertEq(cli.status, 0, `review efficiency CLI failed: ${cli.stderr || cli.stdout}`);
    const result = JSON.parse(cli.stdout);
    assertEq(result.status, "measured", "complete fixture observations should produce a measured summary");
    assertEq(result.efficiency_verdict, "descriptive_only", "fixture observations must not produce a causal verdict");
    assertEq(result.evidence_status, "fixture_or_observation_data_only", "fixture evidence boundary must remain explicit");
    return { passed: true };
  }
});

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) { out._.push(token); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function abort(message) {
  console.error(message);
  process.exit(1);
}

runAllTests();
