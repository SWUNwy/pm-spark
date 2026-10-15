#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { checkSpecContract } = require("./spec-contract.cjs");
const { checkDecisionLogContract } = require("./decision-log-contract.cjs");
const { spawnSync } = require("child_process");
const { validateBehaviorEvidence } = require("./pm-behavior-evidence.cjs");
const ROOT = path.resolve(__dirname, "..");
const EXPECTED_VERSION = "6.1.0";
const VALID_STATUSES = new Set(["passed", "failed", "not_run", "blocked"]);
const REQUIRED_FILES = ["SKILL.md", "README.md", "agents/openai.yaml", "references/pm-behavior-acceptance.md", "tests/index.json", "tests/pm-behavior/scenarios.json", "tests/pm-behavior/results.template.json", "tests/pm-behavior/results.json", "scripts/evaluate-tests.cjs"];
const LEGACY_USER_MODEL = [/行动等级\s*[:：]?\s*(?:低|中|高|L[123])/, /注释等级\s*[:：]?\s*(?:低|中|高|L[123])/, /权限等级/, /选择(?:一个)?(?:轨道|门禁|角色|权限)/, /用户(?:需要|必须)选择.*(?:等级|权限|角色)/];
function fail(message, details = {}) { return { level: "error", message, ...details }; }
function read(file, issues) {
  try { return fs.readFileSync(path.join(ROOT, file), "utf8"); }
  catch (error) { issues.push(fail(`Cannot read ${file}`, { detail: error.message })); return ""; }
}
function readJson(file, issues) {
  const text = read(file, issues);
  try { return JSON.parse(text); }
  catch (error) { issues.push(fail(`Invalid JSON: ${file}`, { detail: error.message })); return null; }
}
function filled(value) { return typeof value === "string" && value.trim().length > 0 && !/[<>]/.test(value); }
function locatedEvidence(evidence) {
  return Array.isArray(evidence?.artifact_paths) && evidence.artifact_paths.length > 0 && evidence.artifact_paths.every(file => {
    if (!filled(file) || path.isAbsolute(file)) return false;
    const resolved = path.resolve(ROOT, file);
    if (!resolved.startsWith(`${ROOT}${path.sep}`)) return false;
    try { return fs.statSync(resolved).isFile() && fs.statSync(resolved).size > 0; } catch { return false; }
  });
}
function records(record, ids, label, issues, template = false) {
  if (!Array.isArray(record?.scenarios)) { issues.push(fail(`${label} must contain scenarios[]`)); return []; }
  const seen = new Set();
  for (const item of record.scenarios) {
    if (!ids.has(item.id) || seen.has(item.id)) issues.push(fail(`${label} unknown or duplicate scenario: ${item.id}`));
    seen.add(item.id);
    if (!VALID_STATUSES.has(item.status)) issues.push(fail(`${label} invalid status: ${item.id}`));
    if (template && item.status !== "not_run") issues.push(fail(`Template scenario must default to not_run: ${item.id}`));
    if (item.status === "not_run" && (item.evidence?.quote || item.evidence?.transcript_path || Object.keys(item.evidence?.initial_artifacts || {}).length || item.evidence?.artifact_paths?.length || item.conversation?.assistant_turns?.length || item.checks?.review?.expected_behavior?.length || item.checks?.review?.must_not_do?.length || item.checks?.expected_behavior_met === true)) issues.push(fail(`Unrun scenario contains claimed evidence: ${item.id}`));
    if (item.status === "failed") issues.push(fail(`Behavior failed: ${item.id}`));
  }
  for (const id of ids) if (!seen.has(id)) issues.push(fail(`${label} missing scenario: ${id}`));
  return record.scenarios;
}
function main() {
  const release = process.argv.includes("--release");
  const issues = [], blockers = [];
  if (process.argv.slice(2).some(arg => arg !== "--release")) issues.push(fail("Usage: check-v6-contract.cjs [--release]"));
  for (const file of REQUIRED_FILES) if (!fs.existsSync(path.join(ROOT, file))) issues.push(fail(`Missing required file: ${file}`));
  const index = readJson("tests/index.json", issues);
  const catalog = readJson("tests/pm-behavior/scenarios.json", issues);
  const results = readJson("tests/pm-behavior/results.json", issues);
  const template = readJson("tests/pm-behavior/results.template.json", issues);
  if (index?.version !== EXPECTED_VERSION || index?.behavior_acceptance?.real_conversation_required !== true || index?.behavior_acceptance?.required_status !== "passed") issues.push(fail("Invalid behavior acceptance version or completion contract"));
  if (catalog?.stage !== "v6.1-phase-1" || !Array.isArray(catalog?.scenarios) || !catalog.scenarios.length) issues.push(fail("Invalid or empty PM scenario catalog"));
  const definitions = Array.isArray(catalog?.scenarios) ? catalog.scenarios : [];
  const ids = new Set(definitions.map(item => item.id));
  if (ids.size !== definitions.length || definitions.some(item => !filled(item.id) || !item.expected_behavior?.length || !item.must_not_do?.length || !item.user_turns?.length)) issues.push(fail("Invalid or duplicate scenario definitions"));
  if (template?.overall_status !== "not_run" || !String(template?.integrity_rule).includes("Do not infer passed")) issues.push(fail("Template must default to not_run with anti-fabrication rule"));
  records(template, ids, "Template", issues, true);
  const runs = records(results, ids, "Results", issues);
  if (!VALID_STATUSES.has(results?.overall_status)) issues.push(fail("Invalid overall behavior status"));
  if (results?.overall_status === "failed") issues.push(fail("Overall behavior acceptance failed"));
  const allPassed = runs.length === ids.size && ids.size > 0 && runs.every(item => item.status === "passed");
  if ((results?.overall_status === "passed") !== allPassed) issues.push(fail("Overall passed status disagrees with scenario results"));
  if (results?.overall_status === "not_run" && runs.some(item => item.status !== "not_run")) issues.push(fail("Overall not_run disagrees with scenario results"));
  if (!allPassed) blockers.push("All real PM behavior scenarios must pass");
  if (![results?.run_id, results?.operator].every(filled) || !filled(results?.run_date) || !Number.isFinite(Date.parse(results.run_date))) blockers.push("Real behavior run metadata is incomplete");
  for (const item of runs) {
    const evidenceErrors = validateBehaviorEvidence(item, definitions.find(definition => definition.id === item.id), ROOT);
    const complete = item.status === "passed" && evidenceErrors.length === 0;
    if (!complete) blockers.push(`Incomplete real conversation, checks or locatable evidence: ${item.id}`);
    if (item.status === "passed" && !complete) issues.push(fail(`Passed behavior lacks complete evidence: ${item.id}`, { detail: evidenceErrors }));
  }
  const activeFiles = ["SKILL.md", "README.md", "agents/openai.yaml"];
  function collect(dir) {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) collect(file);
      else if (entry.name.endsWith(".md")) activeFiles.push(file);
    }
  }
  collect("references");
  for (const file of activeFiles) {
    const text = read(file, issues).split(/^## 版本规范$|^## 版本$/m)[0];
    const lines = text.split(/\r?\n/);
    let failureColumn = -1;
    for (const [n, line] of lines.entries()) {
      if (!line.startsWith("|")) failureColumn = -1;
      const cells = line.split("|");
      if (cells.includes(" 失败条件 ")) failureColumn = cells.indexOf(" 失败条件 ");
      const scanned = failureColumn >= 0 ? cells.filter((_, i) => i !== failureColumn).join("|") : line;
      const machineCommand = /`run-state\.cjs (?:init|migrate)`/.test(line);
      if (!machineCommand && LEGACY_USER_MODEL.some(pattern => pattern.test(scanned)) && !/(移除|禁止|不得|不进入|不要求|仅用于机器|内部|废弃|清理|旧|迁移|无需|不增加|不作为|不携带)/.test(scanned)) issues.push(fail("Legacy PM user-model leakage", { file, line: n + 1, text: line.trim() }));
    }
  }
  const skill = read("SKILL.md", issues);
  const adversarial = read("references/adversarial-review.md", issues);
  if (!/^name:\s*pm-spark\s*$/m.test(skill) || !/^version:\s*6\.1\.0\s*$/m.test(skill)) issues.push(fail("Invalid SKILL identity or version"));
  const adversarialRequirements = ["不新增 PM 工作模式、阶段、交付等级或权限选择", "不要求六维度全部有答案", "每轮最多问一个", "不要求用户当轮逐项回答", "不播报门禁编号、角色名、机器状态或严重性枚举", "模式一、二仅在对话交付", "独立 `review-log.md` 仅在用户明确要求时生成", "不因轻量而跳过或取消阻断", "从未完成的关键项继续", "审查通过不授予实施或外部动作权限", "不得虚构对话、证据或通过状态"];
  if (adversarialRequirements.some(text => !adversarial.includes(text)) || /S3（输出准备）|8F（输出生成）|Lightweight 路径下|解决或豁免后才能产出|与三文档同目录/.test(adversarial)) issues.push(fail("Adversarial review is incompatible with the v6.1 PM protocol"));
  const agent = read("agents/openai.yaml", issues);
  if (!agent.includes('display_name: "PM Spark"') || !agent.includes("$pm-spark") || agent.includes("$spec-analyze")) issues.push(fail("Invalid agent entry identity"));
  const specFiles = ["SKILL.md", "references/spec-templates.md", "references/handoff-format.md", "references/output-templates.md", "references/spec-document-reviewer-prompt.md"];
  for (const issue of checkSpecContract(Object.fromEntries(specFiles.map(file => [file, read(file, issues)])))) issues.push(fail(`Spec delivery contract: ${issue}`));
  for (const issue of checkDecisionLogContract(read("references/decision-log-format.md", issues))) issues.push(fail(`Decision log contract: ${issue}`));
  const annotation = spawnSync(process.execPath, [path.join(ROOT, "scripts/test-annotations.cjs")], { encoding: "utf8", timeout: 60000 });
  if (annotation.status !== 0) issues.push(fail("Product-only annotation regression failed", { detail: annotation.error?.message || annotation.stderr || annotation.stdout }));
  const browser = readJson("tests/annotations/browser-results.json", issues);
  if (!["passed", "failed", "blocked", "unverified", "not_run"].includes(browser?.status)) issues.push(fail("Invalid browser status"));
  if (browser?.status === "failed") issues.push(fail("Browser behavior failed"));
  const browserIds = ["badge-position", "bidirectional-highlight", "scroll-linkage", "scene-switch", "mobile-fallback"];
  const browserComplete = browser?.status === "passed" && browser.runner === "playwright" && filled(browser.browser) && filled(browser.version) && filled(browser.recorded_at) && Number.isFinite(Date.parse(browser.recorded_at)) && Array.isArray(browser.page_errors) && browser.page_errors.length === 0 && Array.isArray(browser.scenarios) && browser.scenarios.length === browserIds.length && browserIds.every(id => browser.scenarios.filter(item => item.id === id && item.status === "passed").length === 1) && locatedEvidence(browser.evidence) && Array.isArray(browser.evidence.observations) && browserIds.every(id => browser.evidence.observations.filter(item => item.id === id && item.dom && typeof item.dom === "object").length === 1);
  if (!browserComplete) blockers.push("Browser must pass all runtime scenarios with locatable evidence");
  if (browser?.status === "passed" && !browserComplete) issues.push(fail("Passed browser record lacks complete runtime evidence"));
  const releaseReady = issues.length === 0 && blockers.length === 0;
  const outputIssues = release ? [...issues, ...blockers.map(message => fail(message))] : issues;
  const result = { ok: outputIssues.length === 0, mode: release ? "release" : "development", release_ready: releaseReady, completion_claim: releaseReady ? "Release evidence complete" : "Not release-ready; development checks do not establish release completion", stage: "v6.1-phase-1", expected_version: EXPECTED_VERSION, scanned_files: activeFiles, scenario_count: ids.size, behavior_results_status: results?.overall_status || "unknown", annotation_regression_status: annotation.status === 0 ? "passed" : "failed", demo_browser_status: browser?.status || "unverified", demo_browser_reason: browser?.reason || null, release_blockers: blockers, issue_count: outputIssues.length, issues: outputIssues };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
main();
