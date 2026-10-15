# history/retired — 预测信号

本文档《预测信号》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 预测信号（Predictive Signals）

## 概述

预测信号是由 `predict` 命令检测的早期预警指标。每个信号是 run 状态或历史中与已知失败模式相关的模式，在失败实际发生前被检测到。

## 信号生命周期

```
shadow → 评估 → active → 持续 → inactive
   ↑                        ↑
   仅记录，不干预           准确率下降后自动降级
```

**激活条件**（任一）：
- 累计 run >= 5
- 累计证据条目 >= 50
- 手动 `--activate` 标志
- 历史预测准确率 > 70%（最近 10 次预测）

## 信号参考

### evidence_stagnation

| 属性 | 值 |
|---|---|
| 检测 | 3+ 轮无新证据 |
| 预测 | G2 失败（证据不足无法过关） |
| 提前量 | 2-3 轮 |
| 默认模式 | active |
| 风险权重 | 0.6 |
| 干预 | 记录到证据 |

### question_repetition

| 属性 | 值 |
|---|---|
| 检测 | 同一问题或理由出现 2+ 次 |
| 预测 | 低信息循环 |
| 提前量 | 1 轮 |
| 默认模式 | active |
| 风险权重 | 0.5 |
| 干预 | 记录到证据 |

### repair_strategy_repeat

| 属性 | 值 |
|---|---|
| 检测 | 连续 repair 转换且 reason 文本相同 |
| 预测 | 修复预算耗尽 |
| 提前量 | 1 个修复周期 |
| 默认模式 | active |
| 风险权重 | 0.7 |
| 干预 | 记录到证据 |

### scope_creep

| 属性 | 值 |
|---|---|
| 检测 | >50% 历史条目未引用目标关键词 |
| 预测 | 范围漂移 |
| 提前量 | 3-5 轮 |
| 默认模式 | active |
| 风险权重 | 0.6 |
| 干预 | 记录到证据 |

### token_growth_acceleration

| 属性 | 值 |
|---|---|
| 检测 | 每轮 token 增长 > 20% |
| 预测 | 预算超支 |
| 提前量 | 2-3 轮 |
| 默认模式 | active |
| 风险权重 | 0.5 |
| 干预 | 记录到证据 |

### decision_hesitation

| 属性 | 值 |
|---|---|
| 检测 | 工作记忆中决策修改 2+ 次 |
| 预测 | 质量退化 |
| 提前量 | 2 轮 |
| 默认模式 | shadow（自动转 active） |
| 风险权重 | 0.4 |
| 干预 | 记录到证据 |

### reference_chain_depth

| 属性 | 值 |
|---|---|
| 检测 | 引用嵌套超过 3 层 |
| 预测 | 上下文膨胀 |
| 提前量 | 5 轮 |
| 默认模式 | shadow（自动转 active） |
| 风险权重 | 0.3 |
| 干预 | 触发压缩 |

### user_disconfirmation

| 属性 | 值 |
|---|---|
| 检测 | 最近 10 条中 3+ 个 "rethink"/拒绝信号 |
| 预测 | 方向错误 |
| 提前量 | 1 轮 |
| 默认模式 | shadow（自动转 active） |
| 风险权重 | 0.8 |
| 干预 | 记录到证据 |

## 激活状态

```json
{
  "status": "shadow | active | inactive",
  "runs_analyzed": 0,
  "total_predictions": 0,
  "accurate_predictions": 0,
  "accuracy": 0,
  "activated_at": null,
  "min_accuracy_for_active": 0.7,
  "min_runs_for_active": 5,
  "auto_deactivate_threshold": 0.5
}
```

## 集成

`predict` 在 `transition` 与 `gate` 操作后自动调用（best-effort，失败不影响原操作；实现见 `run-state.cjs` 的 `runPredictiveSignals`）。影子模式下只记录信号、不干预。激活模式下，风险 >= 0.7 的信号在命令输出中给出干预建议（`intervention: recommended`）；该建议是提示性的——实际证据记录仍是需要显式执行的手动动作。

## 准确率跟踪

每次预测记录预测的失败是否实际发生。准确率 = `accurate_predictions / total_predictions`。准确率低于 0.5 时，系统自动降级到影子模式。
