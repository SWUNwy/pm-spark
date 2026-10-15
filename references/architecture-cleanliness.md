# history/retired — 架构整洁性

本文档《架构整洁性》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 架构清洁度门禁（Architecture Cleanliness Gate）

Solution 或 Mixed 分析在 Verification 前使用。

## 四个强制维度

| 维度 | 问题 | 通过证据 |
|---|---|---|
| Pattern consistency（模式一致性） | 提案遵循既有项目模式吗？是否引入第二个竞争的抽象？ | 引用了既有模式并解释了任何有意偏差 |
| Responsibility separation（职责分离） | domain、orchestration、data、UI、policy、integration 职责是否清晰分配？ | 组件/职责图，无实质重叠或无主职责 |
| Minimal change（最小改动） | 这是达成目标的最小系统性改动吗？新层/依赖有论证吗？ | 与更小替代方案的 delta 比较 |
| Patch resistance（补丁抵抗力） | 设计解决所有相关路径的根因，还是只补一个症状？ | 失效机制、不变量与回归覆盖明确 |

## 流程

1. 打分前检查既有架构与约束。
2. 对每个严肃选项按全部四个维度评估。
3. 记录证据，不用"clean"、"scalable"这类形容词。
4. 识别最强的更小替代方案与最强的系统性替代方案。
5. 只有全部维度通过、或有授权显式 waiver 记录接受的债务时，才通过 `G-Architecture`。

## 输出

```markdown
| Option | Pattern consistency | Responsibility separation | Minimal change | Patch resistance | Verdict |
|---|---|---|---|---|---|
```

## 失败行为

- 缺项目上下文 → 回到 Discovery。
- 一个维度弱 → 修复选项或降级建议。
- 多个维度弱 → 否决选项；不要平均抹平。
- 有意债务 → 记录负责人、后果、到期/复审触发与补偿检查。

机器记录：

```bash
node <skill-dir>/scripts/run-state.cjs gate --state <state> \
  --id G-Architecture --status pass --evidence "architecture-cleanliness.md"
```
