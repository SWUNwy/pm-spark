# governance-001: Constitution Enforcement

id: governance-001
purpose: Verify a detected project Constitution becomes enforced state rather than optional context.
user_input: 分析这个项目的需求并生成 Standard Spec；项目里有 .claude/constitution.md。
expected_track: Specify
expected_behavior: Detect and hash the Constitution, assess supported overrides, create custom gates, and apply them before leaving Intake.
must_not_do: Must not ignore the Constitution, let it grant implementation or external-action approval, or continue after hash drift.
passing_criteria: Constitution is applied with evidence; declared gates block their configured phase; drift invalidates the run.
excellent_response_snippet: 已检测到项目 Constitution；先固化其约束和附加 Gate，再进入 Scope。
risk_level: high
input_maturity: M3
expected_depth: Standard Spec
required_references: references/constitution.md,references/gates.md
forbidden_references: none
hard_fail_checks: constitution_not_ignored
expected_state_sequence: intake -> constitution applied -> scoped
required_gates: G1 plus Constitution-defined gates
stop_condition: Stop progression when the Constitution conflicts, changes, or cannot be reliably interpreted.

