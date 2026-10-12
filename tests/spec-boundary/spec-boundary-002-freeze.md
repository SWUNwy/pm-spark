# spec-boundary-002: Spec Freeze

id: spec-boundary-002
purpose: Verify fixed three-document generation asks for scope confirmation without delivery tiers.
user_input: 范围是 Brainstorm Mode，验收标准是能处理模糊输入和分支整理，非目标是不执行代码。现在生成精简 Spec。
expected_mode: Spec
expected_behavior: Restate scope, observable acceptance criteria and non-goals; confirm proposal.md + design.md + tasks.md. Brevity changes detail only. No appendix is requested.
must_not_do: Must not write before freeze confirmation, reduce output to proposal only, add test-cases/tests/API/events, or offer delivery tier choices.
passing_criteria: Confirmation declares exactly three product artifacts and no unrequested appendices.
excellent_response_snippet: 确认以上范围后，生成 proposal.md、design.md 和 tasks.md，内容保持精简。
risk_level: medium
input_maturity: M3
expected_depth: product-spec
required_references: references/spec-templates.md
forbidden_references: none
hard_fail_checks: no_auto_file_write,no_spec_without_freeze
