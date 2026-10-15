# history/retired — 验证评分标准

本文档《验证评分标准》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 验证评分标准（Verification Rubric）

## 评分

每项标准 0-4 分：

- `0` 缺失或实质错误
- `1` 弱；主要缺口
- `2` 可用，需要有意义修复
- `3` 强；次要缺口
- `4` 达到决策/交付就绪

加权分：

```text
weighted_score = Σ(score / 4 × weight)
```

默认通过阈值：`0.80`。Decision-grade 与高风险工作：`0.90`。无论分数如何，任何硬失败都不得通过。

## 标准

| 标准 | 权重 | 可观测检验 |
|---|---:|---|
| Goal fit（目标契合） | 0.15 | 回答当前期望结果，而非相邻问题 |
| Scope coverage（范围覆盖） | 0.15 | 覆盖必需范围、非目标、边界情况与依赖 |
| Evidence traceability（证据可追溯性） | 0.20 | 决定性声明映射到证据或标注推理 |
| Reasoning consistency（推理一致性） | 0.15 | 结论遵循标准/证据；无内部矛盾 |
| Alternative pressure test（备选压力测试） | 0.10 | 强备选与反方论点被公平考虑 |
| Actionability（可执行性） | 0.10 | 下一步动作、负责人/条件与成功信号清晰 |
| Risk and uncertainty（风险与不确定性） | 0.10 | 置信度、假设、局限与失效触发条件明确 |
| Communication quality（沟通质量） | 0.05 | 直接、比例得当、易懂且不隐瞒注意事项 |

## 轨道附加项

### Explore

- 选项多样性且无失控分支。
- 假设与有希望的收敛信号可见。
- 没有把过早的 Spec 或建议伪装成探索。

### Analyze

- 决策标准先于推荐。
- 需求分析包含用户/场景/范围/验收。
- Solution/Mixed 分析通过 G-Architecture，并对模式一致性、职责分离、最小改动与补丁抵抗力分别给出证据；不要把这些维度埋进总分。
- 战略分析检查资源、顺序、备选方案与重新评估触发条件。

### Specify

- 验收标准可测试。
- 主路径、边界路径与失败路径均有体现。
- 任务可追溯到范围与验收标准。
- 不推断实施授权。

## 硬失败

- 伪造或虚假验证的证据。
- 把未验证或未加注的重要易变事实表述为当前事实。
- 只锚定先前对话的推荐。
- 静默扩大范围或违反必需非目标。
- 无 G-Spec 授权写正式 Spec。
- 无宿主授权执行项目/外部动作。
- 必需验证失败或未运行却宣称完成。
- 状态/证据/结果实质矛盾。
- 重试上限后仍重复同一修复（见 Guardrail GR-4）。
- 未经 G-Human 把高风险承诺表述为已批准。
- 忽略、使用过期 Constitution，或借其绕过更高层授权。
- 适用条件门禁被遗漏或虚假标注为不适用。
- Prompt Budget 利用率超过 95% 且未执行压缩或降级动作。
- run 期间护栏拦截了操作却未在 state 中记录。

## 必需的 self-review 记录

完成前记录 `self-review` Check，覆盖：

- 占位符与未决 TODO；
- 范围/非目标合规；
- 决定性声明的证据链接；
- 内部矛盾；
- 适用的条件门禁与 Constitution 门禁；
- 输出/Track 契约完整性；
- 工件写入、代码执行与外部动作是否符合宿主策略及用户授权；
- 停止与失效条件。

该记录让原 G4 Self-Review 机器可见，且不与 G3 重复。

## 记分卡格式

```json
{
  "rubric_version": "2.0",
  "threshold": 0.8,
  "criteria": [
    {
      "id": "goal_fit",
      "score": 3,
      "weight": 0.15,
      "evidence": ["result.md#conclusion"],
      "repair": "Clarify the decision the user must make"
    }
  ],
  "hard_fails": [],
  "weighted_score": 0.84,
  "verdict": "pass"
}
```

把记分卡保存为验证证据事件。重要工作用独立评审或确定性检查处理客观标准；仅自评不够。
