# history/retired — 构思框架

本文档《构思框架》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 头脑风暴框架（Brainstorm Frameworks）

每个框架条目包含：何时用、何时不用、核心问题、输出、示例、常见误用/风险。

## 第一性原理（First Principles）

- 何时用：问题感觉是继承的、模糊的或过度约束时。
- 何时不用：用户只需要快速选项比较时。
- 核心问题：什么是无可辩驳的事实？哪些假设是借来的？要成立必须存在什么？
- 输出：本质变量与重构选项。
- 示例："What is the actual user pain before assuming a product feature?"
- 误用/风险：变得抽象、拖延实际选择。

## 5 个为什么 / 根因（5 Whys / Root Cause）

- 何时用：症状可能隐藏更深原因时。
- 何时不用：存在多个独立原因、需要系统制图时。
- 核心问题：为什么会发生？那个原因为什么存在？
- 输出：根因链。
- 示例："Why is onboarding conversion low?"
- 误用/风险：系统多因时强行归为一个根因。

## 5W2H

- 何时用：用户需要完整但轻量的视图时。
- 何时不用：问题是战略性的、需要权衡分析时。
- 核心问题：what、why、who、when、where、how、how much。
- 输出：结构化上下文图。
- 示例："Clarify a new feature idea before analysis."
- 误用/风险：变成无洞见的填表。

## 系统思考（Systems Thinking）

- 何时用：存在许多行动者、反馈环或延迟效应时。
- 何时不用：问题狭窄且局部时。
- 核心问题：环是什么？什么激励在强化该行为？
- 输出：因果图或杠杆点。
- 示例："Why does team execution keep drifting?"
- 误用/风险：过度建模而不是做决策。

## JTBD（Jobs To Be Done）

- 何时用：用户动机或产品价值不清时。
- 何时不用：用户身份与目标已精确时。
- 核心问题：用户雇这个来做什么工作？他们寻求什么进展？
- 输出：工作陈述与期望进展。
- 示例："Why would someone use this analysis skill?"
- 误用/风险：无证据发明工作。

## 价值主张画布（Value Proposition Canvas）

- 何时用：匹配用户痛点/收益与产品/服务想法时。
- 何时不用：未定义用户细分时。
- 核心问题：哪些痛点被缓解？哪些收益被创造？
- 输出：价值契合图。
- 示例："Map why Brainstorm Mode matters."
- 误用/风险：无验证就造乐观价值主张。

## Kano 模型

- 何时用：给用户体验质量排优先级时。
- 何时不用：核心功能仍未定义时。
- 核心问题：什么是基本、性能、惊喜、无差别？
- 输出：优先级类别。
- 示例："Which skill behaviors are must-have vs delight?"
- 误用/风险：把惊喜功能当可靠性的替代。

## 用户旅程（User Journey）

- 何时用：理解步骤、触点、摩擦与情绪状态时。
- 何时不用：问题是纯后端或抽象战略时。
- 核心问题：用户在前、中、后做什么？卡在哪？
- 输出：旅程图。
- 示例："Map a user moving from idea to Spec."
- 误用/风险：无决策影响的浅旅程。

## SCAMPER

- 何时用：需要既有想法的变体时。
- 何时不用：基础想法未被理解时。
- 核心问题：Substitute、combine、adapt、modify、put to other use、eliminate、reverse？
- 输出：变体清单。
- 示例："How can Stage Summary become lighter?"
- 误用/风险：无用处的新奇。

## 逆向思考（Reverse Thinking）

- 何时用：困在常规框架中时。
- 何时不用：用户需要快速执行时。
- 核心问题：怎么让它失败？相反路径是什么？
- 输出：倒置洞见与护栏。
- 示例："How would this skill create bad analysis?"
- 误用/风险：为反着反而反着。

## 类比迁移（Analogy Transfer）

- 何时用：从其他领域寻找灵感时。
- 何时不用：精确域约束比创造性更重要时。
- 核心问题：什么相似系统解决相似工作？什么可迁移？
- 输出：类比候选。
- 示例："Use medical triage as analogy for Router."
- 误用/风险：迁移表面特征而非深层结构。

## 重新框架（Reframing）

- 何时用：陈述的问题可能是错的问题时。
- 何时不用：用户已确认问题框架时。
- 核心问题：如果这不是功能问题呢？什么框架会改变解法？
- 输出：替代问题框架。
- 示例："Is this a skill quality issue or a state-management issue?"
- 误用/风险：无收敛的无限重构。

## 抽象阶梯（Abstraction Ladder）

- 何时用：在细节与原则之间移动时。
- 何时不用：只有一层相关时。
- 核心问题：为什么这重要？什么具体行动随之而来？
- 输出：从原则到行动的阶梯。
- 示例："Move from 'better Brainstorm Mode' to concrete response rules."
- 误用/风险：漂移到过度抽象。

## 机会解决树（Opportunity Solution Tree）

- 何时用：连接结果、机会与方案时。
- 何时不用：未定义结果时。
- 核心问题：什么结果？什么机会？什么方案？什么实验？
- 输出：机会树。
- 示例："Improve skill quality -> router, gates, tests."
- 误用/风险：罗列不排序。

## 精益画布（Lean Canvas）

- 何时用：探索产品/商业想法时。
- 何时不用：任务只是内部工作流时。
- 核心问题：problem、customer、value proposition、channels、revenue、cost、metrics。
- 输出：单页商业假设。
- 示例："Evaluate a new AI workflow product idea."
- 误用/风险：早期市场的假精确。

## 蓝海战略画布（Blue Ocean Strategy Canvas）

- 何时用：差异化战略或产品时。
- 何时不用：竞争无关时。
- 核心问题：raise、reduce、eliminate、create 什么？
- 输出：差异化曲线。
- 示例："Make a skill distinct from generic requirement analysis."
- 误用/风险：忽略执行可行性。
