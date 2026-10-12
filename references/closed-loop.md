# 闭环协议（Closed Loop Protocol）

## 1. 目的

让一次分析任务可恢复、可验证、有界、并诚实地停止。这是**内层闭环**，不是任务调度器，也不是无人值守的多会话服务。

## 2. Run 目录

```text
.analyze/runs/<run-id>/
├── state.json          # 权威生命周期状态
├── evidence.jsonl      # 追加式证据与验证事件
├── checkpoint.md       # 人读恢复摘要
├── result.md           # 可选：被要求的交付物
└── result.jsonl        # 可选：大结果存储（store-result 命令）
```

不要存密钥、完整的私有来源转储或无关对话历史。只存恢复所需：引用、短摘录、哈希与结论。

### 工作记忆（Working Memory）

工作记忆（存于 `state.json.working_memory`）跨阶段跟踪上下文：

| 字段 | 类型 | 用途 |
|---|---|---|
| `key_findings` | `array[{id, content, added_at, status}]` | 影响后续阶段的发现 |
| `active_decisions` | `array[{id, content, added_at, status}]` | 综合阶段形成的决策 |
| `current_plan_step` | `string|null` | 当前正在执行的步骤 |
| `open_questions` | `array[{id, content, added_at, status}]` | 未决问题 |
| `risks` | `array[{id, content, added_at, status}]` | 已识别的风险与缓解 |

用 `remember` 添加条目，恢复时用 `recall`：

```bash
node scripts/run-state.cjs remember --state <state.json> --field key_findings --content "found pattern X"
node scripts/run-state.cjs recall --state <state.json>
```

## 3. 状态

| 状态 | 含义 | 退出条件 |
|---|---|---|
| `intake` | 目标与授权已捕获 | 信息足以安全定界 |
| `scoped` | 目标契约与验证计划已固定 | 发现类问题已排优先级 |
| `discovering` | 证据收集与假设检验中 | 证据充分或预算耗尽 |
| `synthesizing` | 发现/选项/建议已成型 | 草稿结果存在 |
| `verifying` | 确定性与语义检查执行中 | 通过或显式记录失败 |
| `repairing` | 修复失败的检查 | 回到 verifying |
| `awaiting_user` | 一个不可替代的人工决策/批准 | 用户给出决策或取消 |
| `completed` | 完成门禁通过 | 终态 |
| `stopped` | 预算/风险/用户触发停止 | 终态，仅可经新 run 决策恢复 |
| `blocked` | 外部依赖阻止有意义进展 | 当前 run 终态 |

允许的转换由 `scripts/run-state.cjs` 强制执行。

离开 `intake` 前必须通过 G1 并应用检测到的项目 Constitution。`decomposition_required=true` 时，G-Decompose 也必须通过。进入 `verifying` 前，通过 G2 及所有分配给该阶段的轨道条件门禁与 Constitution 门禁。

## 4. 目标契约（Goal Contract）

记录：

- 期望结果与交付物。
- 主导轨道与深度。
- Analyze 轨道的分析类型。
- 实例化的 Track 阶段契约。
- 范围与非目标。
- 已知输入与事实来源。
- 待检验假设。
- 验收证据与语义评分标准。
- 宿主策略、用户已有授权、必要的补充批准与人工门禁。
- 最大修复迭代次数、时间/成本代理与停止条件。
- 条件门禁标记：拆解、章节评审、人工承诺。

用户未提供的字段，提议合理默认值。只问那些改变安全结果的字段。

## 5. 证据协议（Evidence Protocol）

每条证据事件包含：

```json
{
  "timestamp": "ISO-8601",
  "kind": "user_fact|local_source|external_source|inference|validation|decision",
  "source": "path, URL, user turn, or check id",
  "claim": "short normalized claim",
  "confidence": "low|medium|high",
  "status": "supports|contradicts|unknown",
  "notes": "optional"
}
```

