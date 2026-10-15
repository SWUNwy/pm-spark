# history/retired — 跨会话上下文

本文档《跨会话上下文》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 跨会话上下文检索（Cross-Session Context Retrieval）

## 检索策略

run 初始化时自动检索历史 run 的相关信息：

| 检索类型 | 匹配条件 | 返回内容 | 最大条数 |
|---|---|---|---|
| 相似目标 | goal 关键词重叠 > 50% | 前 3 个相似 run 的结论与决策 | 3 |
| 相似失败 | 同 track + 同失败模式 | 前 2 个修复方案与效果 | 2 |
| 共享资产 | 相同 reference 文件 | 修改历史与改进建议 | 1 |
| 模式警告 | 跨 run 模式检测 | 当前 run 可能面临的已知风险 | 2 |

## 注入方法

历史上下文不直接注入模型，而是通过工作记忆的 `historical_context` 字段间接注入：

```json
{
  "working_memory": {
    "historical_context": {
      "similar_runs": [
        {"run_id": "...", "goal": "similar analysis", "conclusion": "key findings", "relevance": 0.85}
      ],
      "known_risks": [
        {"risk": "scope_creep", "frequency": "3/5 similar runs", "prevention": "scope boundary check"}
      ],
      "reusable_decisions": [
        {"decision": "architecture choice", "validated": true, "evidence": "verification passed"}
      ]
    }
  }
}
```

## 命令接口

```bash
# 检索跨会话上下文
node scripts/run-state.cjs cross-session-context --state <file>

# 输出把 historical_context 写入 working_memory
```

## CLI 输出

```json
{
  "ok": true,
  "command": "cross-session-context",
  "historical_context": {
    "similar_runs": [...],
    "known_risks": [...],
    "reusable_decisions": [...]
  }
}
```
