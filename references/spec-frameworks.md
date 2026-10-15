# history/retired — 规格框架

本文档《规格框架》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# Spec 框架（Spec Frameworks）

只在走向正式交接或实施规划时使用这些框架。

## Definition of Ready

- 何时用：判断需求是否可进入 Spec。
- 何时不用：头脑风暴仍开放时。
- 核心问题：范围清晰吗？验收标准可测试吗？依赖已知吗？
- 输出：就绪检查清单。
- 示例："Can we generate Standard Spec now?"
- 误用/风险：用过早的形式主义阻塞有价值的发现。

## Inception Deck

- 何时用：较大计划前对齐干系人。
- 何时不用：小工作只需要 Light Spec。
- 核心问题：为何在这里？为何现在？什么权衡？什么风险？
- 输出：对齐简报。
- 示例："Define an AI workflow product initiative."
- 误用/风险：对小功能太重。

## Scope Box

- 何时用：边界模糊时。
- 何时不用：范围已冻结时。
- 核心问题：什么在内、在外、可选、未来？
- 输出：范围表。
- 示例："Separate Brainstorm Mode from Analysis Mode."
- 误用/风险：无验收标准就用它。

## Event Storming

- 何时用：领域事件与工作流重要时。
- 何时不用：功能大多是静态内容时。
- 核心问题：发生什么事件？谁触发？什么策略响应？
- 输出：事件流。
- 示例："Map user confirmation events for Spec/Execution."
- 误用/风险：把事件与 UI 步骤混淆。

## Given-When-Then

- 何时用：行为需要可测试场景时。
- 何时不用：需求纯战略时。
- 核心问题：给定上下文，当动作，则期望结果？
- 输出：行为示例。
- 示例："Given user asks only brainstorming, when agent responds, then no Spec."
- 误用/风险：不测真实风险的琐碎场景。

## Example Mapping

- 何时用：规则、示例与问题需要分离时。
- 何时不用：没有业务规则时。
- 核心问题：什么规则？什么示例？还有什么问题？
- 输出：规则/示例/问题图。
- 示例："Map Router behavior for edge cases."
- 误用/风险：示例太多而没有规则综合。

## Test Pyramid

- 何时用：定义测试策略时。
- 何时不用：只需要一个验收检查时。
- 核心问题：什么属于单元、集成、验收？
- 输出：分层测试计划。
- 示例："Verified Spec test skeleton."
- 误用/风险：产品需求不同时还教条化用金字塔。

## Story Mapping

- 何时用：把用户旅程拆成可交付切片时。
- 何时不用：没有用户流时。
- 核心问题：活动、步骤、切片、发布优先级？
- 输出：交付图。
- 示例："From idea exploration to Spec handoff."
- 误用/风险：把故事图当任务清单。

## Dependency Mapping

- 何时用：排序与阻塞重要时。
- 何时不用：任务独立时。
- 核心问题：什么依赖什么？什么可并行？
- 输出：依赖图。
- 示例："References before tests, tests before validation."
- 误用/风险：简单工作过度规划。
