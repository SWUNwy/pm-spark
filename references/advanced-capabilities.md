# history/retired — 进阶能力说明

本文档《进阶能力说明》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 进阶能力索引（Advanced Capabilities）

> 登记范围：`scripts/run-state.cjs` 与 `scripts/workflow-state.cjs` 中已实现、但 SKILL.md 主流程未逐条讲解的命令。核心命令已在主流程覆盖，此处仅为汇总；其余子系统均属**实验性**——接口可能变化，不参与主流程 Gate 依赖。

## 一、核心闭环命令（主流程已覆盖，汇总备查）

| 命令 | 用途 | 关键参数 |
|---|---|---|
| `init` | 初始化一次分析 run | `--root --goal --track --max-iterations --run-id --depth` |
| `contract` | 写入 Goal Contract / Track Stage Contract | `--input <contract.json>` |
| `constitution` | 登记项目宪章评估 | `--input --evidence` |
| `transition` | 状态机流转（10 状态） | `--to --reason [--next-action]` |
| `gate` | 记录 Gate 结论（pass 必须带 `--evidence`） | `--id --status --evidence` |
| `evidence` | 追加证据条目（`--auto-detect` 检测矛盾） | `--kind --source --claim --confidence --status` |
| `check` | 记录检查项（如 `self-review`） | `--id --status [--evidence]` |
| `checkpoint` | 生成人读恢复摘要 | `--state` |
| `validate` | 状态结构校验 | `--state` |
| `status` | 查看当前状态 | `--state` |
| `budget` | Token 预算估算与降级建议 | `--state [--auto-degrade]` |
| `recall` | 恢复工作记忆 | `--state` |
| `remember` / `forget` | 增删工作记忆条目 | `--field --content` / `--field --id` |
| `store-result` | 大结果外置存储 | `--content [--type]` |
| `guardrail` | 6 条内置 Guardrail 的检查/覆盖/列表 | `--add / --override / --check / --list` |
| `migrate` | 补齐旧状态门禁并清理废弃权限字段，记录迁移事件 | `--state` |
| `retry-policy` | 查看/修改修复预算 | `--set-iterations` |

## 二、上下文工程（实验性）

| 命令 | 用途 | 支撑文档 |
|---|---|---|
| `compact` | 证据/历史/引用三级压缩 | 无独立文档，以 `usage` 为准 |
| `context-score` | 信噪比/时效性/记忆利用率/一致性/相关性衰减五维评分 | 无独立文档 |
| `assemble-context` | 按配置组装上下文 | `references/context-assembly.md` |
| `context-trace` | 引用链追踪 | 无独立文档 |
| `cross-session-context` | 跨 run 相似目标检索 | `references/cross-session-context.md` |
| `context-prune` | 工作记忆/证据修剪 | 无独立文档 |

## 三、提示工程（实验性）

| 命令 | 用途 | 支撑文档 |
|---|---|---|
| `verify-compliance` | 9 条操作契约的运行时检测 | 无独立文档 |
| `adapt-prompt` | 五维提示自适应 | `references/prompt-adaptation.md`、`references/model-profiles.md` |
| `prompt-score` | 提示质量评分 | 无独立文档 |
| `prompt-ab` | 提示变体 A/B 创建/运行/评估 | 无独立文档 |
| `prompt-evolve` | 变体部署/晋升/回滚 | 无独立文档 |
| `patch` | 提示/参考/配置/模板/状态补丁 | `references/patch-templates.md` |
| `shadow` | 补丁影子验证/晋升 | `references/patch-templates.md`、`references/predictive-signals.md` |

## 四、循环与诊断（实验性）

