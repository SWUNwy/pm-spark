# history/retired — 框架组合

本文档《框架组合》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 框架组合（Framework Combinations）

## 规则

- 默认上限：1 个主框架 + 1-2 个辅助框架。
- Brief：1 个框架。
- Standard：1 个主 + 1 个辅助。
- Deep：1 个主 + 2 个辅助。
- Decision-grade：允许多框架，但分阶段。
- 默认只命名主框架。

## 常见组合

| 任务 | 主框架 | 辅助 | 输出 |
|---|---|---|---|
| 模糊想法探索 | First Principles | 5W2H | Idea Map |
| 用户价值探索 | JTBD | Kano | Direction Brief |
| 产品功能优先级 | RICE/ICE | Kano | Decision Analysis |
| 战略选择 | Weighted Decision Matrix | Pre-mortem、Regret Minimization | Decision-grade |
| 需求就绪 | Definition of Ready | Scope Box | Spec Readiness Check |
| 行为规格化 | Given-When-Then | Example Mapping | Standard Spec |
| 高风险实施 | FMEA | Test Pyramid | Verified Spec |
| 商业模式探索 | Lean Canvas | Value Proposition Canvas | Strategy Analysis |
| 复杂生态 | Systems Thinking | Wardley Mapping | Strategy Analysis |
| 长会话恢复 | Stage Summary | Assumption Map | Stage Summary |

## 冲突处理

框架结论冲突时：

1. 解释冲突来自哪里。
2. 点名哪个标准应主导。
3. 给出推荐优先级。

示例：

```text
Kano says this is a delighter, but RICE says impact is low. Because the current goal is reliability, RICE should dominate now; keep the delighter for later.
```
