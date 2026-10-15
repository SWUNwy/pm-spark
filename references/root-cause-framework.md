# history/retired — 根因框架

本文档《根因框架》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 根因框架（Root Cause Framework）

分析 run 状态失败的结构化诊断框架。`run-state.cjs diagnose` 使用，修复阶段引用。

## 5 个诊断维度

### 1. Gates 维度

对照当前 track/depth 的必需门禁分析门禁状态。

| 信号 | 检测 | 严重度 |
|---|---|---|
| 门禁失败 | `state.gates[id].status === "fail"` | high |
| 门禁跳过 | `state.gates[id].status === "skip"` | medium |
| 门禁缺失 | 必需门禁在其应评估阶段仍 `pending`（未到达阶段的 pending 不计；stopped/blocked/awaiting_user 不计） | high |
| 两次被阻 | 同一门禁 ID 在历史中失败 >1 次 | high |
| 停止/阻塞状态 | `state.status === "blocked" \|\| "stopped"` | medium |

**必需门禁**由 `requiredGateIds()` 决定：G1、G2、G3 总是；另按 track/depth/constitution 加 G-Decompose、G-Explore、G-Architecture、G-Spec、G-Section、G-Human。

**Gate due 语义**：G1 / G-Decompose 在离开 intake 前到期；G2 / G-Explore / G-Architecture / G-Spec / G-Section 在进入 verifying 前到期；G3 / G-Human 在 completed 前到期。`diagnose` 与 `causal` 只把到期门禁计入健康判定（2026-08-07 修复 E6）。

### 2. Repair 维度

分析修复迭代使用与模式重复。

| 信号 | 检测 | 严重度 |
|---|---|---|
| 预算耗尽 | `repair_iterations >= max_repair_iterations` | critical |
| GR-4 重复 | 连续 repair 转换且 reason 前缀相同（30 字符） | high |
| 动态预算 | `calculateRepairBudget()` 计算的 `max_repair_iterations` | info |

**修复预算**按深度（light=1、standard=2、deep=3、decision-grade=4）加复杂度加成动态计算。

### 3. Evidence 维度

分析证据台账的矛盾、低置信度与缺口。

| 信号 | 检测 | 严重度 |
|---|---|---|
| 矛盾 | 证据条目 `status === "contradicts"` | high |
| 低置信度 | 证据条目 `confidence === "low"` | medium |
| 证据缺口 | 门禁以 `evidence: null` 通过 | low |
| 文件缺失 | 证据文件不存在 | high |
| 验证证据 | 条目 `kind === "validation"` | info |

### 4. History 维度

分析状态转换历史的非法移动与循环。

| 信号 | 检测 | 严重度 |
|---|---|---|
| 非法转换 | 历史条目 `from→to` 不在 TRANSITIONS 映射中 | high |
| 状态循环 | 同一状态访问 >2 次 | medium |
| 低信息比 | history/transition 比 > 5:1 | medium |

**转换规则**定义在 `TRANSITIONS` 映射中。每个状态有定义的有效目标状态集。

### 5. 复合 / 失败模式维度

把所有维度发现映射到 17 种失败模式，带严重度与建议动作。

## 失败模式矩阵

