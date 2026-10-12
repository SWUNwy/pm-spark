#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { legacyPaths } = require("./historical-compatibility.cjs");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}
function sha256Buffer(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function sha256File(file) { return sha256Buffer(fs.readFileSync(file)); }

const KNOWN_SUBTYPES = ["form_data_heavy", "product_frontend", "event_driven", "infrastructure_algorithm"];
function resolveRef(ref, root) { return path.isAbsolute(ref) ? path.resolve(ref) : path.resolve(root, ref); }
function checkSnapshot(snapshot, root, label, errors, optional = false) {
  if (!snapshot) {
    if (!optional) errors.push(`${label} snapshot is missing`);
    return;
  }
  const file = resolveRef(snapshot.path, root);
  if (!fs.existsSync(file)) { errors.push(`${label} file is missing: ${snapshot.path}`); return; }
  if (!fs.statSync(file).isFile()) { errors.push(`${label} is not a regular file: ${snapshot.path}`); return; }
  if (sha256File(file) !== snapshot.sha256) errors.push(`${label} hash mismatch: ${snapshot.path}`);
  if (Number.isInteger(snapshot.size_bytes) && fs.statSync(file).size !== snapshot.size_bytes) errors.push(`${label} size mismatch: ${snapshot.path}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.packet || args.packet === true) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: "Missing --packet" }, null, 2)}\n`);
    process.exit(1);
  }
  const packetFile = path.resolve(String(args.packet));
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(packetFile)) errors.push(`Packet file is missing: ${packetFile}`);
  let packet = null;
  let packetBytes = null;
  if (!errors.length) {
    packetBytes = fs.readFileSync(packetFile);
    try { packet = JSON.parse(packetBytes.toString("utf8")); }
    catch (error) { errors.push(`Packet is invalid JSON: ${error.message}`); }
  }
  const checksumFile = args.checksum
    ? path.resolve(String(args.checksum))
    : `${packetFile.replace(/\.json$/i, "")}.sha256`;
  if (!fs.existsSync(checksumFile)) errors.push(`Checksum file is missing: ${checksumFile}`);
  else if (packetBytes) {
    const expected = fs.readFileSync(checksumFile, "utf8").trim().split(/\s+/)[0];
    const actual = sha256Buffer(packetBytes);
    if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual) errors.push("Packet checksum mismatch");
  }
  if (packet) {
    if (packet.schema_version !== "analyze-handoff/1.0") errors.push(`Unsupported packet schema: ${packet.schema_version}`);
    if (!packet.source || packet.source.track !== "specify" || packet.source.status !== "completed") errors.push("Packet source must be a completed Specify run");
    if (!packet.readiness || packet.readiness.status !== "ready") errors.push("Packet readiness is not ready");
    if (!packet.authority || packet.authority.grants_implementation_authority !== false || packet.authority.grants_external_action_authority !== false) errors.push("Packet authority boundary is missing or unsafe");
    for (const key of ["host_policy", "approval"]) {
      if (typeof packet.authority?.[key] !== "string" || !packet.authority[key].trim()) errors.push(`authority.${key} must be a non-empty string; migrate source state and re-export with a new checksum`);
    }
    for (const field of legacyPaths(packet)) errors.push(`Legacy field or semantics at ${field}; migrate source state and re-export with a new checksum`);
    if (packet.context && JSON.stringify(packet.context).includes("historical_compatibility")) errors.push("Historical compatibility data must not enter current context");
    const root = packet.source && packet.source.project_root ? path.resolve(packet.source.project_root) : path.dirname(packetFile);
    checkSnapshot(packet.source && packet.source.state, root, "state", errors);
    checkSnapshot(packet.source && packet.source.checkpoint, root, "checkpoint", errors, true);
    const sourceStateFile = packet.source?.state?.path && resolveRef(packet.source.state.path, root);
    if (sourceStateFile && fs.existsSync(sourceStateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(sourceStateFile, "utf8"));
        if (legacyPaths({ ...state, history: [] }).length || (legacyPaths(state.history).length && !state.historical_compatibility)) errors.push("Legacy source state must be migrated before re-export");
      } catch { errors.push("Source state is invalid JSON"); }
    }
    const checkpointFile = packet.source?.checkpoint?.path && resolveRef(packet.source.checkpoint.path, root);
    if (checkpointFile && fs.existsSync(checkpointFile) && legacyPaths(fs.readFileSync(checkpointFile, "utf8")).length) errors.push("Checkpoint contains legacy current summary; migrate source state and re-export");
    checkSnapshot(packet.source && packet.source.result, root, "result", errors, true);
    if (!Array.isArray(packet.artifacts) || packet.artifacts.length === 0) errors.push("Packet has no Spec artifacts");
    else for (const artifact of packet.artifacts) checkSnapshot(artifact, root, `artifact(${artifact.role || "unknown"})`, errors);
    if (!packet.evidence_ledger || !packet.evidence_ledger.path || !packet.evidence_ledger.sha256) errors.push("Evidence ledger binding is missing");
    else {
      const ledgerFile = resolveRef(packet.evidence_ledger.path, root);
      if (!fs.existsSync(ledgerFile)) errors.push(`Evidence ledger is missing: ${packet.evidence_ledger.path}`);
      else {
        if (sha256File(ledgerFile) !== packet.evidence_ledger.sha256) errors.push("Evidence ledger hash mismatch");
        const eventCount = fs.readFileSync(ledgerFile, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "").length;
        if (eventCount !== packet.evidence_ledger.event_count) errors.push("Evidence ledger event count mismatch");
      }
    }
    const gates = packet.readiness && packet.readiness.gates_passed;
    if (!Array.isArray(gates) || !["G1", "G2", "G3", "G-Spec"].every((id) => gates.some((gate) => gate.id === id && gate.status === "pass"))) errors.push("Required handoff Gates are not all passed");
    if (!packet.execution || !Array.isArray(packet.execution.steps) || packet.execution.steps.length === 0) errors.push("Execution plan is missing steps");
    if (!packet.execution || !Array.isArray(packet.execution.verification) || packet.execution.verification.length === 0) errors.push("Execution plan is missing verification checks");
    if (!packet.context || !Array.isArray(packet.context.assumptions) || !Array.isArray(packet.context.decisions)) errors.push("Context assumptions or decisions are missing");
    const subtypes = packet.context && packet.context.spec_subtypes;
    if (subtypes !== undefined && !Array.isArray(subtypes)) {
      errors.push("context.spec_subtypes must be an array");
    } else if (Array.isArray(subtypes)) {
      for (const value of subtypes) {
        if (typeof value !== "string" || !KNOWN_SUBTYPES.includes(value)) errors.push(`Unknown spec_subtypes value: ${value}`);
      }
      if (subtypes.length === 0) {
        warnings.push("context.spec_subtypes is empty; downstream skills will not know which extension layers (Field Rules / Page & Interaction / Events) to enforce");
      }
    } else {
      warnings.push("context.spec_subtypes is missing; downstream skills will not know which extension layers (Field Rules / Page & Interaction / Events) to enforce");
    }
    if (!packet.feedback || packet.feedback.append_only !== true || packet.feedback.format !== "jsonl") warnings.push("Feedback target is not declared as append-only JSONL");
  }
  const result = { ok: errors.length === 0, command: "verify-handoff", packet: packetFile, errors, warnings };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}

main();
