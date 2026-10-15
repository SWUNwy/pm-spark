# history/retired — 工作流编排

本文档《工作流编排》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# Claude Code 工作流编排（Workflow Orchestration）

用本协议把已验证的 analyze 交接继续到 Claude Code 的规划、执行与验证工作流，无需手工复制上下文。

## 边界

控制器拥有生命周期状态、工件绑定、路由请求与失败闭环。Claude Code 仍是调用 Skill 并执行项目动作的宿主。控制器绝不绕过 Claude Code 权限或人工执行门禁。

```text
verified handoff packet
  → plan-authoring (internal capability)
  → human execution approval
  → plan-execution (internal capability)
  → completion-verification (internal capability)
  → completed | blocked | stopped
```

## 状态机

```text
ready_for_plan → planning → awaiting_execution_approval
                                  ↓ human approval
                       ready_for_execution → executing
                                                ↓
                                  ready_for_verification → verifying
                                                               ↓
                                                          completed

Any non-terminal state → blocked | stopped
```

workflow 状态默认存放在交接包旁的 `workflow/workflow-state.json`，除非指定 `--root`。

## 命令

初始化并获取首个路由：

```bash
node <skill-dir>/scripts/workflow-state.cjs init \
  --packet <run-dir>/handoff-packet.json
```

随时读取路由：

```bash
node <skill-dir>/scripts/workflow-state.cjs route \
  --state <run-dir>/workflow/workflow-state.json
```

开始并完成规划：

```bash
node <skill-dir>/scripts/workflow-state.cjs start \
  --state <workflow-state> --stage plan
node <skill-dir>/scripts/workflow-state.cjs complete \
  --state <workflow-state> --stage plan --artifact <implementation-plan.md>
```

记录明确的人工批准，然后执行：

```bash
node <skill-dir>/scripts/workflow-state.cjs approve \
  --state <workflow-state> --stage execute --by user \
  --evidence "user message confirming implementation"
node <skill-dir>/scripts/workflow-state.cjs start \
  --state <workflow-state> --stage execute
node <skill-dir>/scripts/workflow-state.cjs complete \
  --state <workflow-state> --stage execute \
  --artifact <execution-result.json>
```

验证并完成：

```bash
node <skill-dir>/scripts/workflow-state.cjs start \
  --state <workflow-state> --stage verify
node <skill-dir>/scripts/workflow-state.cjs complete \
  --state <workflow-state> --stage verify \
  --artifact <verification-result.json>
```

任何完成声明前运行 `validate --state <workflow-state>`。

## 完成态

控制器到达 `completed` status 时：

1. 运行 `validate --state <workflow-state>` 确认终态。
2. 若返回 `ok=true` 且 `status=completed`：
   - 向用户返回：
     - 验证结果摘要（全部检查、验收标准及其通过/失败状态）。
     - 全部绑定工件哈希：packet、plan、execution result、verification result。
     - 最终验证结果中的任何未决阻塞项。
     - 推荐的下一个动作（如 "merge PR"、"deploy to staging"、"return to analysis"）。
   - 不要重新进入 workflow，也不要宣称更多执行授权。
3. 若验证返回错误：不宣称完成。workflow 可能处于非终态。返回精确错误并停止。

## 会话恢复

恢复既有 workflow 状态：

```bash
node <skill-dir>/scripts/workflow-state.cjs route \
  --state <run-dir>/workflow/workflow-state.json
```

按 status 处理：
- `ready_for_plan`：进入规划。
- `planning` 或 `awaiting_execution_approval`：展示当前计划并请求执行批准。
- `ready_for_execution` 或 `executing`：询问用户是恢复还是重启执行。
- `ready_for_verification` 或 `verifying`：询问是否需要重新验证。
- `completed`：展示终态结果。不要恢复。
- `blocked` 或 `stopped`：展示停止原因与后续 `next_route`。

若 workflow 状态已存在，不要重新初始化（`workflow-state.cjs init`）。既有状态是权威的。

## 阶段契约

### Plan

- 消费已验证包与每个绑定 Spec 工件。
- 按 `references/plan-authoring.md` 写具体实施计划。
- 保存包含必需 header、全局约束、文件映射、任务、复选框、命令与预期结果的实施计划。
- 不执行项目改动。
- 请求批准前用 SHA-256 绑定计划。

### Execute

- 要求由 `approve --stage execute` 记录的显式批准。
- 启动前重新校验交接包与计划哈希。
- 按 `references/plan-execution.md` 执行绑定计划。
- 用 `assets/execution-result.template.json` 保存执行结果。
- 把失效的假设、决策或验收标准追加到包的 feedback JSONL，并停止受影响路径。

### Verify

- 记录结构有效的执行结果后自动开始。
- 按 `references/completion-verification.md` 运行全新验证。
- 运行全新命令并把证据映射到验收标准。
- 用 `assets/verification-result.template.json` 保存精确命令与退出码。
- 仅当每项检查与验收项都通过、且全部绑定哈希仍匹配时完成。

## 失败路由

执行发现用 feedback 命令：

```bash
node <skill-dir>/scripts/workflow-state.cjs feedback \
  --state <workflow-state> --input <feedback-event.json>
```

使 Spec、决策、假设或验收标准失效的事件会阻塞 workflow，并把 `next_route=return_to_analyze`。不要绕过无效的分析前提打补丁。

控制器在以下情况 fail closed：

- packet、state、evidence、Spec、plan 或 execution-result 漂移；
- 缺少人工执行批准；
- 畸形或占位符过多的计划；
- 执行检查失败；
- 验收映射不完整；
- 验证命令退出码非零；
- 声称包授予实施授权的危险说法。

## 宿主集成

试点期间把 `assets/claude-handoff-routing.template.md` 作为独立的 CLAUDE.md 片段使用。它让路由在宿主层自动进行：读 `route`、调用声明的 Skill、登记输出并继续。在试点证据达到迁移阈值前，不要全局安装。
