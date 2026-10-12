# spec-boundary-004: Spec Reviewer

id: spec-boundary-004
purpose: Verify all product Spec documents receive internal review without file expansion.
user_input: 我确认生成三文档。请写得深入些，先检查流程、状态、异常和验收有没有矛盾和缺口。
expected_mode: Spec
expected_behavior: Generate proposal.md + design.md + tasks.md and internally review completeness, consistency, observable acceptance, applicability and work-package traceability. Explain N/A reasons in technical sections.
must_not_do: Must not add test-cases/tests/API/events because of depth or risk, leak verification tiers or strategy, or treat review approval as execution approval.
passing_criteria: Product behavior is complete, technical sections have applicability reasons, work packages link design and AC, no unrequested appendices, only one optional next step.
excellent_response_snippet: 三份文档已生成；tasks.md 的工作包可用于评审和分工。可选下一步：确认待定业务规则。
risk_level: high
input_maturity: M3
expected_depth: product-spec
required_references: references/spec-templates.md,references/spec-document-reviewer-prompt.md
forbidden_references: none
hard_fail_checks: no_auto_execution
