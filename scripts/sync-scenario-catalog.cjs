#!/usr/bin/env node
"use strict";

// Single-authoritative-source sync/check for the PM behavior scenario id list.
//
//   node scripts/sync-scenario-catalog.cjs --check
//       Validate that every consumer of the scenario catalog (results.json,
//       results.template.json, and tests/index.json's behavior-acceptance
//       declaration) carries exactly the same scenario ids as the authority
//       tests/pm-behavior/scenarios.json. Never writes. Non-zero exit on drift.
//
//   node scripts/sync-scenario-catalog.cjs --generate
//       Regenerate tests/pm-behavior/results.template.json from the authority
//       catalog (preserving its anti-fabrication / evidence / integrity
//       structure and initial not_run form), then run the same consistency
//       checks as --check.
//
// scenarios.json is the only hand-maintained source of truth for the 15 PM
// behavior scenario ids. results.template.json is derived from it here, and
// results.json / tests/index.json are read-only verified to stay in lockstep.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "tests", "pm-behavior", "scenarios.json");
const RESULTS_PATH = path.join(ROOT, "tests", "pm-behavior", "results.json");
const TEMPLATE_PATH = path.join(ROOT, "tests", "pm-behavior", "results.template.json");
const INDEX_PATH = path.join(ROOT, "tests", "index.json");

// Serialize a value using the repo's compact JSON convention: a space after `{`
// and before `}` (unless the object is empty), `": "` between key and value,
// `", "` between entries, no trailing whitespace. Matches the existing
// results.template.json formatting byte-for-byte.
function compact(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return "[" + value.map(compact).join(", ") + "]";
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    return "{ " + keys.map((key) => `${JSON.stringify(key)}: ${compact(value[key])}`).join(", ") + " }";
  }
  return JSON.stringify(value);
}

// Render a results.template.json document to text in the repo's exact format:
// top-level keys each on their own line, scenarios as compact single-line rows.
function renderTemplate(template) {
  const keys = Object.keys(template);
  const lines = ["{"];
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    if (key === "scenarios") {
      lines.push('  "scenarios": [');
      template.scenarios.forEach((scenario, scenarioIndex) => {
        lines.push(`    ${compact(scenario)}${scenarioIndex < template.scenarios.length - 1 ? "," : ""}`);
      });
      lines.push(`  ]${isLast ? "" : ","}`);
    } else {
      lines.push(`  "${key}": ${compact(template[key])}${isLast ? "" : ","}`);
    }
  });
  lines.push("}");
  return lines.join("\n") + "\n";
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function idsOf(record, label, report) {
  if (!Array.isArray(record?.scenarios)) {
    report.push(`${label}: missing scenarios[] array`);
    return [];
  }
  return record.scenarios.map((item) => item.id);
}

// Compare an ordered id list against the authority (as an ordered set, since the
// requirement is "same order or same set"). Reports additions, removals and any
// id appearing more than once.
function diffAgainstAuthority(label, candidateIds, authorityIds, report) {
  const candidate = new Set(candidateIds);
  const authority = new Set(authorityIds);
  const missing = authorityIds.filter((id) => !candidate.has(id));
  const extra = candidateIds.filter((id) => !authority.has(id));
  const duplicates = candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index);
  if (missing.length) report.push(`${label}: missing scenario ids ${JSON.stringify(missing)}`);
  if (extra.length) report.push(`${label}: unknown scenario ids ${JSON.stringify(extra)}`);
  if (duplicates.length) report.push(`${label}: duplicate scenario ids ${JSON.stringify(duplicates)}`);
  return missing.length === 0 && extra.length === 0 && duplicates.length === 0;
}

// Build a fresh template document whose scenarios mirror the authority order,
// preserving every top-level field and the initial not_run scenario shape.
function buildTemplateFromAuthority(authorityIds, existingTemplate) {
  const byId = new Map((existingTemplate.scenarios || []).map((item) => [item.id, item]));
  const standard = {
    id: null,
    status: "not_run",
    conversation: { user_turns: [], assistant_turns: [] },
    evidence: { type: "none", transcript_path: null, initial_artifacts: {}, artifact_paths: [] },
    checks: { review: { expected_behavior: [], must_not_do: [] }, notes: "未运行" },
  };
  const scenarios = authorityIds.map((id) => ({ ...standard, ...byId.get(id), id }));
  return { ...existingTemplate, scenarios };
}

