# history/retired — 分析框架

本文档《分析框架》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 分析框架（Analysis Frameworks）

用户需要比较、推荐、决策支持、战略或风险分析时使用这些框架。

## 场景压力测试（Scenario Stress Test）

在 Analysis 的 Diverge 阶段用于探查假设、暴露盲点。

每轮讨论应用 2-3 个有挑战性的假设情景。选自：

### 极端边界探查
- 10 倍规模下会发生什么（用户、数据、请求）？
- 关键假设完全错误会怎样？
- 关键依赖失败或不可用会怎样？
- 时间线压缩到 1/3 会怎样？

### 演化探查
- 这个方案在 6/12/24 个月后站得住吗？
- 什么力量会导致这个方向被放弃？
- 生态或技术转变时会发生什么？

### 失效模式探查
- 最可能的静默失败是什么？
- 资金充足的竞争对手会怎么消除它？
- 什么信号告诉我们该在深度投入前停下？

把发现整合进 Analysis 输出，作为风险注解或条件建议。

## 角色引导式提问（Persona-Guided Questioning）

除框架驱动分析外，用多视角提问暴露盲点。自然采用这些立场：

| 立场 | 核心问题 | 何时用 |
|---|---|---|
| Product Strategist（产品战略） | 真实价值主张是什么？给谁？ | PMF、差异化、定位 |
| Growth & Market Analyst（增长与市场） | 这怎么竞争？市场趋势？ | 竞争格局、上市策略 |
| User Advocate（用户代言） | 用户实际体验什么？卡在哪？ | 用户旅程、痛点、可用性 |
| System Architect（系统架构） | 可行吗？可扩展吗？依赖什么？ | 架构、数据模型、集成 |
| Risk Challenger（风险挑战） | 这个假设错了会怎样？失效模式？ | 压力测试、边界情况、盲点 |

转换视角时点名视角：
> "From a growth perspective — how do users discover this today?"
> "The risk challenger in me has to ask: what if that assumption is wrong?"

每会话最多用 2-3 个立场，避免淹没用户。

## 加权决策矩阵（Weighted Decision Matrix）

- 何时用：选项需跨标准比较时。
- 何时不用：标准未知或数值不可比时。
- 核心问题：哪些标准重要？各占多少？各选项怎么打分？
- 输出：带分数的选项表。
- 示例："Choose Light / Standard / Verified Spec."
- 误用/风险：任意权重制造的假精确。

## RICE / ICE

- 何时用：给功能或计划排优先级。
- 何时不用：reach/impact/confidence 无法估计时。
- 核心问题：reach、impact、confidence、effort。
- 输出：优先级顺序。
- 示例："Which skill files should be written first?"
- 误用/风险：数字掩盖薄弱假设。

## Pre-mortem（事前验尸）

- 何时用：承诺前预判失败。
- 何时不用：用户只需要发散。
- 核心问题：假设它失败了。为什么？出现什么预警信号？
- 输出：失效模式与缓解。
- 示例："How could this skill still auto-execute accidentally?"
- 误用/风险：过度谨慎阻塞进展。

## 成本效益分析（Cost-Benefit Analysis）

- 何时用：判断付出是否值得结果。
- 何时不用：定性利害占主导时。
- 核心问题：收益、成本、机会成本、风险是什么？
- 输出：带净值的建议。
- 示例："Should Visual Companion be enhanced now?"
- 误用/风险：低估无形收益。

## 遗憾最小化（Regret Minimization）

- 何时用：涉及长期战略或个人决策时。
- 何时不用：短期可逆任务主导时。
- 核心问题：哪个选择不试会后悔？哪个遗憾可恢复？
- 输出：遗憾加权建议。
- 示例："Which career/business direction should I explore?"
- 误用/风险：美化冒险选择。

## OODA 循环

- 何时用：快速变化环境需要迭代决策。
- 何时不用：环境稳定且已知时。
- 核心问题：观察、定向、决策、行动；每轮后什么变了？
- 输出：迭代行动循环。
- 示例："How to validate a market hypothesis weekly?"
- 误用/风险：未定向就仓促决策。

## HEART

- 何时用：评估产品/用户体验质量。
- 何时不用：无用户行为信号时。
- 核心问题：happiness、engagement、adoption、retention、task success。
- 输出：指标图。
- 示例："How to measure if Brainstorm Mode is useful?"
- 误用/风险：无埋点就选指标。

## 机会评分（Opportunity Scoring）

- 何时用：给未满足需求排优先级。
- 何时不用：importance/satisfaction 数据缺失且无法近似时。
- 核心问题：重要？被忽视？可行？
- 输出：机会排名。
- 示例："Which user pain should a skill solve first?"
- 误用/风险：把猜测当研究。

## SWOT

- 何时用：快速战略盘点有用时。
- 何时不用：需要严谨市场模型时。
- 核心问题：strengths、weaknesses、opportunities、threats。
- 输出：战略快照。
- 示例："Assess an internal AI workflow."
- 误用/风险：无行动的泛化清单。

## PESTEL

- 何时用：宏观环境重要时。
- 何时不用：本地产品执行为主要问题时。
- 核心问题：political、economic、social、technological、environmental、legal。
- 输出：宏观风险图。
- 示例："Analyze entering a regulated market."
- 误用/风险：过度宽泛分析。

## 波特五力（Porter Five Forces）

- 何时用：行业结构重要时。
- 何时不用：用户不是在评估市场时。
- 核心问题：rivalry、entrants、substitutes、suppliers、buyers。
- 输出：行业吸引力。
- 示例："Evaluate a SaaS category."
- 误用/风险：用于个人效率或内部工具。

## FMEA

- 何时用：失败须按严重度、发生、可检测性排序时。
- 何时不用：轻量风险讨论足够时。
- 核心问题：什么会失败？多严重？多可能？多可检测？
- 输出：风险优先级清单。
- 示例："Spec/Execution boundary failure analysis."
- 误用/风险：低风险任务上重流程。

## Wardley 制图（Wardley Mapping）

- 何时用：战略依赖价值链与组件成熟度时。
- 何时不用：用户需要快速选择时。
- 核心问题：用户是谁？价值链是什么？哪些组件是新颖 vs 商品化？
- 输出：战略地图。
- 示例："Where should AI skill investment focus?"
- 误用/风险：需要细心制图；容易画出装饰性地图。
