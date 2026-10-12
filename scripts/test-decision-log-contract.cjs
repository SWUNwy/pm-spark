"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { checkDecisionLogContract } = require("./decision-log-contract.cjs");
const root = path.resolve(__dirname, "..");
const text = fs.readFileSync(path.join(root, "references/decision-log-format.md"), "utf8");
assert.deepEqual(checkDecisionLogContract(text), []);
const mutations = [
  ["## 对话内简要记录", "## 决策级记录"],
  ["不绑定输出路径", "Full 路径输出中包含此提示"],
  ["### 判断依据", "### Anti-anchor Check"],
  ["最影响结论的变量：", "参考信息："],
  ["推翻条件：", "补充说明："],
  ["每轮最多一个需要用户回答的问题", "每轮要求用户填完模板"],
  ["未获 PM 确认时写“建议”", "推荐即视为已确认"],
  ["工程实现或工程验证内容仅在用户明确要求时单独交付", "默认附加工程实现与验证"],
  ["不自动追加 PRD、Spec 或实现", "自动追加 PRD、Spec 或实现"],
  ["仅在先前讨论可能影响当前选择时", "每次都必须完成"],
  ["不表示获准实施", "表示获准实施"],
  ["不代表真实用户决策或真实对话验收证据", "代表真实对话已通过"],
  ["建议先做超时待办提醒", "Use optimistic UI for status update"],
  ["## 何时记录决策", "## 用户权限选择"]
];
for (const [oldText, newText] of mutations) {
  assert(text.includes(oldText), `mutation target missing: ${oldText}`);
  assert(checkDecisionLogContract(text.replaceAll(oldText, newText)).length > 0, `contract must reject: ${newText}`);
}
const checker = fs.readFileSync(path.join(root, "scripts/check-v6-contract.cjs"), "utf8");
assert.match(checker, /checkDecisionLogContract\(read\("references\/decision-log-format\.md", issues\)\)/);
console.log("Decision log contract: passed (current file + 14 rejected mutations + v6 checker integration; static checks only)");
