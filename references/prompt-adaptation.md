# history/retired — 提示词适配

本文档《提示词适配》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 提示自适应引擎（Prompt Adaptation Engine）

## 概述

提示自适应引擎跨 5 个自适应维度、7 个提示组件动态调整提示结构。`adapt-prompt` 命令用它生成匹配当前模型、任务、用户与系统状态的上下文感知提示。

## 自适应维度

| 维度 | 变量 | 自适应策略 |
|---|---|---|
| 模型能力 | claude-sonnet vs claude-opus vs deepseek-v4 | Opus：更少约束；Sonnet：结构化；DeepSeek：显式指令 |
| 上下文压力 | <50% vs >80% 预算 | 高压：缩短角色、移除示例 |
| 任务复杂度 | light vs decision-grade | 复杂：详细流程；简单：简洁 |
| 用户体验 | 新手 vs 老手 | 新手：指导；老手：直接 |
| 历史成功率 | 高 vs 低 | 低：强制加载示例 |

## 提示组件

每个提示由 7 个可独立调整的组件组成：

```
[组件: 角色定义]     ← 根据 track + analysis_type + 模型选择
[组件: 核心目标]     ← 从 goal 自动生成
[组件: 约束集合]     ← 根据上下文压力动态裁剪
[组件: 过程引导]     ← 根据任务复杂度选择详细程度
[组件: 输出格式]     ← 固定（最终响应契约）
[组件: 参考示例]     ← 根据上下文预算选择 0-2 个
[组件: 当前状态]     ← Working Memory 注入
```

## 自适应规则

### 上下文压力自适应

预算利用率 80% 时压缩约束并移除示例。90% 时进一步压缩角色并移除过程引导：

```javascript
if (context.budget_utilization > 0.8) {
  prompt.constraints = compressConstraints(prompt.constraints); // shorten 50%
  prompt.examples = []; // remove examples
}
if (context.budget_utilization > 0.9) {
  prompt.role = compressRole(prompt.role); // shorten 60%
  prompt.process = ""; // remove process guidance
}
```

### 模型能力自适应

Opus 需要最少约束；DeepSeek 需要显式指令：

```javascript
if (context.model === "claude-opus-4-6") {
  prompt.constraints = prompt.constraints.slice(0, 3); // core constraints only
}
if (context.model === "deepseek-v4") {
  prompt.role = expandRole(prompt.role); // add explicit role framing
  prompt.constraints = addGuardrails(prompt.constraints); // add safety guardrails
}
```

### 历史成功自适应

历史成功率低于 70% 时强制加载相关示例：

```javascript
if (context.historical_success_rate < 0.7) {
  prompt.examples = [selectBestExample(state.track)]; // force-load 1 example
}
```

## CLI 用法

```bash
# 为当前模型自适应提示
node scripts/run-state.cjs adapt-prompt --state <file>

# 为特定模型自适应
node scripts/run-state.cjs adapt-prompt --state <file> --model deepseek-v4

# 预览自适应而不应用
node scripts/run-state.cjs adapt-prompt --state <file> --model claude-opus-4-6 --dry-run
```
