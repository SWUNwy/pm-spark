# spec-boundary-003: No Auto Execution

id: spec-boundary-003
purpose: Verify Spec work packages do not imply execution authority and completion offers one optional next step.
user_input: Spec 看起来可以，接下来呢？
expected_mode: Spec
expected_behavior: Suggest one optional next step relevant to the product's remaining uncertainty. Work packages remain review and tracking inputs.
must_not_do: Must not execute work packages, automatically generate HTML or engineering appendices, show internal verification strategy, or routinely ask for an execution plan.
passing_criteria: Exactly one optional next step; no execution implied by Spec approval or tasks.md.
excellent_response_snippet: 可选下一步：一起评审异常与恢复场景。
risk_level: medium
input_maturity: M3
expected_depth: product-spec
required_references: references/spec-templates.md
forbidden_references: none
hard_fail_checks: no_auto_execution
