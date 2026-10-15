# history/retired — 明确范围 few-shot 示例

本文档《明确范围 few-shot 示例》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 示例：Specify + Scope

## 场景
- Track: specify
- Analysis Type: solution
- Depth: standard

## 输入
"为 pm-spark skill 实现一个 'context-score' 命令，能够计算 5 维度的上下文质量评分，包含 signal_to_noise、information_freshness、working_memory_utilization、context_coherence 和 relevance_decay。"

## 流程

### 第 1 步：澄清需求
- **核心问题**："context-score" 命令需要做什么？
- **成功标准**：
  - 接受 `--state <file>` 参数
  - 用定义权重计算 5 个维度
  - 输出 0-1 综合评分
  - 低分生成建议
- **非目标**：
  - 不直接修改模型行为
  - 不把评分持久化到 state（只读分析）
- 当前交付是 Spec，范围、契约和验收缺一项会改变交付类型或可执行性时，每轮只补一个关键项。

### 第 2 步：定义范围边界
- **范围内**：
  - 5 个维度计算函数
  - 加权评分（0.35/0.20/0.20/0.15/0.10）
  - 建议生成
  - JSON 输出
- **范围外**：
  - 自动上下文优化
  - 跨 run 比较
  - 历史趋势跟踪

### 第 3 步：设计接口
```bash
node scripts/run-state.cjs context-score --state <file>
```

### 第 4 步：定义实施契约
- **输入契约**：有效的 state.json，含 history、working_memory 与 evidence 文件
- **输出契约**：`{ "ok": true, "command": "context-score", "context_quality_score": 0.85, "dimensions": [...], "weights": {...}, "recommendations": [...] }`
- **错误契约**：`{ "ok": false, "error": "Missing --state" }`

### 第 5 步：门禁检查
- G1: 需求清晰 → Pass
- G2: 范围含 in/out 边界 → Pass
- G-Spec: 实施契约已指定 → Pass
- G-Human: 人工承诺已确认 → Pass

## 输出
```json
{
  "ok": true,
  "command": "specify",
  "target": "context-score command",
  "deliverable": "New run-state.cjs command with 5-dimension CQS computation",
  "spec_file": "references/context-assembly.md",
  "acceptance_criteria": [
    "context-score --state <file> returns 5 dimensions",
    "Each dimension has 0-1 score and detail",
    "Composite score is weighted correctly",
    "Recommendations generated for low-scoring dimensions"
  ]
}
```

## 关键模式
1. **显式 in/out 范围**：清晰定义包含与不包含
2. **契约优先设计**：实施前定义输入/输出/错误契约
3. **门禁驱动定界**：用门禁验证范围完整性
4. **验收标准**：定义可测量的通过/失败条件
