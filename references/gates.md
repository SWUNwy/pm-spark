# history/retired — 门禁

本文档《门禁》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 门禁规格（Gate Specifications）

## 决策模型

每个门禁返回其一：

- `pass`：全部强制标准都有证据。
- `fail`：至少一个强制标准为假或无支撑。
- `skip`：门禁不适用；记录原因。
- `pending`：尚未评估。

`pass` 需要证据引用。沉默、漂亮散文或代理断言不是证据。

检测到项目 Constitution 时，离开 Intake 前评估并应用它。Constitution 定义的门禁成为普通机器可见门禁，在其声明的 `scope`、`verify` 或 `complete` 阶段强制执行。

## G1 — 目标契约（Goal Contract）

在 Discovery 前运行。

### 强制标准

- 期望结果以可观察的变化或决策陈述。
- 交付物/渠道已知。
- 范围与至少一个非目标明确。
- 已选主导轨道与请求深度。
- 已识别输入/事实来源。
- 完成证据可测试或可评审。
- 已明确宿主策略、用户已有授权与必要的补充批准。
- 存在最大修复迭代次数与停止条件。

### 通过证据

包含全部强制字段的已填充 state 契约或 checkpoint。

### 失败动作

先推断安全默认。缺失值改变安全路径时，转 `awaiting_user` 并问一个阻塞问题。否则用标注假设继续。

## G-Decompose — 连贯切片

请求包含可独立交付的系统、受众、工作流或验收周期时，在 Scope 前必需。

### 强制标准

- 独立子问题及其依赖已映射。
- 为当前 run 选了一个连贯垂直切片。
- 延后分支以显式边界保留。
- 所选切片有自己的结果、非目标、证据与完成条件。
- 跨切片假设与接口已点名。

### 失败动作

返回 Decomposition Map。不要开始细问或创建巨型 Spec。只有当前 run 可独立完成并验证后才通过。

## G-Explore — 有用收敛

Explore 在 Verification 前必需。

### 强制标准

- 存在至少 2-3 个有意义的不同方向，或有证据表明空间更窄。
- 主要假设与未决变量可见。
- 分支组织为主线与延后分支。
- 进一步扩展的决策价值递减。
- 输出提供显式选择：继续 Explore、进入 Analyze、成熟时进入 Specify、或以 Direction Brief 停止。

### 失败动作

广度太低：扩展一个缺失维度。广度失控：聚类并修剪。不要仅为满足数字计数而继续生成变体。

## G2 — 证据与综合

在 Verification 前运行。

### 强制标准

- 每个决定性声明链接到用户事实、已查验来源或标注推理。
- 易变事实已验证或显式条件化。
- 重要的矛盾证据已记录。
- 决策存在至少两个合理备选，除非选项空间可证明是单一。
- 比较标准在最终偏好前定义。
- 建议包含置信度与失效触发。
- 范围未被静默扩大。

### 通过证据

证据台账条目 + 引用决定性条目的综合/checkpoint。

### 失败动作

证据缺口回 `discovering`；比较缺口留在 `synthesizing`。不要加泛化散文；修复具体失败标准。

## G-Architecture — 架构清洁度

Solution 或 Mixed 分析在 Verification 前必需。

只有模式一致性、职责分离、最小改动与补丁抵抗力各自有显式证据时才通过。多个弱维度不能被平均成 pass。评估流程与债务豁免规则读 `architecture-cleanliness.md`。

## G3 — 完成（Completion）

在 `verifying` 中、`completed` 前运行。

### 强制标准

- 状态校验通过。
- 必需交付物存在于约定渠道/路径。
- 验证评分达到配置阈值。
- 无硬失败。
- 全部失败检查已修复、经授权人豁免（waived）、或作为 stop/block 原因披露。
- 编辑后重要声明仍可追溯。
- 最终响应陈述不确定性、被否决备选与下一步动作。
- 状态、checkpoint、证据与结果互不矛盾。

### 通过证据

验证事件、语义记分卡、工件引用与最终 checkpoint。

### 失败动作

可恢复转 `repairing`。修复未授权或不可能时转 `awaiting_user`、`stopped` 或 `blocked`。

## G-Spec — Spec 冻结

仅 Specify 轨道在写正式 Spec 文件前必需。

### 强制标准

- 本次迭代的范围与非目标已冻结。
- 验收标准可观察，覆盖主/边界/错误路径。
- 假设与依赖已列出。
- 已选设计深度与工件清单。
- 输出路径已知。
- Spec 子类型在 `proposal.md` 中声明，且与实际起草的扩展章节匹配。
- 用户请求了工件或确认了建议交接。

