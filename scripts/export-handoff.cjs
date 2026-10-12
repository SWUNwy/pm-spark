#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { legacyPaths, currentItems, historicalEvidence } = require("./historical-compatibility.cjs");

function now() { return new Date().toISOString(); }

const KNOWN_SUBTYPES = ["form_data_heavy", "product_frontend", "event_driven", "infrastructure_algorithm"];

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) { out._.push(token); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function emit(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function abort(message, details = {}) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message, ...details }, null, 2)}\n`);
  process.exit(1);
}
function requireArg(args, key) {
  if (args[key] === undefined || args[key] === true || String(args[key]).trim() === "") abort(`Missing --${key}`);
  return String(args[key]);
}
function readJson(file, label) {
  if (!fs.existsSync(file)) abort(`${label} does not exist`, { file });
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { abort(`${label} is invalid JSON`, { file, detail: error.message }); }
}
function sha256Buffer(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function sha256File(file) { return sha256Buffer(fs.readFileSync(file)); }
function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}
function nonEmptyString(value) { return typeof value === "string" && value.trim() !== ""; }
function displayPath(file, root) {
  const relative = path.relative(root, file);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : file;
}
function resolveArtifact(entry, root) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) abort("Each spec_artifact must be an object");
  if (!nonEmptyString(entry.path) || !nonEmptyString(entry.role)) abort("Each spec_artifact requires path and role", { artifact: entry });
  const file = path.isAbsolute(entry.path) ? path.resolve(entry.path) : path.resolve(root, entry.path);
  if (!fs.existsSync(file)) abort("Spec artifact does not exist", { artifact: entry.path, resolved: file });
  const stat = fs.statSync(file);
  if (!stat.isFile()) abort("Spec artifact must be a regular file", { artifact: file });
  return { path: displayPath(file, root), role: entry.role, sha256: sha256File(file), size_bytes: stat.size };
}
function applicableGateIds(state) {
  const ids = ["G1", "G2", "G3"];
  if (state.decomposition_required) ids.push("G-Decompose");
  if (state.track === "explore") ids.push("G-Explore");
  if (state.track === "analyze" && ["solution", "mixed"].includes(state.analysis_type)) ids.push("G-Architecture");
  if (state.track === "specify") {
    ids.push("G-Spec");
    if (state.section_review_required) ids.push("G-Section");
  }
  if (state.human_commitment_required) ids.push("G-Human");
  for (const gate of (state.constitution && state.constitution.additional_gates) || []) ids.push(gate.id);
  return [...new Set(ids)];
}
function validateManifest(manifest) {
  const allowed = new Set(["schema_version", "target", "spec_subtypes", "spec_artifacts", "execution_plan"]);
  for (const key of Object.keys(manifest || {})) if (!allowed.has(key)) abort("Handoff input contains unsupported field", { field: key });
  if (manifest.schema_version !== "1.0") abort("Unsupported handoff input schema_version", { schema_version: manifest.schema_version });
  if (!manifest.target || !nonEmptyString(manifest.target.stage) || !nonEmptyString(manifest.target.recommended_skill)) abort("target requires stage and recommended_skill");
  if (manifest.spec_subtypes !== undefined) {
    if (!Array.isArray(manifest.spec_subtypes)) abort("spec_subtypes must be an array");
    for (const value of manifest.spec_subtypes) {
      if (!nonEmptyString(value)) abort("spec_subtypes entries must be non-empty strings");
      if (!KNOWN_SUBTYPES.includes(value)) abort("Unknown spec_subtypes value", { value, allowed: KNOWN_SUBTYPES });
    }
  }
  if (!Array.isArray(manifest.spec_artifacts) || manifest.spec_artifacts.length === 0) abort("spec_artifacts must be a non-empty array");
  const plan = manifest.execution_plan;
  if (!plan || !nonEmptyString(plan.objective)) abort("execution_plan.objective is required");
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) abort("execution_plan.steps must be a non-empty array");
  const stepIds = new Set();
  for (const step of plan.steps) {
    if (!step || !nonEmptyString(step.id) || !nonEmptyString(step.action)) abort("Each execution step requires id and action", { step });
    if (stepIds.has(step.id)) abort("Execution step ids must be unique", { id: step.id });
    stepIds.add(step.id);
    if (step.outputs !== undefined && !Array.isArray(step.outputs)) abort("execution step outputs must be an array", { id: step.id });
    if (step.depends_on !== undefined && !Array.isArray(step.depends_on)) abort("execution step depends_on must be an array", { id: step.id });
  }
  for (const step of plan.steps) {
    for (const dependency of step.depends_on || []) if (!stepIds.has(dependency)) abort("Execution step depends on an unknown id", { id: step.id, dependency });
  }
  if (!Array.isArray(plan.verification) || plan.verification.length === 0 || plan.verification.some((item) => !nonEmptyString(item))) abort("execution_plan.verification must contain at least one non-empty check");
  if (plan.constraints !== undefined && !Array.isArray(plan.constraints)) abort("execution_plan.constraints must be an array");
}
function readEvidence(file) {
  if (!fs.existsSync(file)) abort("Evidence ledger does not exist", { file });
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.map((line, index) => {
    try { return { line: index + 1, ...JSON.parse(line) }; }
    catch (error) { abort("Evidence ledger contains invalid JSON", { file, line: index + 1, detail: error.message }); }
  });
}
function fileSnapshot(file, root) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const stat = fs.statSync(file);
  return { path: displayPath(file, root), sha256: sha256File(file), size_bytes: stat.size };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("export-handoff --state <state.json> --input <handoff-input.json> [--output <file>] [--force]\n");
    return;
  }
  const stateFile = path.resolve(requireArg(args, "state"));
  const inputFile = path.resolve(requireArg(args, "input"));
  const state = readJson(stateFile, "State file");
  if (legacyPaths({ ...state, history: [] }).length || (legacyPaths(state.history).length && !state.historical_compatibility)) abort("Legacy source state requires run-state migrate, re-export and a new checksum");
  const manifest = readJson(inputFile, "Handoff input");
  validateManifest(manifest);
  const runDir = path.dirname(stateFile);
  const projectRoot = path.resolve(state.project_root || path.resolve(runDir, "../../.."));
  if (state.track !== "specify") abort("Handoff export requires a Specify run", { track: state.track });
  if (state.status !== "completed") abort("Handoff export requires a completed run", { status: state.status });
  const requiredGates = applicableGateIds(state);
  for (const id of requiredGates) {
    if (!state.gates || !state.gates[id] || state.gates[id].status !== "pass") abort("Handoff readiness gate is not passed", { gate: id });
  }
  const selfReview = (state.checks || []).find((check) => check.id === "self-review");
  if (!selfReview || !["pass", "waived"].includes(selfReview.status)) abort("Handoff requires self-review pass or authorized waiver");
  if (state.constitution && state.constitution.detected) {
    if (!state.constitution.applied) abort("Detected Constitution was not applied");
    if (!fs.existsSync(state.constitution.path) || sha256File(state.constitution.path) !== state.constitution.sha256) abort("Constitution changed after run initialization; handoff is stale");
  }
  const evidenceFile = path.resolve(runDir, state.files && state.files.evidence ? state.files.evidence : "evidence.jsonl");
  const evidenceEvents = readEvidence(evidenceFile);
  if (legacyPaths(evidenceEvents).length && state.historical_compatibility?.evidence_sha256 !== sha256File(evidenceFile)) abort("Legacy evidence requires source state migration before re-export");
  if (Number.isInteger(state.evidence_count) && state.evidence_count !== evidenceEvents.length) abort("Evidence count does not match ledger", { state_count: state.evidence_count, ledger_count: evidenceEvents.length });
  const artifacts = manifest.spec_artifacts.map((entry) => resolveArtifact(entry, projectRoot));
  const specSubtypes = (Array.isArray(manifest.spec_subtypes) && manifest.spec_subtypes.length > 0)
    ? manifest.spec_subtypes
    : (Array.isArray(state.spec_subtypes) ? state.spec_subtypes.filter((value) => KNOWN_SUBTYPES.includes(value)) : []);
  const gateSnapshots = requiredGates.map((id) => ({
    id,
    status: state.gates[id].status,
    evidence: state.gates[id].evidence,
    evaluated_at: state.gates[id].evaluated_at
  }));
  const checkpointFile = path.resolve(runDir, state.files && state.files.checkpoint ? state.files.checkpoint : "checkpoint.md");
  if (fs.existsSync(checkpointFile) && legacyPaths(fs.readFileSync(checkpointFile, "utf8")).length) abort("Legacy checkpoint requires source state migration before re-export");
  const resultFile = path.resolve(runDir, state.files && state.files.result ? state.files.result : "result.md");
  const feedbackFile = path.resolve(runDir, "execution-feedback.jsonl");
  if (!fs.existsSync(feedbackFile)) fs.writeFileSync(feedbackFile, "", "utf8");
  const packet = {
    schema_version: "analyze-handoff/1.0",
    packet_id: `${state.run_id}-handoff`,
    exported_at: now(),
    source: {
      run_id: state.run_id,
      track: state.track,
      status: state.status,
      goal: state.goal,
      project_root: projectRoot,
      state: fileSnapshot(stateFile, projectRoot),
      checkpoint: fileSnapshot(checkpointFile, projectRoot),
      result: fileSnapshot(resultFile, projectRoot)
    },
    readiness: {
      status: "ready",
      gates_passed: gateSnapshots,
      self_review: selfReview,
      constitution: state.constitution || null
    },
    artifacts,
    context: {
      scope: state.scope || [],
      non_goals: state.non_goals || [],
      assumptions: currentItems(state.assumptions),
      acceptance_evidence: currentItems(state.acceptance_evidence),
      spec_subtypes: specSubtypes,
      decisions: evidenceEvents.filter((event) => event.kind === "decision" && legacyPaths(event).length === 0)
    },
    evidence_ledger: {
      path: displayPath(evidenceFile, projectRoot),
      sha256: sha256File(evidenceFile),
      event_count: evidenceEvents.length,
      events: historicalEvidence(evidenceEvents)
    },
    execution: {
      target_stage: manifest.target.stage,
      recommended_skill: manifest.target.recommended_skill,
      objective: manifest.execution_plan.objective,
      steps: manifest.execution_plan.steps,
      verification: manifest.execution_plan.verification,
      constraints: manifest.execution_plan.constraints || []
    },
    authority: {
      host_policy: "The consuming host agent's current repository, testing, and safety policy governs all actions.",
      approval: "Use the user's existing authorization and obtain any additional approval required by the host for the specific action. Spec readiness does not grant execution approval.",
      grants_implementation_authority: false,
      grants_external_action_authority: false,
      rule: "Apply the host agent's current approval, repository, testing, and safety policy before acting."
    },
    feedback: {
      path: displayPath(feedbackFile, projectRoot),
      format: "jsonl",
      append_only: true,
      required_fields: ["timestamp", "kind", "step_id", "claim", "evidence", "impact", "recommended_route"]
    }
  };
  const outputFile = args.output ? path.resolve(String(args.output)) : path.join(runDir, "handoff-packet.json");
  if (fs.existsSync(outputFile) && !args.force) abort("Handoff packet already exists; use --force to replace it", { output: outputFile });
  const serialized = `${JSON.stringify(packet, null, 2)}\n`;
  atomicWrite(outputFile, serialized);
  const checksumFile = `${outputFile.replace(/\.json$/i, "")}.sha256`;
  atomicWrite(checksumFile, `${sha256Buffer(Buffer.from(serialized, "utf8"))}  ${path.basename(outputFile)}\n`);
  emit({
    ok: true,
    command: "export-handoff",
    packet: outputFile,
    checksum: checksumFile,
    feedback: feedbackFile,
    artifact_count: artifacts.length,
    evidence_count: evidenceEvents.length,
    decision_count: packet.context.decisions.length,
    spec_subtypes: specSubtypes,
    ready: true
  });
}

main();
