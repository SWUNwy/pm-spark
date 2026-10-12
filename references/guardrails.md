# 护栏系统（Guardrails System）

## 目的

护栏是运行时安全约束，防止 spec-analyze skill 执行未授权、不安全或重复操作。每条护栏有触发条件与默认动作。护栏可在运行时添加、覆盖、检查或列出。

## 内置护栏

| ID | 规则 | 默认动作 | 触发条件 |
|----|------|---------|---------|
| GR-1 | 不执行未授权代码 | `block` | 尝试在 `.analyze/` 外写入或运行可执行文件 |
| GR-2 | 不外部修改 state.json | `warn` | 检测到外部进程或手工编辑 `state.json` |
| GR-3 | 不在 .analyze/ 外创建工件 | `block` | 写入目标在 `.analyze/` 之外 |
| GR-4 | 不重复同一修复策略 | `force_stop` | 同一修复方式无实质变化地尝试两次 |
| GR-5 | 不超过最大参考深度 | `degrade` | 参考深度超过当前轨道配置上限 |
| GR-6 | 不泄漏敏感字段 | `filter` | 输出包含匹配敏感模式的字段（key、secret、token、password） |

## 默认动作

| 动作 | 含义 |
|---|---|
| `block` | 操作被拒绝并返回错误。run 继续，但该操作不执行。 |
| `warn` | 操作继续，但警告被记入证据与历史。 |
| `force_stop` | run 立即停止。护栏违规被记录为停止原因。 |
| `degrade` | 降低参考深度或分析负担，不改变宿主权限。 |
| `filter` | 敏感内容从输出中脱敏。操作以清洗后的数据继续。 |

## CLI 用法

### 添加护栏

```bash
node scripts/run-state.cjs guardrail --state <state.json> --add GR-1
```

### 覆盖护栏默认动作

```bash
# 把 GR-1 从 block 改为 warn（在受控场景允许代码执行）
node scripts/run-state.cjs guardrail --state <state.json> --override GR-1 --action warn --reason "sandboxed environment verified"

# 把 GR-4 从 force_stop 改为 warn（调试时允许有限重复）
node scripts/run-state.cjs guardrail --state <state.json> --override GR-4 --action warn --reason "debug mode: tracing repair path"
```

### 检查护栏是否激活

```bash
node scripts/run-state.cjs guardrail --state <state.json> --check GR-1
```

返回 `{ active: true, rule: "...", default_action: "block", overridden: false }`。

### 列出全部激活护栏

```bash
node scripts/run-state.cjs guardrail --state <state.json> --list
```

返回全部激活护栏及其当前动作与覆盖状态。

## 扩展：自定义护栏

除 6 条内置护栏外，可修改 `scripts/run-state.cjs` 中的 `BUILTIN_GUARDRAILS` 常量添加自定义护栏：

```javascript
const BUILTIN_GUARDRAILS = {
  // ... existing guardrails ...
  "GR-7": { rule: "Do not access external networks without approval", default_action: "block" },
  "GR-8": { rule: "Do not modify locked specification files", default_action: "block" }
};
```

每条自定义护栏需要：
- 唯一 ID（`GR-7`、`GR-8`...）
- 描述约束的 `rule` 字符串
- 上述支持集合中的 `default_action`

## 执行点

护栏在闭环的这些位置执行：

| 阶段 | 应用的护栏 |
|---|---|
| Intake | GR-6（目标捕获时的泄漏检测） |
| Scope | GR-5（参考深度校验） |
| Discover | GR-3、GR-6（工件创建 + 泄漏） |
| Synthesize | GR-6（输出过滤） |
| Verify | GR-2（状态完整性检查） |
| Repair | GR-4（重复检测） |
| Complete | GR-1、GR-3、GR-6（最终安全检查） |

## 与宿主策略和批准的配合

具体动作遵循宿主当前策略与用户已有授权；已有授权不足时，按宿主要求补充批准。质量门禁和运行状态不授予执行权限。

护栏记录分析过程中的约束与覆盖。覆盖护栏不改变宿主策略，也不替代用户批准；执行动作仍须满足宿主的授权要求。
