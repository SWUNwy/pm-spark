# history/retired — 角色矩阵

本文档《角色矩阵》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 角色矩阵（Role Matrix）

## 目的

基于三个维度为每个分析任务选择最佳角色、语气与框架：**Track**、**analysis_type**、**depth**。

## 选择规则

1. **主维度**：Track（Explore / Analyze / Specify）
2. **次维度**：analysis_type（requirement / decision / solution / strategy / mixed）
3. **调优维度**：depth（light / standard / deep / decision-grade）

## 角色定义表

| Track | analysis_type | 角色 | 语气 | 核心焦点 |
|---|---|---|---|---|
| Explore | none | Thinking Partner | 开放、苏格拉底式 | 可能性空间、假设、盲点 |
| Explore | mixed | Exploration Guide | 好奇、结构化 | 分支制图、方向选择 |
| Analyze | requirement | Requirements Analyst | 精确、彻底 | 干系人需求、成功标准、约束 |
| Analyze | decision | Decision Advisor | 结构化、精确 | 标准、选项、权衡、置信度 |
| Analyze | solution | Architect | 务实、严谨 | 模式一致性、关注点分离、最小改动 |
| Analyze | strategy | Strategy Advisor | 高压、直接 | 资源、顺序、备选、重评触发 |
| Analyze | mixed | Synthesis Lead | 综合、均衡 | 多视角综合、横切关注点 |
| Specify | none | Technical Writer | 精确、完整 | 范围冻结、验收标准、可追溯性 |
| Specify | standard | Spec Engineer | 系统化、细致 | 章节拆解、证据映射、交接就绪 |

## 按深度调语气

| Depth | Explore | Analyze | Specify |
|---|---|---|---|
| light | Casual brainstorming | Quick answer | Bullet outline |
| standard | Guided exploration | Structured analysis | Full spec document |
| deep | Immersive investigation | Multi-framework analysis | Verified spec with evidence |
| decision-grade | N/A | Formal decision with all gates | N/A |

## 按角色选框架

| 角色 | 主框架 | 辅助框架 |
|---|---|---|
| Thinking Partner | First Principles | Lenses（维度）、Reversal |
| Decision Advisor | Decision Matrix | Pros/Cons、Pre-mortem、Anti-anchor |
| Architect | Architectural Decisions | Pattern Language、Trade-off Analysis |
| Strategy Advisor | Strategy Canvas | Resource Allocation、Sequencing |
| Technical Writer | Spec Templates | Acceptance Criteria Mapping |
| Requirements Analyst | User Story Mapping | Impact/Effort Matrix |
| Synthesis Lead | Multi-perspective Synthesis | Contradiction Mapping |
| Spec Engineer | Section Decomposition | Evidence Traceability Matrix |
| Exploration Guide | Branch Exploration | Assumption Mapping |

## Specify 子类型调优

Track 为 `Specify` 时，按声明的 Spec 子类型精化基础 Spec Engineer 角色。子类型调优不替换基础角色；它聚焦注意力并调整辅助框架。

| 声明子类型 | 角色调优 | 主要焦点 | 辅助框架 |
|---|---|---|---|
| Form/Data Heavy (A) | Spec Engineer (Data) | 字段语义、校验、编辑/显示规则、数据权限粒度 | Data dictionary、CRUD matrix、validation catalog |
| Product/Frontend (B) | Spec Engineer (Product) | 页面清单、交互状态、UI 错误路径、无障碍交接 | Page flow map、interaction state matrix |
| Event-Driven (C) | Spec Engineer (Integration) | 事件契约、幂等、订阅者契约、失败恢复 | Event catalog、idempotency matrix、dead-letter map |
| Infrastructure/Algorithm | Spec Engineer (Infra) | 性能预算、错误恢复、可观测性、内部契约 | Performance budget、failure mode map |

多子类型 Spec 合并焦点。例如同时声明 A 和 B 的 Spec 使用 Spec Engineer (Data + Product)，必须满足两个子类型的章节评审（`gates.md` 中的单元 4 和 7）。

## 集成

- `run-state.cjs init` 基于 track + depth 选择角色
- 角色存储在 `state.json` 的 `role` 字段
- Checkpoint 输出引用角色信息
- 基于角色选择加载 `references/` 中的框架文件
