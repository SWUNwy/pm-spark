# 交接包协议（Handoff Packet Protocol）

在 `Specify` run 完成且用户明确请求下游交接、下一阶段将由宿主代理或其他 Skill 处理时使用本协议。包保留已验证的分析边界；**它不授权实施**。

产品交付物始终为 `proposal.md` + `design.md` + `tasks.md`，详略不改变文件数量。`tasks.md` 是可追踪工作包，不能作为已获授权的执行计划。`test-cases`、`tests/`、API、events 仅在需求类型适用且用户明确请求时作为附录；subtype、风险或 constitution 都不能隐式扩张工件。

本协议的 manifest、哈希、门禁证据与验证要求是内部机器交接数据，不进入 PM 产品输出。完成三文档不要求导出包或准备执行计划；用户输出只提供一个符合当前需要的可选下一步。

## 导出前置条件

仅当所有条件成立时才导出：

1. run 的 Track 为 `specify` 且 status 为 `completed`。
2. G1、G2、G3、G-Spec、每个适用的条件门禁与每个 Constitution 门禁均为 `pass`。
3. `self-review` Check 为 `pass` 或显式 `waived`。
4. 每个声明的 Spec 工件存在且是常规文件。
5. 执行计划声明了 objective、至少一个有界 step、至少一个 verification check。
6. 项目 Constitution 自应用以来未漂移。

任一条件失败，不产出 `ready` 包。修复 run 或返回精确的未满足前置条件。

## 导出输入

创建一个小 JSON manifest。决策保留在 `evidence.jsonl` 中（`kind=decision`），不要在 manifest 中手工重复。

```json
{
  "schema_version": "1.0",
  "target": {
    "stage": "plan",
    "recommended_skill": "plan-authoring"
  },
  "spec_subtypes": ["form_data_heavy", "product_frontend"],
  "spec_artifacts": [
    { "path": "specs/proposal.md", "role": "proposal" },
    { "path": "specs/design.md", "role": "design" },
    { "path": "specs/tasks.md", "role": "work_packages" }
  ],
  "execution_plan": {
    "objective": "Implement the verified CRM Spec",
    "steps": [
      {
        "id": "S1",
        "action": "Create the domain model",
        "outputs": ["model files"],
        "depends_on": []
      }
    ],
    "verification": ["Run unit tests", "Check every acceptance criterion"],
    "constraints": ["Do not change unrelated modules"]
  }
}
```

`spec_subtypes` 可选但建议提供。允许值：`form_data_heavy`、`product_frontend`、`event_driven`、`infrastructure_algorithm`。可多选。省略时导出器回退到 `state.spec_subtypes`（若存在），否则用空数组且验证器发警告（下游 skill 会失去扩展层可见性）。

导出：

```bash
node <skill-dir>/scripts/export-handoff.cjs \
  --state <run-dir>/state.json \
  --input <handoff-input.json>
```

消费前验证：

```bash
node <skill-dir>/scripts/verify-handoff.cjs \
  --packet <run-dir>/handoff-packet.json
```

默认输出为 `<run-dir>/handoff-packet.json`。除非提供 `--force`，否则不覆盖已存在的包。

## 包契约

导出器创建：

- `handoff-packet.json`：结构化下游输入。
- `handoff-packet.sha256`：包字节的精确校验和。
- `execution-feedback.jsonl`：下游发现的追加式目标。

包包含：

| 区块 | 含义 |
|---|---|
| `source` | Run、状态快照哈希、Track、status 与项目根 |
| `readiness` | 已通过门禁与 self-review 证据 |
| `artifacts` | 按 SHA-256、大小、role 与路径绑定的 Spec 文件 |
| `context` | Goal、范围、非目标、假设、验收证据、声明的 Spec Subtypes 与决策事件 |
| `evidence_ledger` | 证据文件引用、SHA-256、条数与全部解析事件（含行号） |
| `execution` | 目标 stage/Skill、有界步骤、验证与约束 |
| `authority` | `host_policy` 说明宿主当前仓库、测试与安全策略；`approval` 说明沿用用户已有授权、必要时补充批准；包不授予实施或外部授权 |
| `feedback` | 执行发现的追加式位置与必需事件字段 |

