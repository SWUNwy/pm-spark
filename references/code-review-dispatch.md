# history/retired — 代码评审分派

本文档《代码评审分派》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 请求代码评审

## 加载时机

完成任务、完成较大的功能或准备合并时加载。本文件指导如何派发代码评审子代理，让它对照计划与质量标准评估改动。

## 核心原则

早评审、常评审。给评审者的上下文要**精确构造**，绝不给会话历史。这样评审聚焦工作产物本身，同时保留你的上下文继续推进。

## 何时请求

**必须：**
- `delegated-task-execution.md` 的每个任务之后
- 完成较大的功能之后
- 合并到 main 之前

**可选但有价值：**
- 卡住时（换一个视角）
- 重构之前（确认基线）
- 修复复杂 bug 之后

## 派发步骤

### 1. 确定 git 范围

```bash
BASE_SHA=$(git rev-parse HEAD~1)    # 或 origin/main、任务起点标记
HEAD_SHA=$(git rev-parse HEAD)
```

### 2. 派发评审子代理

使用 `general-purpose` 子代理类型，按 `references/code-reviewer-template.md` 模板填好占位符：

| 占位符 | 内容 |
|---|---|
| `[DESCRIPTION]` | 构建内容的简要总结 |
| `[PLAN_OR_REQUIREMENTS]` | 它应该做什么（计划路径、任务文本或需求） |
| `[BASE_SHA]` | 起始提交 |
| `[HEAD_SHA]` | 结束提交 |

### 3. 处理反馈

| 严重度 | 动作 |
|---|---|
| Critical | 立即修复，先于其他一切 |
| Important | 继续之前修复 |
| Minor | 记录稍后处理，或顺手修复 |

评审者判断错误时，用技术理由顶回（见 `review-feedback-intake.md`）。

## 评审输出格式

评审者应返回：

- **Strengths** — 具体说明做得好之处
- **Issues**
  - Critical（必须修）
  - Important（应该修）
  - Minor（锦上添花）
- **Recommendations** — 质量、架构、流程建议
- **Assessment** — Ready to merge: Yes / No / With fixes

每个 issue 带 file:line 引用、问题描述、重要性说明与修复建议。

## 与执行流程的配合

| 工作流 | 评审时机 |
|---|---|
| `delegated-task-execution.md` | 每个任务之后，在问题累积前拦截 |
| `plan-execution.md` | 每个任务之后或自然检查点 |
| 临时开发 | 合并之前；卡住时 |

## 红线

- 不因"改动简单"跳过评审
- 不忽略 Critical 问题
- 不带未修复的 Important 问题继续
- 不与正确的技术反馈争论

评审者判断错误时：用技术理由顶回、展示证明工作的代码或测试、请求澄清。

## 相关文档

- `references/code-reviewer-template.md` — 完整派发模板
- `references/review-feedback-intake.md` — 反馈返回后的处理方式
- `references/delegated-task-execution.md` — 逐任务评审与最终评审的编排
