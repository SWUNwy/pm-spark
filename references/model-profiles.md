# history/retired — 模型画像

本文档《模型画像》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 模型画像（Model Profiles）

## 概述

模型画像定义每个受支持模型的最佳提示配置。`adapt-prompt` 命令用这些画像把提示结构、长度与语气调整到特定模型的能力。

## 画像

### claude-opus-4-6

| 属性 | 值 |
|---|---|
| Role length | 简洁（200-300 字符） |
| Constraints | 3-5（最少，信任模型） |
| Example need | 低——少用 few-shot 示例 |
| Tone | trust_the_model |
| Instruction style | 高层目标，让模型决定细节 |
| Best for | 复杂推理、开放式分析、决策 |
| Key principle | Less is more——过度指定降低质量 |

### claude-sonnet-4-6

| 属性 | 值 |
|---|---|
| Role length | 中等（300-500 字符） |
| Constraints | 5-7（均衡指导） |
| Example need | 中——不熟悉模式时 1-2 个示例 |
| Tone | structured |
| Instruction style | 清晰结构 + 显式步骤 |
| Best for | 标准分析、代码生成、结构化输出 |
| Key principle | 在指导与模型自由间平衡 |

### deepseek-v4（当前）

| 属性 | 值 |
|---|---|
| Role length | 详细（400-600 字符） |
| Constraints | 5-8（显式护栏） |
| Example need | 高——可靠模式要 2-3 个示例 |
| Tone | explicit_instructions |
| Instruction style | 逐步，最小化歧义 |
| Best for | 结构化任务、按 spec 执行 |
| Key principle | 显式胜过隐式——不留任何偶然 |

## 自适应指导

`adapt-prompt` 收到 `--model` 参数时：

1. **加载**指定模型的画像
2. 按画像的 role length **调整章节长度**
3. 把约束数量**设为**画像的约束范围
4. 画像 example need 为 Medium 或 High 时**包含示例**
5. 把 tone **应用**到指令风格（trust_the_model → 最小编辑，explicit_instructions → 详细步骤）

## 画像选择

```bash
# 默认：从当前模型自动检测
node scripts/run-state.cjs adapt-prompt --state <file>

# 显式模型选择
node scripts/run-state.cjs adapt-prompt --state <file> --model claude-sonnet-4-6

# 用模型画像预览
node scripts/run-state.cjs adapt-prompt --state <file> --model deepseek-v4 --dry-run
```
