"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { checkSpecContract } = require("./spec-contract.cjs");
const root = path.resolve(__dirname, "..");
const names = ["SKILL.md", "references/spec-templates.md", "references/handoff-format.md", "references/output-templates.md", "references/spec-document-reviewer-prompt.md"];
const files = Object.fromEntries(names.map(file => [file, fs.readFileSync(path.join(root, file), "utf8")]));
assert.deepEqual(checkSpecContract(files), []);
const mutations = [
  ["references/spec-templates.md", "## tasks.md", "## omitted-work.md"],
  ["references/spec-templates.md", "| 编号 | 工作包 / 目标 | 范围与产出 | 负责人 | 依赖 | 对应设计章节 | 对应验收标准 | 完成条件 | 状态 |", "| 工作 | 状态 |"],
  ["SKILL.md", "验证策略与等级不进入用户输出", "向用户展示验证等级"],
  ["references/spec-templates.md", "# Spec 三文档模板", "# Standard Spec"],
  ["references/handoff-format.md", "需求类型适用且用户明确请求", "根据风险自动生成"]
];
for (const [file, oldText, newText] of mutations) {
  assert(files[file].includes(oldText), `mutation target missing: ${file}`);
  const changed = { ...files, [file]: files[file].replace(oldText, newText) };
  assert(checkSpecContract(changed).length > 0, `contract must reject: ${newText}`);
}
for (const file of ["spec-boundary-002-freeze.md", "spec-boundary-003-no-auto-execution.md", "spec-boundary-004-reviewer.md"]) {
  const test = fs.readFileSync(path.join(root, "tests/spec-boundary", file), "utf8");
  assert.doesNotMatch(test, /(?:Light|Standard|Verified) Spec/);
}
console.log("Spec delivery contract: passed (current files + 5 rejected mutations + 3 scenario contracts)");
