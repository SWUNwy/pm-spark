# history/retired — 因果分析

本文档《因果分析》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 因果分析（Causal Analysis）

## 概述

`causal` 命令对 run 做排除式根因分析。通过用 5 个维度（scope、context、tool、model、process）对照 run 的状态与历史，识别最可能的失败根因。

## 方法：排除式决策树（Exclusion Decision Tree）

```
                    ┌─────────────────┐
                    │  Run failed?     │
                    └────────┬────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
          ┌──────────────┐     ┌──────────────┐
          │ Scope check   │     │ Pass → not   │
          │               │     │ scope problem│
          │ >2 scope      │     └──────────────┘
          │ changes?      │
          └──────┬───────┘
                 │
          ┌──────┴───────┐
          ▼               ▼
   ┌────────────┐  ┌────────────┐
   │ Likely     │  │ Unlikely   │
   │ scope      │  │ scope      │
   └────────────┘  └─────┬──────┘
                         ▼
                 ┌──────────────┐
                 │ Context check│
                 │              │
                 │ Evidence     │
                 │ growth rate  │
                 │ <0.2 or >2?  │
                 └──────┬───────┘
                        │
                 ┌──────┴───────┐
                 ▼               ▼
          ┌────────────┐  ┌────────────┐
          │ Likely     │  │ Unlikely   │
          │ context    │  │ context    │
          └────────────┘  └─────┬──────┘
                               ▼
                       ┌──────────────┐
                       │ Tool check   │
                       │              │
                       │ >2 tool      │
                       │ failures?    │
                       └──────┬───────┘
                              │
                       ┌──────┴───────┐
                       ▼               ▼
                ┌────────────┐  ┌────────────┐
                │ Likely     │  │ Unlikely   │
                │ tool       │  │ tool       │
                └────────────┘  └─────┬──────┘
                                     ▼
                             ┌──────────────┐
                             │ Model check  │
                             │              │
                             │ >2 repairs + │
                             │ same strategy│
                             └──────┬───────┘
                                    │
                             ┌──────┴───────┐
                             ▼               ▼
                      ┌────────────┐  ┌────────────┐
                      │ Likely     │  │ Unlikely   │
                      │ model      │  │ model      │
                      └────────────┘  └─────┬──────┘
                                           ▼
                                   ┌──────────────┐
                                   │ Process check│
                                   │              │
                                   │ gate pass    │
                                   │ rate < 60%?  │
                                   └──────┬───────┘
                                          │
                                   ┌──────┴───────┐
                                   ▼               ▼
                            ┌────────────┐  ┌────────────┐
                            │ Likely     │  │ Unlikely   │
                            │ process    │  │ process    │
                            └────────────┘  └────────────┘
```

## 维度定义

### 1. Scope（范围）

| 属性 | 值 |
|---|---|
| 问题 | 是范围问题吗？ |
| 检测 | 历史中范围相关改动计数 > 2 |
| 置信度 | 判定为是时 Medium，否时 High |
| 建议 | 评审范围定义并强制执行非目标 |

### 2. Context（上下文）

| 属性 | 值 |
|---|---|
| 问题 | 是上下文问题吗？ |
| 检测 | 证据增长率 < 0.2 或 > 2 条/轮 |
| 置信度 | 判定为是时 Medium，否时 High |
| 建议 | 增长慢 → 增加发现；增长快 → 压缩证据 |

### 3. Tool（工具）

| 属性 | 值 |
|---|---|
| 问题 | 是工具/命令问题吗？ |
| 检测 | 历史中工具/命令失败 > 2 |
| 置信度 | 判定为是时 Medium，否时 High |
| 建议 | 评审工具调用模式与错误处理 |

### 4. Model（模型）

| 属性 | 值 |
|---|---|
| 问题 | 是模型能力问题吗？ |
| 检测 | 修复 > 2 次且重复同一修复策略 |
| 置信度 | 判定为是时 Medium，否时 High |
| 建议 | 简化任务、加显式指导、或换模型 |

### 5. Process（流程）

| 属性 | 值 |
|---|---|
| 问题 | 是流程问题吗？ |
| 检测 | 到期门禁（due gates）通过率 < 60%（仅统计 run 当前阶段应已评估的门禁；未到达阶段的 pending 不计） |
| 置信度 | 判定为是时 Medium，否时 High |
| 建议 | 评审门禁标准与证据要求 |

## 输出格式

```json
{
  "ok": true,
  "command": "causal",
  "run_id": "run-abc123",
  "status": "blocked",
  "root_cause": {
    "dimension": "scope",
    "confidence": "medium",
    "suggestion": "Review scope definition and enforce non-goals"
  },
  "causes": [
    {
      "dimension": "scope",
      "question": "Is it a scope problem?",
      "evidence": "3 scope-related changes in history",
      "verdict": "likely",
      "confidence": "medium",
      "suggestion": "Review scope definition..."
    }
  ],
  "likely_causes": ["scope"],
  "confidence": "medium"
}
```

## 用法

```bash
node scripts/run-state.cjs causal --state <file>
```
