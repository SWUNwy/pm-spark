# history/retired — 评估指南

本文档《评估指南》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 评估指南（Evaluation Guide）

## 评估层

1. **包校验** — frontmatter、必需资源、名称与链接。
2. **状态引擎测试** — 合法/非法转换、门禁、修复预算、停止与恢复。
3. **用例结构测试** — 测试字段、分组覆盖、引用路径、硬失败声明。
4. **响应门禁** — 摄入已评分响应记录并强制阈值/硬失败。
5. **前瞻测试** — 在全新真实任务上运行 Skill，评判生成的 trace/工件。

第 1-4 层是确定性的。第 5 层需要模型/宿主 runner；不要仅凭结构测试宣称语义质量。

## 命令

在 Skill 目录下：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py .
node scripts/test-run-state.cjs
node scripts/evaluate-tests.cjs tests
node scripts/evaluate-response.cjs --result <scorecard.json>
```

## 通过策略

- 全部包与状态引擎测试通过。
- 无无效/缺失测试用例或引用。
- 每个必需分组达到最小数量。
- 响应分数达到所选阈值。
- 无硬失败。
- 替换 v1 前至少通过一个未见过的前瞻测试。

## 前瞻测试隔离

- 使用全新上下文。
- 传原始任务与 v2 Skill 路径，不要传期望答案或已知 bug。
- 不向 worker 暴露预期模式、状态序列或评分答案。
- 收集 state、evidence、checkpoint、result、工具 trace 与用户可见响应。
- 运行后用用例评分标准评判。
- 把历史回归任务与未见前瞻任务分开。

## 测试来源

- `regression`：先前的真实失败。
- `legacy`：刻意保留的 v1 行为。
- `synthetic`：构造的边界条件。
- `forward`：未见过的真实任务。
- `blocked_source`：已识别真实来源但内容暂不可取；不能算通过的前瞻测试。

## 晋升规则

一次演示后不要替换 v1。在至少 10 个代表性任务上并排运行 v2。仅当无关键回归、硬失败率为零、且恢复/验证证据持续产出时才晋升。
