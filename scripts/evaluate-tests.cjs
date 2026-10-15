#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REQUIRED_FIELDS = [
  "id", "purpose", "user_input", "expected_behavior", "must_not_do",
  "passing_criteria", "hard_fail_checks"
];

function issue(level, message) { return { level, message }; }

function parseFields(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function main() {
  const testsDir = path.resolve(process.argv[2] || path.join(process.cwd(), "tests"));
  const skillDir = path.dirname(testsDir);
  const indexFile = path.join(testsDir, "index.json");
  const issues = [];
  if (!fs.existsSync(indexFile)) {
    process.stdout.write(`${JSON.stringify({ ok: false, issues: [issue("error", `Missing ${indexFile}`)] }, null, 2)}\n`);
    process.exit(1);
  }
  let index;
  try { index = JSON.parse(fs.readFileSync(indexFile, "utf8")); }
  catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, issues: [issue("error", `Invalid index JSON: ${error.message}`)] }, null, 2)}\n`);
    process.exit(1);
  }
  if (!Array.isArray(index.cases)) issues.push(issue("error", "index.json must contain cases[]"));
  const requiredGroups = index.required_groups || {};
  const groupCounts = Object.fromEntries(Object.keys(requiredGroups).map((group) => [group, 0]));
  const ids = new Set();

  for (const entry of index.cases || []) {
    if (!entry.id) issues.push(issue("error", "Case entry missing id"));
    else if (ids.has(entry.id)) issues.push(issue("error", `Duplicate case id: ${entry.id}`));
    else ids.add(entry.id);
    if (!entry.group || !(entry.group in requiredGroups)) issues.push(issue("error", `Invalid group for ${entry.id || "unknown"}: ${entry.group}`));
    else groupCounts[entry.group] += 1;
    if (!entry.file) {
      issues.push(issue("error", `Case ${entry.id || "unknown"} missing file`));
      continue;
    }
    const file = path.join(testsDir, entry.file);
    if (!fs.existsSync(file)) {
      issues.push(issue("error", `Missing test file: ${entry.file}`));
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    const fields = parseFields(text);
    for (const field of REQUIRED_FIELDS) if (!fields[field]) issues.push(issue("error", `${entry.file} missing field ${field}`));
    if (!fields.expected_track && !fields.expected_mode) issues.push(issue("error", `${entry.file} needs expected_track or legacy expected_mode`));
    if (["harness", "loop", "recovery", "governance"].includes(entry.group)) {
      for (const field of ["expected_state_sequence", "required_gates", "stop_condition"]) {
        if (!fields[field]) issues.push(issue("error", `${entry.file} missing v2 field ${field}`));
      }
    }
    for (const ref of String(fields.required_references || "").split(",").map((x) => x.trim()).filter((x) => x && x !== "none")) {
      if (!fs.existsSync(path.join(skillDir, ref))) issues.push(issue("error", `${entry.file} references missing file ${ref}`));
    }
  }

  for (const [group, minimum] of Object.entries(requiredGroups)) {
    if (groupCounts[group] < minimum) issues.push(issue("error", `Group ${group} has ${groupCounts[group]} cases; requires ${minimum}`));
  }

  const engineTest = spawnSync(process.execPath, [path.join(skillDir, "scripts", "test-run-state.cjs")], { encoding: "utf8" });
  let engineResult;
  try { engineResult = JSON.parse(engineTest.stdout || engineTest.stderr); }
  catch { engineResult = { ok: false, raw: engineTest.stdout || engineTest.stderr }; }
  if (engineTest.status !== 0 || !engineResult.ok) issues.push(issue("error", "State-engine test suite failed"));

  const handoffTest = spawnSync(process.execPath, [path.join(skillDir, "scripts", "test-handoff.cjs")], { encoding: "utf8" });
  let handoffResult;
  try { handoffResult = JSON.parse(handoffTest.stdout || handoffTest.stderr); }
  catch { handoffResult = { ok: false, raw: handoffTest.stdout || handoffTest.stderr }; }
  if (handoffTest.status !== 0 || !handoffResult.ok) issues.push(issue("error", "Handoff test suite failed"));

  const workflowTest = spawnSync(process.execPath, [path.join(skillDir, "scripts", "test-workflow.cjs")], { encoding: "utf8" });
  let workflowResult;
  try { workflowResult = JSON.parse(workflowTest.stdout || workflowTest.stderr); }
  catch { workflowResult = { ok: false, raw: workflowTest.stdout || workflowTest.stderr }; }
  if (workflowTest.status !== 0 || !workflowResult.ok) issues.push(issue("error", "Workflow orchestration test suite failed"));

  const companionTest = spawnSync(process.execPath, [path.join(skillDir, "scripts", "test-companion.cjs")], { encoding: "utf8", timeout: 30000 });
  let companionResult;
  try { companionResult = JSON.parse(companionTest.stdout || companionTest.stderr); }
  catch { companionResult = { ok: false, raw: companionTest.stdout || companionTest.stderr }; }
  if (companionTest.status !== 0 || !companionResult.ok) issues.push(issue("error", "Visual Companion test suite failed"));

  const catalogTest = spawnSync(process.execPath, [path.join(skillDir, "scripts", "sync-scenario-catalog.cjs"), "--check"], { encoding: "utf8" });
  let catalogResult;
  try { catalogResult = JSON.parse(catalogTest.stdout || catalogTest.stderr); }
  catch { catalogResult = { ok: false, raw: catalogTest.stdout || catalogTest.stderr }; }
  if (catalogTest.status !== 0 || !catalogResult.ok) issues.push(issue("error", "PM behavior scenario id catalog drift (scenarios.json vs results.json / results.template.json / tests/index.json)"));

  const errorCount = issues.filter((item) => item.level === "error").length;
  const result = {
    ok: errorCount === 0,
    version: index.version,
    case_count: (index.cases || []).length,
    group_counts: groupCounts,
    state_engine: engineResult,
    handoff: handoffResult,
    workflow: workflowResult,
    companion: companionResult,
    issue_count: issues.length,
    issues
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}

main();
