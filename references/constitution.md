# history/retired — 宪法/基本准则

本文档《宪法/基本准则》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 项目宪章适配器（Project Constitution Adapter）

## 目的

应用项目级约束，同时不允许本地文件覆盖系统/开发者指令、用户授权或 Harness 不变量。

## 检测

run 初始化时，`run-state.cjs` 按顺序检查：

1. 显式 `--constitution <path>`。
2. `<project-root>/.claude/constitution.md`。
3. `<project-root>/constitution.md`。

引擎记录解析后的路径与 SHA-256 哈希。检测到的 Constitution 必须在 run 离开 `intake` 前完成评估与应用。之后若文件变化，校验失败，直到新 run 或显式重新检测。

## 优先级与授权

按此顺序应用：

```text
system/developer policy > current user authority > project Constitution > Skill defaults
```

Constitution 可以收窄模式、路径、工件、引用或门禁。它不能授予外部授权、绕过 G1/G2/G3、授权实施或外部动作，或削弱更高层安全规则。

与更高层指令冲突时：记录冲突，遵循更高层指令。内部冲突或无法可靠解读时：进入 `awaiting_user` 或 `blocked`；不要静默选择方便的解读。

## 评估 schema

读 Constitution 后，用 `assets/constitution-assessment.template.json` 创建评估 JSON。支持字段：

| 字段 | 含义 |
|---|---|
| `mode_overrides` | 禁用/受限的轨道或具体动作 |
| `output_paths` | 必需的目的地与命名约定 |
| `spec_artifacts` | Specify 输出的必需增补/替换 |
| `additional_gates` | 带 `id`、描述与执行阶段的项目门禁 |
| `additional_references` | 在声明阶段加载的项目文件 |
| `post_spec_flow` | Specify 后的必需交接行为 |

自定义门禁 ID 必须匹配 `G-<name>` 且不得与内置门禁冲突。`required_before` 必须是 `scope`、`verify` 或 `complete`。

## 应用

```bash
node <skill-dir>/scripts/run-state.cjs constitution \
  --state <run-dir>/state.json \
  --input <assessment.json> \
  --evidence ".claude/constitution.md#relevant-sections"
```

然后用常规 `gate` 命令通过自定义门禁。引擎在其声明阶段强制执行。

## 映射规则

- `mode_overrides`：更新路由/行动行为；除非 Constitution 定义了回退，否则不要发明禁用轨道的替代路径。
- `output_paths`：创建报告或 Spec 工件前应用；值未知前保留占位符。
- `spec_artifacts`：审慎合并并记录增补；项目要求优先于 Skill 默认。
- `additional_gates`：创建机器可见的 pending 门禁；永远不要降级为散文提醒。
- `additional_references`：及时加载并记录为本地来源。
- `post_spec_flow`：纳入交接包；它本身不授权下游执行。

## 恢复

恢复时先校验 Constitution 哈希。若变化，停止推进，并总结哪些已过门禁或输出可能已过期。
