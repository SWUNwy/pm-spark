# history/retired — 术语表

本文档《术语表》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 术语对照表（Glossary）

PM 对话与评审正文只需使用五种模式、工作阶段和交付状态；行动等级和注释等级已移除。轻量 / 标准 / 深度仅指交互深度，不代表权限或内容分层。阶段用「澄清问题 / 比较方案 / 整理文档 / 核对交付」等工作语言描述；交付状态用「草稿 / 待确认 / 已就绪 / 受阻」描述。已就绪不授予实施权限。每轮开口直接用产品工作语言给出用户要的结论或交付物，不先叙述"已读取 SKILL.md / 已按 X 模式核对上下文"这类过程与内部动作；除非用户明确询问，不在正文说明内部模式编号或名称。设计方案（发散：从空白产出方向集）与做决策（收敛：在已给定/点名候选中取舍）的边界，以用户是否已给定候选为准：用户已点名在 A/B 之间比较选择、要不要做、优先级时用「做决策」；要求从空白设计解法时才用「设计方案」。

下表是内部协议与维护术语，不要求 PM 学习或选择。宿主权限、轨道、门禁编号、状态枚举等留在内部与机器工件中；用户明确请求调试时才解释必要细节。命令名、CLI 参数、JSON 键、机器状态名、Gate ID、文件名在机器契约中**不得翻译**；用户可见说明使用自然中文，不直接播报机器枚举。

| 英文术语 | 中文注解 | 说明 |
|---|---|---|
| Track | 分析轨道 | Explore（探索）/ Analyze（分析）/ Specify（规格化） |
| Host Policy / Approval | 宿主策略 / 批准 | 具体动作遵循宿主当前策略与用户已有授权；必要时补充批准，分析或 Spec 就绪不授予执行权限 |
| Gate | 门禁 | 阶段准入检查；G1 目标契约 / G2 证据-综合 / G3 完成 |
| Goal Contract | 目标契约 | 产出、范围、非目标、证据标准、授权、停止条件 |
| Guardrail | 护栏 | 运行时安全约束（GR-1..GR-6），违例动作：block/warn/force_stop/degrade/filter |
| Checkpoint | 检查点 | 人读恢复摘要；恢复从最近的已验证检查点开始 |
| Evidence Ledger | 证据台账 | 追加式 `evidence.jsonl`，含类型/来源/置信度/状态，HMAC 链防篡改 |
| Working Memory | 工作记忆 | `key_findings` / `active_decisions` / `current_plan_step` / `open_questions` / `risks` |
| Authority | 授权 | 谁有权做什么；分析/Spec 批准不等于执行授权 |
| Repair Budget | 修复预算 | 默认 2 次；同一策略重试不算修复 |
| Handoff Packet | 交接包 | 版本绑定的实施交接物（含哈希），仅供下游规划/执行 |
| Constitution | 项目宪章 | 项目级约束文件；可收窄行为，不可覆盖更高层策略 |
| State Machine | 状态机 | intake→scoped→discovering→synthesizing→verifying→repairing→awaiting_user→completed/stopped/blocked |
| Self-review | 自审 | 完成前的机器可见检查项，pass 或经授权 waiver |
| Drift | 漂移 | 绑定工件哈希不一致，控制器拒绝推进 |
| Stage Contract | 阶段契约 | 各 Track 的交付物与完成信号 |
| Acceptance Criteria | 验收标准 | 完成门禁的判定依据 |
| Semantic Rubric | 语义评分标准 | 对结果做语义级验证，不只是格式 |
| Stop Condition | 停止条件 | 缺授权/来源冲突/预算耗尽/不可消解的不确定 |
| Scope / Non-goals | 范围 / 非目标 | 定义"做什么"与"明确不做什么" |

## 翻译边界（硬性规则）

1. **保留英文**：所有 `run-state.cjs` / `workflow-state.cjs` 命令与参数、JSON 模板键名、状态名、Gate/Guardrail ID、`references/*.md` 与 `assets/*` 文件名、`SKILL.md` frontmatter 的 `name` 字段。
2. **可翻译**：所有面向模型/人的说明文字、提示词模板正文、测试场景的 `user_input` 与期望行为描述。
3. **建议双语**：frontmatter `description`（保证中英文触发都可靠）。
4. 出现歧义时以本表为准；新术语先补进本表再使用。
