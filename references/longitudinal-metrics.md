# history/retired — 纵向指标

本文档《纵向指标》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 纵向指标（Longitudinal Metrics）

## 概述

纵向跟踪检测随时间的趋势，而不是依赖单点快照。`longitudinal` 命令聚合跨 run 指标并识别退化模式。

## 指标框架

| 类别 | 指标 | 收集方法 | 评估周期 | 目标 |
|---|---|---|---|---|
| Quality | completion_rate、gate_pass_rate、evidence_quality | 每 run 指标 | 7d | >85% |
| Efficiency | avg_duration_minutes、avg_tokens_per_run | 每 run 指标 | 7d | <120min、<80K |
| Cost | total_tokens、repair_iterations | 每 run 指标 | 30d | -10%/mo |
| Stability | stopped_rate、blocked_rate、failure_modes | Index 聚合 | 30d | <15% |
| Improvement | patch_adoption_rate、patch_effectiveness | Meta-Loop | 90d | >60% |

## 退化检测

`--degradation` 标志比较滚动平均以检测指标退化：

**算法：**
1. 计算每个指标的 7 天滚动平均
2. 计算每个指标的 30 天滚动平均
3. 任一指标 7d 平均比 30d 平均差 >10%，标为退化
4. >2 个指标同时退化时，建议调查

**示例输出：**

```json
{
  "degradation": true,
  "degraded_metrics": [
    {
      "metric": "completion_rate",
      "7d_avg": 0.72,
      "30d_avg": 0.85,
      "change": -0.13,
      "threshold": -0.10,
      "severity": "warning"
    },
    {
      "metric": "avg_duration_minutes",
      "7d_avg": 145,
      "30d_avg": 110,
      "change": 0.32,
      "threshold": 0.10,
      "severity": "warning"
    }
  ],
  "recommendation": "Investigate: 2 metrics degraded simultaneously"
}
```

**退化阈值：**

| 指标 | 方向 | 退化阈值 | 严重度 |
|---|---|---|---|
| completion_rate | 下降 | >10% 下降 | warning |
| gate_pass_rate | 下降 | >10% 下降 | warning |
| evidence_quality | 下降 | >10% 下降 | warning |
| avg_duration_minutes | 上升 | >10% 上升 | info |
| avg_tokens_per_run | 上升 | >10% 上升 | info |
| total_tokens | 上升 | >10% 上升 | info |
| repair_iterations | 上升 | >10% 上升 | info |
| stopped_rate | 上升 | >5% 上升 | critical |
| blocked_rate | 上升 | >5% 上升 | critical |
| patch_adoption_rate | 下降 | >10% 下降 | info |
| patch_effectiveness | 下降 | >10% 下降 | warning |

## 周期窗口

| 周期 | 描述 | 用例 |
|---|---|---|
| 1d | 最近 24 小时 | 每日健康检查 |
| 7d | 滚动 7 天 | 标准评估窗口 |
| 30d | 滚动 30 天 | 趋势分析、成本跟踪 |
| 90d | 滚动 90 天 | 改进跟踪、采用趋势 |

## CLI 用法

```bash
# 查看最近 7 天指标
node scripts/run-state.cjs longitudinal --state <file> --index <file> --period 7d

# 检查退化
node scripts/run-state.cjs longitudinal --state <file> --index <file> --degradation

# 每日健康检查
node scripts/run-state.cjs longitudinal --state <file> --index <file> --period 1d
```