## 旧包迁移与历史隔离

验证器拒绝当前数据中的 `action_level`、`source_action_level`、`authority.level`、`authority.source_action_level` 及旧等级语义；`authority.host_policy` 与 `authority.approval` 必须为非空字符串。旧字段即使重算 checksum 也不能使旧包通过验证。

旧包必须回到具有有效签名的源 `state.json`，运行 `run-state.cjs migrate --state <run-dir>/state.json`，再运行 `export-handoff.cjs --state <run-dir>/state.json --input <handoff-input.json> --force`。导出器重新绑定源 state、checkpoint 与证据哈希，并生成新的包 checksum；不支持直接修补旧包绕过源迁移。

迁移保留原始 `history` 与追加式审计日志、证据文件原始字节。旧等级字段、相关 assumptions 与 working memory 移入 `state.historical_compatibility`，显式标记 `excluded_from_current_context=true`；历史事件与旧证据也在此隔离区登记。它们不能作为当前状态、授权或规划依据。checkpoint 的当前摘要排除旧等级假设与证据；新包 `context` 只包含当前假设与当前决策。`evidence_ledger.events` 中的旧事件以 `historical_compatibility.original_event` 包装，保留行号与源文件哈希，消费者只能将其用于历史审计。

## Spec Subtype 传播

`context.spec_subtypes` 是内部适用性提示，不授权生成工程附录。产品三文档根据实际行为覆盖下表内容；下游只有在用户已请求相应工程交接时才展开技术契约或验证细节。

| Subtype 值 | 产品设计覆盖 | 请求工程交接后适用的检查 |
|---|---|---|
| `form_data_heavy` | 字段含义、展示、编辑、业务校验与反馈 | 字段与数据映射、规则覆盖 |
| `product_frontend` | 页面、操作、可见状态与异常反馈 | 页面/交互工作包与错误态 |
| `event_driven` | 异步结果、副作用与失败补救 | 明确请求的 events 契约、幂等与失败路径 |
| `infrastructure_algorithm` | 行为变化、指标与兼容边界 | 明确请求的技术与性能验证 |

类型缺失时结合设计与范围确认判断，不能默认补 API、events 或 tests。适用但未请求的技术内容记录未展开原因；不适用写具体原因。

## 消费者协议

规划或实施前，下游消费者必须：

1. 重算 `handoff-packet.sha256` 与每个工件哈希。
2. 确认 `source.status=completed`、`source.track=specify`、`readiness.status=ready`。
3. 改计划前读 `context.assumptions`、`context.decisions` 与矛盾证据。
4. 把 `execution.steps` 视为规划输入，不是许可或不可变指令。
5. 应用宿主代理当前的批准、仓库、测试与安全策略。
6. 若实施使假设、决策、验收标准或 Spec 文件失效：停止受影响的步骤，并向 `execution-feedback.jsonl` 追加事件。

推荐反馈事件：

```json
{
  "timestamp": "2026-07-20T00:00:00.000Z",
  "kind": "assumption_invalidated",
  "step_id": "S1",
  "claim": "The existing RBAC model cannot express the required scope",
  "evidence": "src/rbac/model.ts:42",
  "impact": "Spec decision D2 must be revisited",
  "recommended_route": "return_to_analyze"
}
```

Claude Code 场景继续读 `workflow-orchestration.md`：它增加共享生命周期状态与宿主驱动的路由（plan-authoring → 人工执行门禁 → plan-execution → completion-verification）。宿主仍执行 Skill 调用；无人值守执行与多宿主调度仍在本阶段之外。