// Validate that results.json, results.template.json and the index-declared
// catalog all carry exactly the authority ids. Pushes any drift into `report`
// and returns the per-source match booleans plus the authority id list.
function runChecks(report) {
  const authority = readJson(CATALOG_PATH);
  const authorityIds = Array.isArray(authority?.scenarios) ? authority.scenarios.map((item) => item.id) : [];
  if (!authorityIds.length) report.push("authority: scenarios.json declares no scenarios");

  const results = readJson(RESULTS_PATH);
  const resultsIds = idsOf(results, "results.json", report);
  const resultsMatch = diffAgainstAuthority("results.json", resultsIds, authorityIds, report);

  const template = readJson(TEMPLATE_PATH);
  const templateIds = idsOf(template, "results.template.json", report);
  const templateMatch = diffAgainstAuthority("results.template.json", templateIds, authorityIds, report);

  // tests/index.json declares the behavior-acceptance catalog by file reference
  // under behavior_acceptance.scenarios. Resolve that declaration and require
  // the referenced catalog to carry exactly the authority ids.
  let indexMatch = true;
  const index = readJson(INDEX_PATH);
  const declared = index?.behavior_acceptance?.scenarios;
  if (typeof declared !== "string" || !declared) {
    report.push("tests/index.json: behavior_acceptance.scenarios does not name the catalog");
    indexMatch = false;
  } else {
    const declaredPath = path.resolve(ROOT, "tests", declared);
    if (!fs.existsSync(declaredPath)) {
      report.push(`tests/index.json: behavior_acceptance.scenarios ${declared} does not resolve`);
      indexMatch = false;
    } else {
      const declaredCatalog = readJson(declaredPath);
      const declaredIds = idsOf(declaredCatalog, "tests/index.json catalog", report);
      indexMatch = diffAgainstAuthority("tests/index.json catalog", declaredIds, authorityIds, report);
    }
  }

  return { authorityIds, resultsIds, resultsMatch, templateMatch, indexMatch };
}

function main() {
  const mode = process.argv.includes("--generate") ? "generate" : "check";
  if (process.argv.slice(2).some((arg) => arg !== "--check" && arg !== "--generate")) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: "Usage: sync-scenario-catalog.cjs [--check|--generate]" }, null, 2)}\n`);
    process.exit(2);
  }

  let written = false;
  if (mode === "generate") {
    // Regenerate results.template.json from the authority, then validate the
    // resulting state. Guard the write with a dry-run so a generation that
    // would change non-scenario fields or scenario shapes is refused.
    const authority = readJson(CATALOG_PATH);
    const authorityIds = Array.isArray(authority?.scenarios) ? authority.scenarios.map((item) => item.id) : [];
    const existingTemplate = readJson(TEMPLATE_PATH);
    const generated = renderTemplate(buildTemplateFromAuthority(authorityIds, existingTemplate));
    const parsed = JSON.parse(generated);

    const nonScenarioChanged = Object.keys(parsed)
      .filter((key) => key !== "scenarios")
      .some((key) => JSON.stringify(parsed[key]) !== JSON.stringify(existingTemplate[key]));
    // Only rows present in both the old and new template must keep their exact
    // shape; rows the authority adds (repairing drift) legitimately introduce
    // the standard not_run form.
    const scenarioShapeUnchanged = parsed.scenarios
      .filter((item) => existingTemplate.scenarios.some((existing) => existing.id === item.id))
      .every((item) => {
        const current = existingTemplate.scenarios.find((existing) => existing.id === item.id);
        return !!current && JSON.stringify(current) === JSON.stringify(item);
      });

    if (nonScenarioChanged || !scenarioShapeUnchanged) {
      const reasons = [
        nonScenarioChanged ? "generation would alter non-scenario template fields" : null,
        !scenarioShapeUnchanged ? "generation would change existing scenario shapes" : null,
      ].filter(Boolean);
      const summary = {
        ok: false,
        mode,
        authority_count: authorityIds.length,
        template_written: false,
        generated_path: null,
        differences: ["dry-run refused: " + reasons.join("; ")],
      };
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
      process.exit(1);
    }

    fs.writeFileSync(TEMPLATE_PATH, generated);
    written = true;
  }

  const report = [];
  const checks = runChecks(report);
  const ok = report.length === 0 && checks.resultsMatch && checks.templateMatch && checks.indexMatch;
  const summary = {
    ok,
    mode,
    authority_count: checks.authorityIds.length,
    authority_ids: checks.authorityIds,
    results_match: checks.resultsMatch,
    results_ids: checks.resultsIds,
    template_match: checks.templateMatch,
    index_match: checks.indexMatch,
    template_written: written,
    generated_path: written ? path.relative(ROOT, TEMPLATE_PATH) : null,
    differences: report,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

main();