| ID | 失败模式 | 维度 | 严重度 | 检测信号 | 建议动作 |
|---|---|---|---|---|---|
| 1 | `gate_blocked_twice` | gates | high | 同一门禁历史失败两次 | 重评路由、深度、范围或证据负担 |
| 2 | `low_information_loop` | history | medium | History/transition 比 > 5:1 | 停止宽泛提问；提供有界选择或降级输出 |
| 3 | `evidence_contradiction` | evidence | high | 任何矛盾证据条目 | 按权威/时效/范围排序；找解决负责人 |
| 4 | `repair_budget_exhausted` | repair | critical | iterations >= max | 停止当前修复循环；重评方法 |
| 5 | `scope_drift` | gates | high | status=completed 但门禁未全过 | 创建分支/新 run 或修订契约 |
| 6 | `branch_overload` | gates | medium | 非必需门禁失败 >3 | 保留分支图；选一条主线 |
| 7 | `route_ambiguity` | composite | low | Track 暗示不同交付物 | 按请求结果路由 |
| 8 | `evidence_inaccessible` | evidence | high | 必需证据文件缺失 | 记录尝试来源；用条件分析 |
| 9 | `volatile_fact_risk` | evidence | medium | 低置信证据用于过关 | 通过授权来源验证 |
| 10 | `constitution_conflict` | composite | critical | 检测到 Constitution 但未应用 | 停止推进；重评 Constitution |
| 11 | `context_interruption` | composite | medium | 状态签名不匹配 | 从 state + checkpoint + 证据台账恢复 |
| 12 | `illegal_transition` | history | high | 历史含非法状态转换 | 评审状态机转换 |
| 13 | `state_loop` | history | medium | 同一状态访问 >2 次 | 改变策略打破循环 |
| 14 | `missing_required_gate` | gates | high | 必需门禁仍 pending | 评估并通过/失败 pending 门禁 |
| 15 | `repair_pattern_repeat` | repair | high | GR-4：同一修复策略重复 | 根本性改变修复策略 |
| 16 | `evidence_gap` | evidence | low | 门禁无证据引用通过 | 给通过门禁加证据引用 |
| 17 | `stop_without_reason` | gates | medium | 停止/阻塞状态无 stop_reason | 记录停止原因 |

## 严重度分类

| 严重度 | 含义 | 升级规则 |
|---|---|---|
| **critical** | 必须先停并处理再继续 | 解决前阻塞全部转换 |
| **high** | 下阶段前应解决 | 标记评审；确认后可持续 |
| **medium** | 监控并记录 | 记录；无需阻塞动作 |
| **low** | 信息性，无需动作 | 记录备用 |

**下一步动作判定：**

| 条件 | 动作 |
|---|---|
| 任何 critical 失败 | `recover_state` — 停止全部工作，跑恢复流程 |
| 任何 high 失败 + 修复耗尽 | `extend_budget` — 增加修复预算或缩小范围 |
| 存在 high 失败 | `reassess_scope` — 评估是否继续当前路径 |
| 无 critical/high 失败 | `continue` — 正常继续 |

## 诊断流程

### 何时诊断

| 阶段 | 模式 | 目的 |
|---|---|---|
| 每次转换后 | `quick` | 轻量检查；抓非法转换与状态循环 |
| 进入修复阶段 | `full` | 全面分析；识别全部失败模式 |
| 证据矛盾 | `evidence` | 定向调查证据问题 |
| 门禁失败 | `gates` | 聚焦门禁分析 |
| 修复迭代 | `repair` | 检查修复模式与预算 |

### 命令用法

```
# 全量诊断（全部 5 个维度）
node scripts/run-state.cjs diagnose --state <file>

# 定向模式
node scripts/run-state.cjs diagnose --state <file> --mode gates
node scripts/run-state.cjs diagnose --state <file> --mode evidence
node scripts/run-state.cjs diagnose --state <file> --mode repair
node scripts/run-state.cjs diagnose --state <file> --mode quick
```

## 集成点

### 验证阶段集成

状态转换到 "verifying" 时：
1. 运行 `diagnose --mode quick` 检查问题
2. 发现失败模式，验证前先处理
3. 发现证据矛盾，运行 `diagnose --mode evidence` 深入分析

### 修复阶段集成

进入修复阶段时：
1. 运行 `diagnose --mode full` 全面分析
2. 检查 `composite.next_action` 获取推荐动作
3. `repair_budget_exhausted` 时停止并在继续前重评
4. `repair_pattern_repeat`（GR-4）时根本性改变策略
5. 修复后重跑 `diagnose --mode quick` 验证改进

### 门禁评估集成

门禁失败时：
1. 运行 `diagnose --mode gates` 检查是否重复失败
2. 检测到 `gate_blocked_twice`，重评路由后再重新评估