| 命令 | 用途 | 支撑文档 |
|---|---|---|
| `diagnose` | 门禁/证据/修复/历史四类故障诊断 | `references/root-cause-framework.md` |
| `longitudinal` | 跨 run 趋势与退化检测 | `references/longitudinal-metrics.md` |
| `predict` | 失败前兆信号（shadow → active） | `references/predictive-signals.md` |
| `runtime-adapt` | 运行时规则触发（支持 dry-run） | 无独立文档 |
| `causal` | 五维排除式根因分析 | `references/causal-analysis.md` |
| `autonomy` | AL-1/2/3 自主级别 | `references/autonomy-levels.md` |
| `meta` | 循环健康/诊断/改进建议 | 无独立文档 |
| `cross-skill` | 跨 skill 模式推送/拉取/推荐 | 无独立文档 |
| `insights` | 运行洞察（周报/对比） | 无独立文档 |
| `dashboard` | 文本仪表盘 | 无独立文档 |
| `analysis-quality` | 五维分析质量评估 | 无独立文档 |
| `decision` | 决策记录/假设清单/评审 | `references/decision-log-format.md` |
| `guidance` | 按阶段的下一步行动建议 | 无独立文档 |

## 五、未接线文档登记（从 SKILL.md 出发不可达的 18 个 references 文件）

**有命令支撑（已通过上表接线）**：`autonomy-levels.md`、`causal-analysis.md`、`context-assembly.md`、`cross-session-context.md`、`decision-log-format.md`、`longitudinal-metrics.md`、`model-profiles.md`、`patch-templates.md`、`predictive-signals.md`、`prompt-adaptation.md`、`root-cause-framework.md`

**仅被测试场景或脚本输出间接引用**：`router-rules.md`、`transition-gates.md`、`workflow-map.md`

**修正记录（2026-08-07）**：早前把 `condition-based-waiting.md`、`defense-in-depth.md`、`root-cause-tracing.md`、`spec-frameworks.md` 判为"完全孤立"是链接分析漏判——它们被 `debugging-discipline.md` 与 `frameworks-index.md` 以纯文件名形式引用（无 `references/` 前缀）。现已补译并在引用处统一为 `references/` 前缀链接，全部转为正常引用文档。

> 接线状态是变更时点的快照，完整演进记录见 `outputs/analyze-skill-改造记录.md`（备份与追溯）。

**去重审计（2026-09-15，v3.7）**：对四组名称相近的 references 做重叠评估（阈值 70%），结论全部保留——`annotation-templates.md`（类型化模板系统）/`annotation-output-templates.md`（三路由输出格式）/`annotation-example.md`（标准形态示例与约束）职责正交；`root-cause-framework.md`（diagnose）/`root-cause-tracing.md`（调用栈追踪）/`causal-analysis.md`（causal 命令）服务三个不同消费者；`spec-frameworks.md`（思维框架）与`spec-templates.md`（文档模板）是框架与模板之分；`router-rules.md` 是被测试夹具引用的兼容垫片，指向 `router.md`。

## 已知缺陷修复记录（2026-08-07）

| ID | 缺陷 | 状态 |
|---|---|---|
| E3 | `predict` 在 transition/gate 期间自动调用未实现（文档-实现漂移） | 已修复：新增 `runPredictiveSignals`，`transition`/`gate` 后 best-effort 自动运行，不阻塞原操作；`predict` 手动模式复用同一核心 |
| E6 | `causal`/`diagnose` 把未到达阶段的 pending 门禁当失败，健康 run 误报 | 已修复：引入 gate due 语义（`gateIsDue`），按当前状态判定门禁是否到期；stopped/blocked/awaiting_user 不计 pending |
| E7 | `evidence --auto-detect` 需要 `--kind`，无法独立运行 | 已修复：无 `--kind` 时进入只读独立扫描模式（`mode: "auto-detect"`，返回 `scanned` 与 `contradictions`） |
| C1 | checkpoint 不随状态流转更新，恢复点可能过期 | 已修复：`transition` 后自动同步 checkpoint（best-effort），恢复永远不会从过期阶段开始 |

回归测试：`test-automated.cjs` 新增 phase7-080/081/082/083 四条用例覆盖以上修复。
