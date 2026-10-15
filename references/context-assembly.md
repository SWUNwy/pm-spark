# history/retired — 上下文组装

本文档《上下文组装》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 上下文组装框架（Context Assembly Framework）

## 概述

上下文组装框架把每个 run 阶段映射到其所需上下文组件，按优先级级别组织。这确保模型只收到当前阶段相关的上下文，减少 token 浪费并提高信噪比。

## 优先级级别

| 级别 | 定义 | Token 预算 | 自动包含？ |
|---|---|---|---|
| **P0** | 必需——阶段运作所需 | 总是包含 | 是 |
| **P1** | 重要——提升质量但不严格必需 | 预算允许时包含 | 是 |
| **P2** | 有用——提供额外深度 | 按需包含 | 否 |
| **P3** | 完整参考——完整来源材料 | 仅显式需要时 | 否 |

## 阶段-上下文映射

### intake

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 先前 run 状态与关键发现 |
| P0 | role_definition | 400 | 模型角色与行为指南 |
| P1 | core_goal | 200 | run 的主要目标 |
| P1 | operating_contract | 300 | run 级契约与约束 |
| P2 | historical_index_summary | 500 | 过去 run 的上下文摘要 |

### scoped

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 更新的范围决策 |
| P0 | stage_contract | 300 | 阶段特定目的与交付物 |
| P1 | scope_definition | 400 | 定义的范围边界 |
| P1 | non_goals | 200 | 显式排除项 |
| P2 | input_sources | 300 | 定界决策所用来源 |

### discovering

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 活跃发现 |
| P0 | evidence_protocol | 300 | 证据收集规则 |
| P1 | search_strategy | 300 | 当前搜索方法 |
| P1 | high_confidence_evidence | 600 | 迄今关键证据 |
| P2 | relevant_frameworks | 800 | 适用框架与模式 |
| P3 | full_reference_files | 2000 | 完整参考文档 |

### synthesizing

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 进行中的综合决策 |
| P0 | evidence_summary | 500 | 浓缩证据概览 |
| P1 | decision_framework | 400 | 决策框架 |
| P2 | output_templates | 600 | 最终输出模板 |

### verifying

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 验证标准与状态 |
| P0 | gate_criteria | 300 | 门禁通过/失败标准 |
| P1 | verification_rubric | 400 | 验证评分标准 |
| P2 | failure_handling_guide | 500 | 失败处理指南 |

### repairing

| 优先级 | 组件 | Tokens | 目的 |
|---|---|---|---|
| P0 | working_memory | 800 | 修复上下文与尝试 |
| P0 | failure_analysis | 400 | 失败根因 |
| P1 | repair_strategies | 500 | 可用修复策略 |

## 用法

```bash
# 查看当前阶段的上下文组装
node scripts/run-state.cjs assemble-context --state <file>

# 输出包含：
# - Current phase
# - Total estimated tokens
# - Priority-sorted component list with cumulative tokens
# - Excluded components with reasons
```

## 与 CQS 集成

上下文组装输出进入上下文质量评分（Context Quality Score）：

- **signal_to_noise**：P0 中历史未引用的组件降低分数
- **relevance_decay**：早期阶段组件仍出现在后期阶段可能指示衰减
- **context_coherence**：当前阶段应有却缺失的组件

## 最佳实践

1. **每次转换后检查组装**：阶段变化时重跑 `assemble-context`
2. **监控 P3 使用**：完整参考文件昂贵——只在必要时包含
3. **与预算配合**：把 `assemble-context` 总 token 与预算限制比较
4. **阶段合适的上下文**：验证阶段不要包含发现阶段组件
