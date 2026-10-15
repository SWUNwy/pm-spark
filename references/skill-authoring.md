# history/retired — 技能编写

本文档《技能编写》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 编写 Skill

## 加载时机

创建新 skill、编辑既有 skill、或在部署前验证 skill 是否有效时加载。

## 核心原则

编写 skill 就是**对流程文档做测试驱动开发**：先写测试用例（用子代理跑压力场景），观察失败（基线行为），再写 skill（文档），确认测试通过（代理合规），最后重构（堵住漏洞）。

如果没看过代理在没有 skill 时的失败，就无法判断 skill 是否教对了该防的东西。

## 铁律

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

新 skill 与既有 skill 的编辑同样适用。测试之前写好的 skill，删除重来。

没有例外：
- 不为"简单补充"开例外
- 不为"只加一节"开例外
- 不为"只是改文档"开例外
- 不把未测试改动当参考保留
- 不在跑测试时顺手调整内容
- 删除就是删除

## Skill 与 TDD 的对应

| TDD 概念 | Skill 创建流程 |
|---|---|
| 测试用例 | 带子代理的压力场景 |
| 生产代码 | Skill 文档（SKILL.md） |
| 测试失败（RED） | 无 skill 时代理违反规则（基线） |
| 测试通过（GREEN） | 有 skill 时代理守规则 |
| 重构 | 保持合规的同时堵漏洞 |
| 先写测试 | 写 skill 之前先跑基线场景 |
| 观察失败 | 逐字记录代理使用的合理化 |
| 最小实现 | 只写针对实际违规的内容 |
| 观察通过 | 验证代理现在守规则 |
| 重构循环 | 找新合理化 → 堵 → 复验 |

## 何时创建

创建：技术对你不是直觉显而易见、你会跨项目反复引用、模式广泛适用（非项目特定）、他人也会受益。

不创建：一次性方案、别处已有良好文档的标准实践、项目特定约定（放进 instructions 文件）、机械约束（能用校验自动化的就自动化）。

## Skill 类型

| 类型 | 描述 | 示例 |
|---|---|---|
| Technique | 带明确步骤的具体方法 | condition-based-waiting、root-cause-tracing |
| Pattern | 思考问题的方式 | flatten-with-flags、test-invariants |
| Reference | API 文档、语法指南、工具文档 | office docs |

## 目录结构

```
skills/
  skill-name/
    SKILL.md              # 主参考（必需）
    supporting-file.*     # 按需
```

独立成文件：重型参考（100 行以上）、可复用工具（脚本、工具、模板）。
内联保留：原则与概念、小型代码模式（50 行以内）以及其他内容。

## frontmatter

两个必需 YAML 字段，合计不超过 1024 字符：
- `name`：仅字母、数字、连字符
- `description`：第三人称，只描述何时使用（不描述做什么）

## description 的写法（关键）

description 只写触发条件，不总结工作流。

**原因：** 测试显示，description 一旦总结流程，代理会照着 description 执行而不再读完整 skill。例如 description 写 "code review between tasks"，代理只做一次评审，尽管流程图明确要求两次（先 spec 合规、再代码质量）；改为纯触发条件后，代理正确读图并执行两阶段评审。

```yaml
# ❌ 总结了工作流——代理照此执行而不读 skill
description: Use when executing plans — dispatches subagent per task with code review between tasks

# ❌ 过程细节过多
description: Use for TDD — write test first, watch it fail, write minimal code, refactor

# ✅ 只写触发条件
description: Use when executing implementation plans with independent tasks in the current session

# ✅ 只写触发条件
description: Use when implementing any feature or bugfix, before writing implementation code
```

规则：以 "Use when..." 开头；写具体触发词、症状、情境；描述问题而非语言特性；除非 skill 本身技术特定，否则保持技术无关；第三人称；绝不总结工作流。

## Token 效率

上下文窗口是公共资源，每个 token 都在与对话历史竞争。

目标：上手工作流各 <150 词；高频加载的 skill 总计 <200 词；其他 skill <500 词。

技巧：细节放进工具帮助（`--help`）而非内联列出全部参数；用交叉引用代替重复；示例宁精勿滥；消除冗余。

## 命名

主动语态、动词开头：
- ✅ `creating-skills`，不是 `skill-creation`
- ✅ `condition-based-waiting`，不是 `async-test-helpers`
- ✅ `root-cause-tracing`，不是 `debugging-techniques`

动名词（-ing）适合流程类：`creating-skills`、`testing-skills`、`debugging-with-logs`。

## 交叉引用

只引用 skill 名，并标明是否必需：
- ✅ `**REQUIRED SUB-SKILL:** Use references/test-first-development.md`
- ❌ `See skills/testing/test-first-development`（不清楚是否必需）
- ❌ `@skills/testing/test-first-development/SKILL.md`（强制加载，浪费上下文）

## 流程图使用边界

只用于：不明显的决策点、可能过早停止的循环、"何时用 A vs B"的判断。
不用于：参考材料（用表格和列表）、代码示例（用代码块）、线性指令（用编号列表）。

## 按类型测试

| Skill 类型 | 测试方法 |
|---|---|
| 纪律强制（规则） | 学术问答 + 压力场景 + 组合压力；识别合理化并加显式反制 |
| Technique（步骤） | 场景 → 代理能否按步骤执行；边界情况如何 |
| Reference | 查找场景 → 代理能否找到信息 |
| Pattern（思考） | 问题场景 → 代理应用模式还是退回默认行为 |

## 常见错误

| 错误 | 修正 |
|---|---|
| 跳过基线测试 | 写 skill 前总是先跑压力场景 |
| description 含工作流 | description 只写何时使用 |
| 同一模式重复示例 | 一个优秀示例足矣 |
| 用 `@` 强制加载 | 改用仅名交叉引用 |
| 上手文档冗长 | 目标 <150 词 |
| 被动语态命名 | 动词开头主动语态 |

## 相关文档

- `references/test-first-development.md` — RED-GREEN-REFACTOR 基础循环
- `references/skill-adversarial-testing.md` — 对 skill 文档做 TDD（压力场景、合理化表、元测试）
- `references/persuasion-principles.md` — 压力场景为何有效
- `references/anthropic-best-practices.md` — skill 编写最佳实践的操作化整理
- `references/completion-verification.md` — 验证纪律
