# 示例：Analyze + Decision

## 场景
- Track: analyze
- Analysis Type: decision
- Depth: standard

## 输入
"我们需要决定使用哪种方案来实现 pm-spark skill 的上下文质量评分：方案 A 是独立的评分脚本，方案 B 是集成到 run-state.cjs 中作为新命令。"

## 流程

### 第 1 步：定义决策标准
- Maintainability: ease of future changes
- Discoverability: how users find and use the feature
- Consistency: follows existing patterns
- Testability: ease of automated testing
- Dependency: coupling with other components

Intake note: 只检查会改变本次推荐的缺口；不要求先补齐背景、用户、边界、指标和约束六个维度。

### 第 2 步：为每个选项收集证据

**选项 A：独立脚本**
- Pro: Zero coupling, can be tested independently
- Pro: Can be used even if run-state.cjs is broken
- Con: Duplicates state loading logic
- Con: Users need to discover another script
- Risk: Inconsistent behavior with run-state.cjs

**选项 B：集成到 run-state.cjs**
- Pro: Follows existing pattern (22 existing commands)
- Pro: Automatic state loading, signature verification
- Pro: Users discover via `--help` naturally
- Con: Tightly coupled (but all commands are)
- Risk: Increases file size of run-state.cjs

### 第 3 步：结构化分析
- 检查既有模式：run-state.cjs 有 22 个命令，全部遵循同一模式
- 评审测试覆盖：test-automated.cjs 通过 `run(RUN_STATE, [...])` 运行所有命令
- 评估一致性：作为命令添加 = 与既有架构一致

### 第 4 步：门禁检查
- G1: 决策标准已定义 → Pass
- G2: 两个选项都有证据 → Pass
- G3: 分析完成 → Pass

### 第 5 步：决策
- **推荐**：选项 B（集成到 run-state.cjs）
- **理由**：遵循既有模式、无新发现负担、利用既有基础设施
- **证据**：`evidence --kind decision --claim "Integration as command follows existing 22-command pattern" --confidence high`

## 输出
```json
{
  "status": "completed",
  "decision": "Option B",
  "rationale": "Consistency with existing 22-command pattern, zero discovery burden, leverages existing state loading and signature verification",
  "evidence_count": 4
}
```

## 关键模式
1. **显式标准**：评估选项前先定义决策标准
2. **均衡证据**：记录每个选项的优缺点
3. **基于模式推理**：优先与既有代码库一致
4. **置信度标签输出**：每条证据带置信度级别
