#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const intake = fs.readFileSync(path.join(ROOT, "references/intake-audit.md"), "utf8");
const quality = fs.readFileSync(path.join(ROOT, "references/quality-checklists.md"), "utf8");
const skill = fs.readFileSync(path.join(ROOT, "SKILL.md"), "utf8");
const router = fs.readFileSync(path.join(ROOT, "references/router.md"), "utf8");
const testsDir = path.join(ROOT, "tests");
const index = JSON.parse(fs.readFileSync(path.join(testsDir, "index.json"), "utf8"));
const acceptance = index.behavior_acceptance;
assert.strictEqual(acceptance.real_conversation_required, true);
assert.strictEqual(acceptance.required_status, "passed");
const scenarios = JSON.parse(fs.readFileSync(path.join(testsDir, acceptance.scenarios), "utf8"));

assert.match(intake, /按需检查/);
assert.match(quality, /与 v6\.1 验收的边界/);
assert.match(quality, /不是新的等级、轨道或权限选择/);
assert.match(quality, /不得推断真实对话已通过/);
assert.match(quality, /不代表 Spec 就绪、实施授权或发布完成/);
assert.match(quality, /信息足够时停止，不要求六个维度全部有答案/);
assert.doesNotMatch(quality, /双门禁通过条件|六维度全部\s*Ok\s*或\s*Waived/);
assert.match(intake, /会改变当前结论、范围、风险(?:判断)?或交付类型/);
assert.match(intake, /每轮只问一个/);
assert.match(intake, /足以支持当前结果[，。\s\S]*停止|信息足够/);
assert.doesNotMatch(intake, /Lightweight|全量补齐|前置门禁|门禁未过|六维度全部/);
assert.match(skill, /不要求六个维度全部有答案/);
assert.match(skill, /按影响提问/);
assert.match(router, /不要求先完成一套完整摄入检查/);
const scenarioIds = scenarios.scenarios.map((scenario) => scenario.id);
assert.strictEqual(new Set(scenarioIds).size, scenarioIds.length, "PM scenario IDs must be unique");
for (const id of ["pm-009-stop-and-terms", "pm-010-intake-sufficiency", "pm-011-intake-single-question"]) {
  assert(scenarioIds.includes(id), `Missing PM behavior scenario: ${id}`);
}
for (const entry of index.cases) {
  assert(!scenarioIds.includes(entry.id), `PM behavior scenario must not alias a legacy regression: ${entry.id}`);
  const text = fs.readFileSync(path.join(testsDir, entry.file), "utf8");
  const id = text.match(/^id:\s*(.+)$/m)?.[1].trim();
  assert.strictEqual(entry.id, id, `Regression ID must match its file: ${entry.file}`);
}
for (const file of [acceptance.results_template, acceptance.results]) {
  const record = JSON.parse(fs.readFileSync(path.join(testsDir, file), "utf8"));
  const ids = record.scenarios.map((scenario) => scenario.id);
  assert.deepStrictEqual(ids.slice().sort(), scenarioIds.slice().sort(), `PM records must cover the scenario catalog: ${file}`);
}
const sufficiency = scenarios.scenarios.find((scenario) => scenario.id === "pm-010-intake-sufficiency");
assert(sufficiency.expected_behavior.includes("信息足够支持问题陈述时停止澄清"));
assert(sufficiency.must_not_do.includes("要求全量补齐后才输出"));
const singleQuestion = scenarios.scenarios.find((scenario) => scenario.id === "pm-011-intake-single-question");
assert(singleQuestion.expected_behavior.includes("当前轮只问一个问题"));
assert(singleQuestion.must_not_do.includes("同时追问目标、用户、边界、指标和约束"));

console.log("intake audit contract: ok");
