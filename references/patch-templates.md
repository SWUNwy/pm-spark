# history/retired — 补丁模板

本文档《补丁模板》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 补丁模板（Patch Templates）

## 概述

补丁系统支持 5 种补丁类型：prompt、reference、config、code、template。每个补丁遵循生命周期：create → shadow → verify → promote → active。本参考文件记录每种类型的模板。

## 补丁生命周期

```
create → shadow → verify → promote → active
                        ↑
                   failed → discard
```

- **create**：生成补丁定义
- **shadow**：以影子模式部署（仅记录，无效果）
- **verify**：对比 shadow 与基线指标
- **promote**：验证通过则晋升为 active
- **active**：补丁生效；需要时可回滚

## 补丁类型

| 类型 | 范围 | 风险 | 模板 | 示例 |
|---|---|---|---|---|
| prompt | SKILL.md 内容 | 中 | `{ "type": "prompt", "target": "role_definition", "change": "...", "rationale": "..." }` | 加约束重申 |
| reference | references/*.md | 低 | `{ "type": "reference", "target": "file.md", "change": "...", "rationale": "..." }` | 更新信号阈值 |
| config | Guardrails、阈值 | 低 | `{ "type": "config", "target": "parameter", "from": X, "to": Y }` | 调整门禁阈值 |
| code | run-state.cjs 命令 | 高 | `{ "type": "code", "target": "function", "change": "...", "tests_required": true }` | 添加新命令 |
| template | 输出模板 | 低 | `{ "type": "template", "target": "output_type", "template": "..." }` | 新报告格式 |

## 补丁生成

### Prompt 补丁

```json
{
  "type": "prompt",
  "target": "role_definition",
  "change": "Add constraint reiteration at end of each section",
  "rationale": "Constraint retention score dropped below 0.85 after 3 turns",
  "risk": "medium",
  "tests_required": false
}
```

### Reference 补丁

```json
{
  "type": "reference",
  "target": "references/predictive-signals.md",
  "change": "Adjust evidence_stagnation threshold from 3 to 4 turns",
  "rationale": "False positive rate too high at 3 turns",
  "risk": "low",
  "tests_required": false
}
```

### Config 补丁

```json
{
  "type": "config",
  "target": "guardrails.max_repair_iterations",
  "from": 3,
  "to": 5,
  "rationale": "Complex tasks consistently need more iterations",
  "risk": "low",
  "tests_required": false
}
```

### Code 补丁

```json
{
  "type": "code",
  "target": "commandValidate",
  "change": "Add evidence chain verification to validate command",
  "rationale": "Current validate does not check HMAC chain integrity",
  "risk": "high",
  "tests_required": true
}
```

### Template 补丁

```json
{
  "type": "template",
  "target": "checkpoint_output",
  "template": "# Analyze Checkpoint\n\n- Status: {{status}}\n- Evidence: {{evidence_count}} entries\n",
  "rationale": "Standardize checkpoint format across all tracks",
  "risk": "low",
  "tests_required": false
}
```

## 补丁验证

| 类型 | 验证方法 | 通过标准 |
|---|---|---|
| prompt | 用补丁内容 dry-run adapt-prompt | 生成的提示是有效 JSON，全部组件存在 |
| reference | 读补丁文件，验证结构 | 文件存在、有效 markdown、必需章节存在 |
| config | 加载配置，验证参数范围 | 值在参数有效范围内 |
| code | 用补丁代码跑测试套件 | 全部既有测试通过，无回归 |
| template | 用补丁模板生成输出 | 输出有效且含全部必需字段 |

## CLI 用法

```bash
# 创建 prompt 补丁
node scripts/run-state.cjs patch --type prompt --content "..."

# 创建 reference 补丁
node scripts/run-state.cjs patch --type reference --content "..."

# 列出全部补丁
node scripts/run-state.cjs patch --list

# 把 shadow 补丁晋升为 active
node scripts/run-state.cjs patch --transition <id> --to active
```
