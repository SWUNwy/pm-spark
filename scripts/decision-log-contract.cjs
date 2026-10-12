"use strict";

function checkDecisionLogContract(text) {
  const issues = [];
  const required = [
    [/模式三和模式五/, "missing applicable PM modes"],
    [/轻量 \/ 标准 \/ 深度仅影响.*详略，不改变产品交付边界/, "depth must not change delivery boundaries"],
    [/未获 PM 确认时写“建议”/, "recommendation must not imply PM confirmation"],
    [/已有信息足够.*停止/, "missing sufficiency stop rule"],
    [/每轮最多一个需要用户回答的问题/, "missing single-question rule"],
    [/不杜撰数据、评分、权重或成本估算/, "missing evidence integrity rule"],
    [/工程实现或工程验证内容仅在用户明确要求时单独交付/, "missing explicit engineering request boundary"],
    [/不自动追加 PRD、Spec 或实现/, "missing delivery expansion prohibition"],
    [/最多一个可选建议/, "missing single optional next step"],
    [/最影响结论的变量：/, "missing reversal variable"],
    [/推翻条件：/, "missing reversal conditions"],
    [/仅在先前讨论可能影响当前选择时/, "prior-context review must be conditional"],
    [/交付状态仅使用草稿 \/ 待确认 \/ 已就绪 \/ 受阻/, "invalid delivery status contract"],
    [/已就绪.*不表示获准实施/, "ready must not authorize execution"],
    [/PM 确认方案也不自动授予实施或外部动作权限/, "PM confirmation must not authorize actions"],
    [/不代表真实用户决策或真实对话验收证据/, "examples must not claim real evidence"]
  ];
  for (const [pattern, message] of required) if (!pattern.test(text)) issues.push(message);
  const forbidden = [
    [/Full 路径|Decision-grade|决策级记录/, "legacy path or delivery tier"],
    [/Anti-anchor Check|Context Basis|Proposed \/ Confirmed \/ Revisit/, "internal or English template terminology"],
    [/optimistic UI|Wait-for-API|Stripe|payment provider|\b\d+ms\b/, "engineering examples in default PM record"],
    [/^\|.*(?:Criterion|Weight).*\|$/m, "mandatory scoring template"],
    [/^#{1,6}.*(?:等级|权限选择)/m, "new user-facing grade or permission selection"]
  ];
  for (const [pattern, message] of forbidden) if (pattern.test(text)) issues.push(message);
  return issues;
}

module.exports = { checkDecisionLogContract };
