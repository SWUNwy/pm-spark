# Spec 文档内部评审提示

三文档起草后使用。仅传工件内容、真实证据与用户明确请求的附录清单，不传预期答案。评审结果供代理内部修订，不将验证策略或等级作为 PM 交付内容。

## 评审者提示

```text
You are a Spec document reviewer. Review proposal.md, design.md and tasks.md for product review and handoff readiness.

Artifacts: [PATHS_OR_CONTENT]
Explicitly requested, applicable appendices: [LIST_OR_NONE]

Check issues that change product behavior or create handoff ambiguity:
- Completeness: problem, users, goal, scope, non-goals, observable acceptance criteria, design behavior, work packages and open questions.
- Consistency: scope, permissions, visible states, main flow, exceptions and boundaries agree across the three documents.
- Clarity: requirements cannot be interpreted in incompatible ways; unknowns have owners and status.
- Scope: no unrequested features, files, implementation detail or premature complexity.
- Testability: each acceptance criterion has an observable outcome; detailed test cases are not mandatory deliverables.
- Traceability: every work package has a stable ID, owner or explicit pending owner, dependencies, design references, AC references, completion conditions and actual status.
- Applicability: technical sections explain N/A with a specific reason; applicable but unrequested content is marked unexpanded. Product-visible async behavior remains covered.
- Appendices: test-cases, tests, API and events require BOTH applicable requirement type and explicit user request. Risk, subtype and constitution do not substitute for a request.
- Boundary: work packages, Spec approval and review approval do not grant implementation authority. A skeleton must not claim verified tests.

Check cross-document integrity:
- Every in-scope behavior maps to an acceptance criterion and design behavior.
- Each main flow and exception has an observable result; meaningful state changes have triggers.
- Each applicable field rule and page interaction maps to product behavior and feedback.
- Each work package maps to design sections and acceptance criteria.
- If requested appendices exist, check their links to product behavior and applicable failure paths.

Return internally:
Status: Approved | Issues Found
Blocking issues: location, issue, concrete product impact
Advisory recommendations: location and reason
Traceability gaps and applicability gaps
Execution boundary violations
```

## 使用规则

所有三文档做一致性检查；复杂或高风险工作增加章节评审，简单工作可合并。阻塞问题先修复；依赖用户决定而无法修复时允许交付明确标注的草稿，列出缺口、影响、负责人和最小确认方式，不得称已就绪或完成交付。非阻塞未知项标为待验证，不强制降为受阻。范围、验收、非目标与输出路径合并到一次确认；已有明确确认或指定路径直接继承，不重复确认。向 PM 说明实际产品缺口与影响，不输出内部验证等级、门禁或测试命令。通过评审不等于用户授权执行；生成后只提供一个可选下一步，不固定询问执行计划。

## PRD 检查

评审 PRD 时依据 `prd-output-template.md` 的 profile 规则运行 `scripts/validate-prd.js <path>`，修复 error。默认检查产品背景、范围、业务行为与可观察验收；工程检查仅适用于明确请求的工程规格。检查详情保留在内部。
