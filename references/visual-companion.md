# history/retired — 可视化伴生

本文档《可视化伴生》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# Visual Companion

只有空间呈现实质改善决策时才用 Visual Companion。它是分析闭环上的可选视图，不是 Track、Gate 或批准渠道。

## 及时提供

只为下一个明确是视觉的问题提供：

- UI 布局、线框或组件对比；
- 架构、依赖、状态或流程图；
- 密集的并排选项或矩阵比较；
- 文字讲不清的空间关系。

不要为普通范围问题、概念性 A/B/C 选择、短答案或 Markdown 表格已能讲清的文本提供它。把提议做成独立消息，用户接受前不启动任何东西。

建议话术：

```text
这一步用图看会比读文字更清楚。我可以启动本地 Visual Companion 展示布局、流程或方案对比；它会创建本地临时状态。是否启用？
```

## 启动

明确接受后：

```bash
node <skill-dir>/scripts/companion.cjs start \
  --project-dir <project-or-working-dir> --open
```

命令返回认证 URL 与会话目录。保留完整 URL（含 `?key=...`）。用 `--project-dir` 时状态存在 `.analyze/companion/` 下；适当时提醒用户忽略 `.analyze/`。

服务器默认绑定 loopback。除非用户明确需要远程访问并理解任何拿到完整 keyed URL 的人都能到达会话，否则不要用非 loopback 主机。

## 推送屏幕

创建受约束的 JSON，而不是任意 HTML：

```json
{
  "title": "CRM workflow options",
  "description": "Choose the clearest responsibility boundary.",
  "type": "choices",
  "slug": "crm-workflow-options",
  "items": [
    { "id": "a", "label": "Central orchestration", "description": "One coordinator owns transitions." },
    { "id": "b", "label": "Event choreography", "description": "Services react independently." }
  ]
}
```

支持的类型：

- `choices`：2-4 个可选项目。
- `matrix`：列 + 比较行。
- `flow`：节点 + 有向边。
- `message`：非交互等待或状态屏。

推送：

```bash
node <skill-dir>/scripts/companion.cjs push \
  --session <session-dir> --input <visual.json>
```

每次推送创建新的语义文件名；绝不覆盖先前屏幕。标签保持现实，可见选择数量保持小。

## 读事件

```bash
node <skill-dir>/scripts/companion.cjs events \
  --session <session-dir> --consume
```

把最新的清晰浏览器事件与聊天合并。聊天是权威的。视觉点击只是偏好证据，永远不能满足：

- G-Spec 或人工执行批准；
- 写文件或执行外部动作的许可；
- 实施计划的批准；
- 验收或完成验证。

事件与聊天冲突时遵循聊天，并在事件实质时记录冲突。

## 等待、状态与停止

```bash
node <skill-dir>/scripts/companion.cjs waiting --session <session-dir>
node <skill-dir>/scripts/companion.cjs status --session <session-dir>
node <skill-dir>/scripts/companion.cjs stop --session <session-dir>
```

回到纯文本工作时推送等待屏，避免浏览器显示过期选择。视觉步骤结束或空闲超时关闭服务器时停止它。

## 安全与降级

v2 companion 使用：

- 每会话随机 URL key 与 HttpOnly same-site cookie；
- 默认 loopback 绑定；
- 同源浏览器事件检查；
- 仅拥有者会话元数据；
- 转义、schema 约束渲染而非任意代理 HTML；
- 带消费游标的追加式事件日志；
- 唯一屏幕文件、空闲超时、停止标记与进程实例状态。

服务器或浏览器无法运行：用 Markdown 表格或 Mermaid 继续。视觉失败绝不能阻塞分析或验证。