Spec 批准只授权被请求的工件，不授权实施或外部动作。

## G-Section — 章节评审

Standard/Verified Specify 工作必需，或复杂度使单次冻结评审不可靠时必需。

### 评审单元

单元 1-6 对每个 Standard/Verified Spec 强制。单元 7-8 按声明的 Spec 子类型条件（见 `spec-templates.md`）。

| # | 单元 | 强制？ | 主要评审章节 |
|---|---|---|---|
| 1 | 范围、非目标与模块目标 | 总是 | `proposal.md` Problem、Module Goal、Scope、Non-goals、Spec Subtype |
| 2 | 行动者、入口与主流程 | 总是 | `design.md` Actors and Permissions、Entry and Preconditions、Main Flow |
| 3 | 领域模型与状态机 | 总是 | `design.md` Domain Objects、State Machines |
| 4 | 数据契约与字段规则 | 存在外部契约时总是；否则仅核心数据 | `design.md` API and Data Mapping；激活时 Field Rules（Extension A） |
| 5 | 错误、边界与恢复 | 总是 | `design.md` Exception Flow、Boundary Cases |
| 6 | 验收、测试与交接 | 总是 | `proposal.md` Acceptance Criteria、Open Questions；`test-cases.md`；`tasks.md` |
| 7 | 产品交互与 UI 契约 | 仅声明 Extension B（Product/Frontend）时 | `design.md` Page and Interaction |
| 8 | 事件与副作用 | 仅声明 Extension C（Event-Driven）时 | `design.md` Events and Side Effects |

### 通过标准

- 每个适用单元已评审。
- 每个单元的每个章节要么已填、标 `N/A — <reason>`、或在 Open Questions 中列为显式跟进。
- 跨章节矛盾与缺失追踪链接已解决。示例：每个 Main Flow 步骤映射到重新出现在 Domain Objects 中的后置条件；每个 Exception Flow 行映射到至少一个 Boundary Case 或测试用例；每个状态机转换从 Main Flow 或 Exception Flow 可达。
- 每个单元记录批准、请求修改或带理由的 N/A。
- 章节评审不暗示实施授权。

小型 Light Spec：在契约中设 `section_review_required=false` 并记录原因；不要通过虚假章节评审。

## G-Human — 人工承诺

结果会承诺金钱、生产状态、安全姿态、法律/医疗动作、公开沟通或其他难逆选择时必需。

### 强制标准

- 决策负责人已点名。
- 建议、备选、证据、不确定性与后果可见。
- 需要批准的确切动作已陈述。
- 批准显式且当前有效。

该门禁永不由浏览器选择、推断偏好、旧批准或 Spec 接受满足。

## Self-review 检查

Self-review 作为 G3 内的必需 Check 实现，而不是第二个完成门禁。`completed` 前记录：

```bash
node <skill-dir>/scripts/run-state.cjs check --state <state> \
  --id self-review --status pass --evidence "scorecard.json#self-review"
```

它必须覆盖占位符、范围漂移、证据可追溯性、矛盾、输出契约、适用条件门禁与未授权动作。豁免需要授权原因并保持状态可见。

## 条件门禁矩阵

| 条件 | 额外必需门禁 |
|---|---|
| 多系统/多工作流范围 | G-Decompose |
| Explore 轨道 | G-Explore |
| Solution 或 Mixed 分析 | G-Architecture |
| Specify 轨道 | G-Spec |
| Standard/Verified 或复杂 Specify | G-Section |
| 不可逆人工承诺 | G-Human |
| Constitution 规则 | 声明的自定义门禁 |

## 降级输出

用这些替代假装失败门禁通过：

| 门禁失败 | 输出 |
|---|---|
| G1 | Goal Contract Draft / Decomposition Map |
| G-Decompose | Decomposition Map + 推荐首切片 |
| G-Explore | Idea Map / Branch Map / Direction Brief draft |
| G2 证据缺口 | Preliminary Judgment / Evidence Gap List |
| G2 比较缺口 | Option Map / Decision Criteria Draft |
| G-Architecture | Architecture debt report / alternative design |
| G3 可恢复 | Verification Failure Report + 修复计划 |
| G3 终态 | Stop/Block Summary + 精确解除条件 |
| G-Spec | Spec Readiness Check |
| G-Section | Section gap/contradiction report |
| G-Human | 等待负责人批准的 Decision Packet |

## 机器记录

用以下命令记录结果：

```bash
node <skill-dir>/scripts/run-state.cjs gate \
  --state <run-dir>/state.json \
  --id G1 --status pass --evidence "checkpoint.md#goal-contract"
```

除非 G1、G2、G3 均为 `pass`，状态引擎阻止 `completed`。
