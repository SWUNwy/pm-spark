"use strict";

function checkSpecContract(files) {
  const issues = [];
  const requireText = (file, pattern, message) => {
    if (!pattern.test(files[file] || "")) issues.push(`${file}: ${message}`);
  };
  const spec = "references/spec-templates.md";
  const skill = "SKILL.md";
  const mode = (files[skill] || "").split("### 4C Spec 三文档")[1]?.split("## 模式五")[0] || "";
  const fixed = /proposal\.md`?\s*\+\s*`?design\.md`?\s*\+\s*`?tasks\.md/;
  for (const file of [spec, "references/handoff-format.md"]) {
    requireText(file, fixed, "missing fixed three-document contract");
    requireText(file, /需求类型适用且用户明确请求/, "appendices must require applicability and explicit request");
    requireText(file, /不.*(?:隐式|自动).*(?:增减|扩张|生成)/, "missing implicit file expansion prohibition");
    requireText(file, /(?:只提供一个|只提供一个符合).*可选下一步/, "missing single optional next step");
  }
  if (!fixed.test(mode)) issues.push("SKILL.md: mode 4C missing fixed artifacts");
  for (const phrase of [/需求类型适用且用户明确请求/, /可追踪工作包/, /不暗示执行授权/, /不固定询问执行计划/, /验证策略与等级不进入用户输出/]) {
    if (!phrase.test(mode)) issues.push(`SKILL.md: mode 4C missing ${phrase.source}`);
  }
  for (const file of [spec, "references/output-templates.md", "references/spec-document-reviewer-prompt.md"]) {
    if (/\b(?:Light|Standard|Verified) Spec\b/.test(files[file] || "")) issues.push(`${file}: legacy Spec delivery tiers`);
  }
  requireText(spec, /## 技术章节适用性/, "missing conditional technical sections");
  requireText(spec, /不适用.*N\/A — 原因/, "missing N/A reasons");
  requireText(spec, /适用但未请求.*未展开/, "missing unrequested technical-content handling");
  requireText(spec, /编号 \| 工作包.*负责人.*依赖.*对应设计章节.*对应验收标准.*完成条件.*状态/, "work packages must be traceable");
  requireText(spec, /内部验证策略[\s\S]*不出现在用户输出/, "internal review must remain internal");
  requireText(spec, /constitution[\s\S]*不能隐式增加产品交付物/, "constitution must not expand defaults");
  requireText(spec, /## proposal\.md[\s\S]*## design\.md[\s\S]*## tasks\.md/, "missing product templates");
  if (/Do you want me to prepare an execution plan|要同时生成 HTML 注释面板吗/.test(mode + (files[spec] || ""))) issues.push("fixed execution/HTML follow-up leaked into Spec delivery");
  return issues;
}

module.exports = { checkSpecContract };