只追加，不静默改写历史。取代性证据应在 notes 中引用早前声明。

## 6. 检查点协议（Checkpoint Protocol）

在以下时点写检查点：Scope 之后、Verify 之前、每次 Repair 之后、Stop/Block 之前。包含：

- 目标与当前状态。
- 已确认发现与证据引用。
- 未决假设与矛盾。
- 已完成与待办检查。
- 迭代/预算使用。
- 精确的下一步动作。

恢复从最近**已验证的检查点**开始，而不是从最后生成的一段文字。

## 7. 验证循环（Verification Loop）

```text
draft → deterministic validation → semantic rubric →
  pass: complete
  recoverable failure: record → repair highest-impact failure → verify
  authority/evidence gap: awaiting_user or blocked
  budget exhausted: stopped
```

默认最大修复迭代 2 次。只有当方法发生实质变化时才算一次重试；重复同一提示不算修复。

用 `failure-handling.md` 对失败分类。修复必须改变证据、拆解、路由、范围、工件或验证方法之一。

## 8. 停止规则（Stop Rules）

以下情况立即停止：

- 缺少必要授权。
- 来源实质矛盾且无解决途径。
- 更换修复尝试后同一验证失败再次出现。
- 最大迭代或声明预算耗尽。
- 必要来源不可访问，且条件分析会误导。
- 用户取消，或目标变化大到需要新 run。

停止时保留状态并返回：哪些已完成、哪些失败、证据、影响、精确的解除阻塞条件。

## Specify 交接快照

Specify run 完成后，用 `scripts/export-handoff.cjs` 导出版本绑定包，并用 `scripts/verify-handoff.cjs` 验证。包内快照 state、Gates、证据、假设、决策、Spec 工件哈希与下游验证要求。工件或证据漂移使包失效，并把工作路由回 Specify/Repair。导出不增加 Execution 状态；交接包的 `authority.host_policy` / `authority.approval` 要求下游遵循宿主当前策略及用户已有授权，必要时补充批准。生产者与消费者契约见 `handoff-format.md`。

Claude Code 续跑时初始化 `scripts/workflow-state.cjs`。把下游 Plan、批准、Execute、Verify 生命周期放在独立 workflow 状态中；不要把 Execution 重新引入 analyze 认知轨道。阶段契约与失败路由见 `workflow-orchestration.md`。

## 9. 完成规则（Completion Rules）

完成要求：

- 状态结构校验通过。
- 被要求的交付物存在于请求的渠道/路径。
- 无硬失败残留。
- 语义评分标准达到阈值。
- 必要的条件/Constitution 门禁通过。
- 机器可见的 `self-review` Check 通过或有授权豁免（waiver）。
- 重要声明可追溯或标注为假设。
- 反方论点与失效触发条件可见。
- 下一步动作与剩余风险明确。

不要把措辞漂亮等同于完成。

## 10. 护栏（Guardrails）

护栏在闭环运行时强制安全约束。完整细节见 `references/guardrails.md`。

| 护栏 | 阶段 | 动作 |
|---|---|---|
| GR-1: 无未授权代码执行 | Complete | `block` |
| GR-2: 不外部修改 state.json | Verify | `warn` |
| GR-3: 不在 .analyze/ 外创建工件 | Discover | `block` |
| GR-4: 不重复同一修复策略 | Repair | `force_stop` |
| GR-5: 不超过最大参考深度 | Scope | `degrade` |
| GR-6: 不泄漏敏感字段 | Synthesize | `filter` |

## 11. 阶段 2 扩展边界

本协议明确排除：任务队列、调度、事件触发、无人值守执行与并行 worker。未来的外层 Loop 只有在真实任务稳定性被证明后，才可选择 run 并调用本 Harness。

**Phase 2（v2.2）新增：** 护栏、工作记忆、Prompt Budget、分层验证模式、大结果存储与角色矩阵。这些是运行时增强，不改变闭环协议本身。
