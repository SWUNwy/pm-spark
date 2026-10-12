# 示例：Explore + Brainstorm

## 场景
- Track: explore
- Analysis Type: requirement
- Depth: light

## 输入
"用户希望我们分析一下目前 pm-spark skill 的瓶颈在哪里，以及如何改进。先探索一下方向。"

## 流程

### 第 1 步：澄清范围
- 当前目标：理解瓶颈并探索改进方向。
- 只在缺口会改变探索方向时追问一个问题；已有信息足够时直接带着假设继续。
- 「瓶颈」指什么？（性能、质量、完整性、可用性？）
- 使用情境是什么？（日常开发、复杂分析、上手？）
- 有既有指标或投诉吗？

### 第 2 步：收集证据
- 检查当前状态：运行 `validate --state <file>` 验证完整性
- 审阅历史：运行 `index --query --filter track=analyze` 查过去 run
- 识别模式：运行 `diagnose --state <file> --mode full` 查既有问题

### 第 3 步：分析证据
- 按类别分组发现（Prompt、Context、Harness、Loop）
- 给每个发现打置信度标签
- 记入证据：`evidence --kind inference --claim "..." --confidence medium`

### 第 4 步：门禁检查
- G1: 范围清晰？→ Pass
- G2: 探索证据充分？→ Pass
- G3: 可以进入建议？→ Pass

## 输出
```json
{
  "status": "completed",
  "findings": [
    "Prompt Engineering: 78% — 缺少自适应能力和可度量指标",
    "Context Engineering: 87% — 接近但缺少 CQS 量化",
    "Harness Engineering: 92% — 基本健全，仅欠混沌测试和看门狗",
    "Loop Engineering: 52% — 最大缺口，缺少 Patch、Shadow、预测等闭环能力"
  ],
  "recommendation": "采用四阶段计划：Harness → Context → Prompt → Loop，按依赖顺序实施"
}
```

## 关键模式
1. **先宽后窄**：从开放探索开始，再聚焦具体领域
2. **基于证据的发现**：每个声明都有支撑证据
3. **门禁驱动进展**：证据不足不进入建议
4. **结构化输出**：带置信度的清晰分类
