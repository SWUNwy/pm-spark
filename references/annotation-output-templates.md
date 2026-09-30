# 输出模板（Output Templates）

三种输出格式对应三条路由路径。Full 路径使用 spec-analyze 独有的标注框架与三文档输出。

## Product-only 交付边界

所有入口共享 `references/delivery-contract.json`。在写入 HTML、Markdown 或其他序列化输出前，必须调用 `filterDelivery(sourceDocument, "product", contract)`；不得直接序列化含 Implementation 或 Acceptance 字段的源文档。

入口 `full`、`standard`、`lightweight`、`direct_annotation`、`html_review_docs` 默认映射到 `product` 层。实施或验收内容只能通过显式提升 delivery layer 输出。


| 路径 | 输出 | 默认位置 |
|---|---|---|
| Lightweight | Insight Brief | 仅对话（不写文件） |
| Standard | Analysis Report + proposal.md | `docs/requirements/reports/YYYY-MM-DD-<topic>-report.md` |
| Full | proposal.md + design.md + tasks.md（+ HTML 原型） | `docs/requirements/specs/active/R0XX-<topic>/` |
| 已有方案注释 | 补充注释的 design.md / HTML 注释面板 | 输入文件同目录（追加注释，不创建新文件） |

用户偏好覆盖默认值。生成前展示路径。自动创建目标目录。

---

## Lightweight 路径 → Insight Brief

用于快速讨论。保持简洁——半页以内。

```markdown
## Insight Brief: [Topic]

### 核心洞见
1. **[洞见]** — [为什么重要（一句话）]
2. **[洞见]** — [为什么重要（一句话）]
3. **[洞见]** — [为什么重要（一句话）]

### 关键决策
| 决策 | 状态 | 上下文 |
|------|------|--------|
| [已决定或待决定事项] | 已决定 / 待定 | [简要上下文] |

### 下一步
- [ ] [具体动作]
- [ ] [具体动作]
```

---

## Standard 路径 → Analysis Report

用于带方案对比的多视角分析。目标 1-2 页。

```markdown
## Analysis Report: [Topic]

**日期：** [YYYY-MM-DD]
**范围：** [分析内容]
**路径：** Standard（[激活角色]）

### 执行摘要
[2-3 句核心发现与建议]

### 多视角分析

#### [角色 1] 视角
- **发现：** [发现了什么]
- **顾虑：** [要注意什么]
- **建议：** [怎么处理]

#### [角色 2] 视角
- **发现：** [发现了什么]
- **顾虑：** [要注意什么]
- **建议：** [怎么处理]

#### [角色 3] 视角
- **发现：** [发现了什么]
- **顾虑：** [要注意什么]
- **建议：** [怎么处理]

### 方案对比

| 维度 | 方案 A | 方案 B | 方案 C（如适用） |
|------|--------|--------|------------------|
| 模式一致性 | | | |
| 职责分离 | | | |
| 补丁抵抗力 | | | |
| 最小改动 | | | |
| 复杂度 | | | |
| 风险等级 | | | |
| **契合度** | /10 | /10 | /10 |

### 风险与假设

| 项目 | 类型 | 缓解 / 验证 |
|------|------|------------|

### 建议
**[代理建议]** — [2-3 句推理]

### 优先动作
| 优先级 | 动作 |
|--------|------|
| P0 | [必须最先做] |
| P1 | [接下来做] |
| P2 | [有则更好] |
```

---

## Full 路径 → 三文档输出（+ 可选 HTML 注释）

spec-analyze 的核心差异化。产出三份相互关联的文档，使用 spec-analyze 独有的**标注框架**；已存在原型时，可选注入 **HTML 注释**。

### 标注框架

框架有两个正交层：**类型模板**（决定字段结构）与**注释等级**（决定字段深度）。两层必须同时应用。

#### 层 1：类型模板（见 `references/annotation-templates.md`）

组件按交互模式分为 11 种类型（T1-T11）。每种类型定义：

- 必须存在的字段（如 FormFill 需要 `fields[]`，DataList 需要 `columns`）
- 强制状态覆盖（如 FormFill：normal、fieldError、submitting、success、apiError）
- 适用内容规则（产品语言，不是代码）
- 需要的共享块（DialogContext / APICall / Permission）

**使用规则：** 总是先把每个组件映射到类型。没有类型匹配时，组件可能是需要新类型定义的新颖交互模式。

#### 层 2：注释等级

| 等级 | 何时使用 | 字段 |
|---|---|---|
| **L1 基础** | 简单交互（hover tooltip、静态展示） | trigger / behavior / dismiss |
| **L2 详细** | 复杂交互（modal、dropdown、表单校验） | L1 + placement / style / state / timing |
| **L3 完整** | 高精度 / 全局组件（DatePicker、Table、Modal） | L2 + accessibility / responsive / i18n |

**使用规则：**
- **L1 默认**：所有注释从 L1 开始
- **按需升级**：仅当 L1 不足以支撑实施时才升级到 L2
- **L3 保留给全局组件**：仅用于跨多页面复用的组件
- **不重复显而易见的事**：Ant Design / MUI 默认行为不需要注释

#### 显示模型：评审视图 / 实施视图（v3.2）

注释默认用于**方案评审**，因此展示层区分两个视图，底层数据始终完整：

| 视图 | 默认 | 展示 | 隐藏（按需展开） |
|---|---|---|---|
| **评审视图** | ✅ 默认 | 触发、行为、关闭、**用户可见状态**（用户语言）、视觉要点、UI 文案、字段摘要表 | state 全枚举、timing、API、Permission、i18n、accessibility |
| **实施视图** | 按需展开 | 全部字段 + 共享块 + 字段级 ℹ️ 弹窗 | 无 |

**默认语言：中文。** 注释正文与角色标签默认中文；仅当用户要求英文输出时才切换。

角色标签映射：`[Dev]`→`【开发】`；`[Dev·Tester]`→`【开发·测试】`；`[UI]`→`【UI】`；`[Tester]`→`【测试】`。

**字段级注释的展示：**
- 评审视图：以**字段摘要表**展示（字段、必填、规则、空值/错误文案、来源），评审者可整表扫读。
- 实施视图：保留 ℹ️ 逐字段弹窗（`componentKey.fieldKey`，写入 `ANNOTATIONS[componentKey].fields` 或 `.columns`）。

评审视图的**用户可见状态**用产品语言描述（如「校验错误」「提交中」「成功」「失败」），不展示内部状态机枚举；实施视图再展开 state 全分支。

#### 两层同时应用

1. 识别组件 → 映射类型（T1-T11）→ 确定必需字段
2. 选择注释等级（L1-L3）→ 确定字段深度
3. 对每个类型强制字段，按所选等级的深度填充

**示例：** L2 的 FormFill 组件得到：
- 类型强制字段：trigger、fields[]、api、behavior、context（权限）、dismiss、state（强制：normal、fieldError、submitting、success、apiError）、style
- L2 深度增加：placement（DialogContext）、timing（200ms）、完整状态描述
- 类型模板中没有的字段（如 pagination）省略

#### 字段定义

```
L1 公共字段（按类型模板应用）
──────────────────────────────────────
trigger   触发条件      hover / click / focus / scroll / blur
behavior  行为描述      描述用户可感知的结果，而非实现
dismiss   关闭条件      mouse leave / click outside / Esc / auto-dismiss / confirm/cancel

L2 增加（按类型模板应用）
──────────────────────────────────────
placement 显示位置      center / topRight / dropdown / tooltip direction
style     视觉细节      color / spacing / font / z-index / border / shadow
state     状态行为      见 annotation-templates.md §4 的类型最小覆盖
timing    动画与延迟     200ms fade in / 100ms fade out / 300ms debounce

L3 增加
──────────────────────────────────────
accessibility  无障碍    Tab focus / Enter triggers / Esc closes / aria-label
responsive   响应式      Touch fallback / small screen adaptation / print
i18n         国际化      是否需要翻译
```

#### 状态规格规则

状态覆盖是**类型强制**的，不是可选的。`annotation-templates.md` §4 的每个类型模板定义最小状态：

| 类型 | 强制状态覆盖 |
|------|--------------|
| DisplayMetric | normal、loading、error |
| DataList | normal、loading、empty、error |
| ActionButton | normal、disabled、loading |
| ActionMenu | normal、open、disabled |
| ConfirmAction | normal、submitting、error |
| FormFill | normal、fieldError、submitting、success、apiError |
| ItemSelect | normal、loading、empty、searchEmpty、selected、confirming、error |
| SearchSelect | idle、focus、searching、selected、empty、error |
| Toast | show、hidden |
| StatusPlaceholder | empty、loading、error |
| PageInfo | hidden、visible |

每个状态必须覆盖两个视角：

| 视角 | 要求 | 示例 |
|---|---|---|
| **开发视角** | 描述组件在该状态下的行为 | `submitting: button loading + disabled, text "Logging in..."` |
| **测试视角** | 描述从触发到呈现的完整路径 | `error: blur on invalid email → red border + "Invalid email format"` |

#### 角色 ↔ 注释字段映射

| 角色 | 关注字段 | 原因 |
|---|---|---|
| PM / 产品评审 | behavior、context(permission)、data、preCheck | 业务规则、范围、访问控制 |
| 开发 | trigger、behavior、dismiss、state、api、fields.validation | 实现行为、API 集成、错误处理 |
| 测试 | state（全部分支）、trigger、dismiss | 状态转换变成测试用例 |
| UI | style、placement、timing、responsive | 视觉细节、位置、动画 |

### 模板：proposal.md

```markdown
# Proposal — {R0XX-需求名称}

> **需求 ID**：R0XX
> **日期**：YYYY-MM-DD

## 1. 概述

### 1.1 背景
### 1.2 目标
### 1.3 范围
- **范围内**：[功能清单]
- **范围外**：[排除清单]

---

## 2. 功能需求

| ID | 描述 | 优先级 | 验收标准 | 数据注释 | 交互注释 | UI 文案注释 |
|----|------|--------|----------|----------|----------|-------------|
| F001 | [描述] | P0 | [条件] | [字段/格式/边界] | [L 等级 + 行为] | [文案/标签] |

**数据注释** — 必须包含：API 来源 + 格式规则 + 边界值。示例：
```
❌ Bad: email: validate email format
✅ Good: email: string, required, email format (with @ and domain, max 50 chars), empty → "Please enter email"
❌ Bad: POST /api/auth/login
✅ Good: POST /api/auth/login, body: {email: string, password: string}, returns: {token: string}
```

**交互注释** — 必须包含：交互等级 + 一行行为。示例：
```
✅ L2: input → blur individual validation → submit full validation → API → success redirect / failure Toast
✅ L1: click Tab to switch forms, reset validation state
```

**UI 文案注释** — 必须包含全部可见文案。示例：
```
✅ placeholder: "Enter email"; submit: "Log in"; format error → "Invalid email format"
```

---

## 3. 非功能需求

| 类型 | 需求 | 验证方法 |
|------|------|----------|

## 4. 技术依赖

| 依赖 | 来源 | 状态 |
|------|------|------|
```

#### 填充示例（登录页邮箱字段）

```
| F001 | Email-password login | P0 | Enter email+password → login success → redirect to home | email: string, required, email format (with @, max 50); password: string, required, min 6, max 32; POST /api/auth/login body: {email, password} returns {token} | L2: input→blur validation, click login→full validation→API→success store token redirect / failure Toast | placeholder: "Enter email", "Enter password"; format error: "Invalid email format","Password needs at least 6 characters"; submit: "Log in", loading: "Logging in..." |
```

### 模板：design.md

```markdown
# Design Doc — {R0XX-需求名称}

## 1. 设计概述

## 2. 系统架构

## 3. 接口设计

| Endpoint | 方法 | 参数 | 返回 | 错误场景 |
|----------|------|------|------|----------|

## 4. 数据模型

## 5. 组件设计

### 5.1 {组件名称}

| 组件 | 职责 | Props | 状态 |
|------|------|-------|------|
| {名称} | {职责} | {props} | {states} |

#### 注释块 @{组件名} {L 等级}

<!--
  内联注释渲染说明：
  - 此 Annotation Block 渲染为折叠卡片，位于组件内容下方
  - 默认折叠，显示完整 L2 字段
  - 渲染顺序由 type 决定（T1-T11），见 html-annotation-system.md §2.2
  - 视觉锚定：虚线分隔 + 左侧色块 + 背景色区分
  - 每个组件独占一个折叠状态，组件间独立

  v2 字段级注释：
  - 组件内每个字段（统计指标/表格列/表单输入）可附加独立注释
  - 字段级注释用 ℹ️ 触发，弹窗展示
  - 字段级 key 使用 dot notation: componentKey.fieldKey
  - 字段级注释写入 ANNOTATIONS[componentKey].fields 或 .columns 子对象
-->

\```
[Dev]   trigger:   ...
[Dev·Tester] behavior: ...
[UI]   style:     ...
[Tester] state:    ...
[Dev]   dismiss:   ...
\```

#### 示例：注释块 @EmailPasswordForm L2

\```
【开发】触发
· 邮箱输入框失焦 → 校验该字段
· 点击「登录」→ 校验全部字段并提交
【开发·测试】行为
· 邮箱格式错误 → 输入框红框 +「请输入有效邮箱」
· 密码长度不足 → 输入框红框 +「密码至少 6 位」
· 校验通过 → 提交登录请求
· 登录成功 → 进入首页；登录失败 → 顶部提示错误原因，表单保留已填内容
【UI】视觉要点
· 输入框：圆角 4px、高 40px；聚焦时边框高亮
· 登录按钮：主色；提交中置灰并显示「登录中…」
【测试】用户可见状态
· 空表单 ｜ 校验错误 ｜ 提交中 ｜ 成功（跳转）｜ 失败（错误提示，可重试）

字段摘要
| 字段 | 必填 | 规则 | 空值 / 错误文案 | 来源 |
|---|---|---|---|---|
| email | 是 | string，邮箱格式，≤50 字符 | 「请输入邮箱」/「请输入有效邮箱」 | 登录接口 |
| password | 是 | string，6–32 位 | 「请输入密码」/「密码至少 6 位」 | 登录接口 |
\```

> 实施视图（按需展开）追加：state 全分支（normal/fieldError/submitting/success/apiError）、timing（200ms/100ms）、API 契约（POST /api/auth/login、request/response）、Permission、i18n、accessibility。

## 6. 错误处理

| 错误类型 | 场景 | 处理 |
|----------|------|------|

## 7. 附录：字段规格表

| 模块 | 字段 | UI 标签 | 格式约束 | 空值策略 | 数据来源 |
|------|------|---------|----------|----------|----------|

## 8. 组件注册表（Component Manifest）

> 组件注册表，用于 Step 9.5F 交互式注释编辑的组件定位。Full 路径生成时自动填充。

| ID | 名称 | 类型 | 位置 | L 等级 | 字段注释 |
|----|------|------|------|--------|----------|
| C01 | @StatsRow | T1-DisplayMetric | §5.1 | L1 | internal, total, active |
| C02 | @DataTable | T2-DataList | §5.2 | L2 | name, type, status, createdAt |
| C03 | @CreateUserForm | T6-FormFill | §5.2 | L2 | name, email, type |

## 7.5 注释展示模式决策

> 组件枚举完成后，确认注释展示模式偏好。
> 在 Step 8F 输出生成时向用户询问。

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| 内联模式 | 注释在组件下方折叠展示 | 默认推荐，评审者逐组件查看 |
| 侧边面板 | 注释仅在右侧面板展示 | 组件数多（≥10），需要快速切换 |
| 双模式 | 两者同时启用 | 需要同时查看当前组件和全局对比 |

**视图级别（v3.2）：** 默认**评审视图**（中文、隐藏实施细节）；方案评审直接使用。实施交接时询问是否展开为**实施视图**（显示 state 全枚举、timing、API、Permission、i18n、accessibility）。
```

### 模板：tasks.md

```markdown
# Task List — {R0XX-需求名称}

## 1. 任务清单

| 任务 ID | 描述 | 预估工时 | 优先级 |
|---------|------|----------|--------|
| T001 | [描述] | [小时] | P0 |

## 2. 任务步骤

### T001: {任务描述}

> **注释引用：**
> - 注释块 → design.md §{章节} @{组件名}
> - 字段文案 → design.md 附录「字段规格表」
> - 数据来源 → design.md §{章节}

1. {步骤 1}
2. {步骤 2}
...

## 3. 依赖
```

---

## 评审模式输出模板（v4.0）

> 评审模式是与 inline/侧栏并列的第三种呈现模式（布局契约与徽标系统见 `html-annotation-system.md §2.8`），用于产品方案评审会交付（内审/业务/研发评审），经 Step 8F 模式路由确认后启用。

### 生成说明（数据同源，强制）

1. **先产出结构化注释数据**（review-docs JSON，结构见下）——它是单一数据源。
2. **再分别渲染**：同一份数据 → HTML 右栏条目 + 三文档（proposal/design/tasks）的注释内容。禁止两处独立手写，避免评审视图与研发文档不一致。
3. **交互脚本同源**：下方权威 JS 代码块是唯一实现，生成的 HTML **原样嵌入，禁止每次交付重新手写**——数据同源原则同样适用于代码。

### 呈现密度规则（PM 注释路径）

条目默认展示 `summary`（摘要行）+ `annotation` 对象的 5 个 PM 字段（feature/logic/states/boundary/copy）。`copy` 字段无内容时不渲染。不渲染 L2/L3 研发注释——这些属于 implementation 层，在 PM 评审路径中不生成。

### scope-mark 徽标

| scopeMark | 徽标 | 样式 |
|---|---|---|
| existing | 灰色"已有" | `#e2e8f0` 底 / `#475569` 字 |
| new | 绿色"新增" | `#dcfce7` 底 / `#15803d` 字 |
| adjusted | 橙色"调整" | `#ffedd5` 底 / `#c2410c` 字 |

### HTML 骨架（权威）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{需求名} · 评审注释</title>
<style>
/* ===== 评审模式布局（权威，生成时原样嵌入） ===== */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#f0f6fc;color:#1e293b}
.layout{display:flex;height:100vh;overflow:hidden}
.product-panel{width:82%;position:relative;overflow:auto}
.doc-panel{width:18%;max-width:30%;background:#eff6ff;border-left:3px solid #3b82f6;overflow-y:auto;position:relative;flex-shrink:0}
.resize-handle{position:absolute;left:-3px;top:0;width:6px;height:100%;cursor:col-resize;z-index:30}
.resize-handle:hover{background:rgba(147,197,253,.45)}
.scene-tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #93c5fd;flex-wrap:wrap}
.scene-tab{padding:4px 10px;border:1px solid #cbd5e1;border-radius:14px;font-size:12px;cursor:pointer;background:#fff}
.scene-tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
.scene-heading{font-size:14px;font-weight:700;margin-bottom:2px}
.crumb{font-size:11px;color:#64748b;margin-bottom:8px}
.proto-desc{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:12px;line-height:1.6}
.proto-desc.active-highlight,.proto-element.active-highlight{outline:2px solid #3b82f6;outline-offset:1px}
.scope-mark{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:6px;vertical-align:1px;white-space:nowrap}
.scope-mark.existing{background:#e2e8f0;color:#475569}
.scope-mark.new{background:#dcfce7;color:#15803d}
.scope-mark.adjusted{background:#ffedd5;color:#c2410c}
.desc-top{display:flex;align-items:baseline;gap:6px}
.desc-top .desc-title{flex:1}
.num{flex-shrink:0;min-width:18px;height:18px;border-radius:50%;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.desc-title{font-weight:600}
.decision-box{background:#dbeafe;border:1px solid #93c5fd;border-radius:6px;padding:8px 10px;font-size:12px;line-height:1.6;margin-top:10px}
.empty-state{padding:24px 12px;text-align:center;color:#94a3b8;font-size:12px}
/* ===== 徽标层 ===== */
.anno-badge{
  position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;
  background:#3b82f6;color:#fff;font-size:11px;font-weight:700;
  display:inline-flex;align-items:center;justify-content:center;
  z-index:10;cursor:pointer;box-shadow:0 1px 4px rgba(59,130,246,.4);
  transition:background .15s,transform .15s;user-select:none;
}
.anno-badge:hover,.anno-badge.active{background:#1d4ed8;transform:scale(1.15);}
/* ===== 注释内容 ===== */
.desc-summary{font-size:11px;color:#64748b;margin-top:4px;margin-bottom:6px;line-height:1.5;}
.desc-annotation{margin-top:6px;}
.ann-block{margin-bottom:8px;}
.ann-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6366f1;margin-bottom:3px;}
.ann-text{font-size:12px;color:#334155;line-height:1.65;}
/* ===== panel-header ===== */
.panel-header{padding:10px 12px 6px;background:#dbeafe;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #bfdbfe;}
.panel-header-title{font-size:13px;font-weight:700;color:#1e40af;letter-spacing:.3px;}
.panel-header-count{font-size:11px;color:#64748b;}
@media (max-width:760px){
  .layout{flex-direction:column;height:auto;overflow:visible}
  .doc-panel{width:100%!important;max-width:100%;border-left:none;border-top:3px solid #3b82f6}
  .resize-handle{display:none}
}
</style>
</head>
<body>
<div class="layout">
  <div class="product-panel" id="canvas">
    <!-- 被注释组件：每个带 data-proto-id -->
    <div class="proto-element" data-proto-id="{sceneId}-{n}">…组件…</div>
  </div>
  <div class="doc-panel">
    <div class="panel-header">
      <div class="panel-header-title">PRD 注释</div>
      <div id="panelSceneCount" class="panel-header-count"></div>
    </div>
    <div class="resize-handle" id="resizeHandle"></div>
    <div class="scene-tabs" id="sceneTabs"></div>
    <div id="docBody"></div>
  </div>
</div>
<script id="review-docs" type="application/json">
{严格 JSON：结构见下}
</script>
<!-- 权威交互脚本：见下节，原样嵌入，禁止手改 -->
</body>
</html>
```

### review-docs JSON 数据结构（严格 JSON，双引号）

以 `<script id="review-docs" type="application/json">` 承载，供校验器提取（`scripts/validate-annotations.js` 对含此 script 的 HTML 自动执行评审模式校验）：

```json
{
  "scene1": {
    "heading": "场景标题",
    "crumb": "面包屑路径",
    "items": [
      {
        "protoId": "component-id",
        "title": "组件标题",
        "scopeMark": "new|existing|adjusted",
        "summary": "1-2句核心摘要（在场景列表中快速扫读用）",
        "annotation": {
          "feature": "功能定位：这个组件是做什么的",
          "logic": "交互逻辑：用户操作 → 界面响应（步骤式描述）",
          "states": "状态说明：用户可见状态 + 视觉设计状态（hover/disabled/loading/error等）",
          "boundary": "边界条件：什么情况下不可用、隐藏、异常分支",
          "copy": "UI文案：关键按钮、Toast、空态文案（无则省略此字段）"
        }
      }
    ],
    "decision": "口径建议文字（可选，无则省略）"
  }
}
```

### 权威交互脚本（唯一实现，生成 HTML 原样嵌入）

```html
<script>
/* ===== 评审模式权威交互脚本 v4.0（无SVG·徽标锚定·滚动联动；唯一实现；生成 HTML 原样嵌入，禁止手改） ===== */
(function(){
  var docs = JSON.parse(document.getElementById('review-docs').textContent);
  var docPanel = document.querySelector('.doc-panel');
  var docBody = document.getElementById('docBody');
  var tabs = document.getElementById('sceneTabs');
  var canvas = document.getElementById('canvas');
  var W_KEY = 'reviewPanelWidth', MIN_W = 18, MAX_W = 30;
  var currentScene = null;
  var MARK = {existing:'已有', new:'新增', adjusted:'调整'};
  var LABEL = {feature:'功能定位', logic:'交互逻辑', states:'状态说明', boundary:'边界条件', copy:'UI 文案'};

  function applyWidth(){
    if (window.innerWidth <= 760) return;
    var w = parseFloat(localStorage.getItem(W_KEY));
    if (isNaN(w)) w = MIN_W;
    docPanel.style.width = Math.min(MAX_W, Math.max(MIN_W, w)) + '%';
  }

  function renderAnnotation(ann){
    if (!ann || typeof ann !== 'object') return '';
    return Object.keys(LABEL).filter(function(k){ return ann[k]; }).map(function(k){
      return '<div class="ann-block"><div class="ann-label">' + LABEL[k] + '</div>'
        + '<div class="ann-text">' + String(ann[k]).replace(/\n/g,'<br>') + '</div></div>';
    }).join('');
  }

  function renderDocs(sceneId){
    currentScene = sceneId;
    var d = docs[sceneId];
    var html = '<div class="scene-heading">' + d.heading + '</div>'
      + '<div class="crumb">' + (d.crumb||'') + '</div>';
    if (!d.items || !d.items.length){
      html += '<div class="empty-state">本场景暂无注释条目</div>';
    } else {
      d.items.forEach(function(it,i){
        html += '<div class="proto-desc" data-proto-id="' + it.protoId + '">'
          + '<div class="desc-top"><span class="num">' + (i+1) + '</span>'
          + '<div class="desc-title">' + it.title
          + '<span class="scope-mark ' + it.scopeMark + '">' + (MARK[it.scopeMark]||'') + '</span>'
          + '</div></div>'
          + (it.summary ? '<div class="desc-summary">' + it.summary + '</div>' : '')
          + '<div class="desc-annotation">' + renderAnnotation(it.annotation) + '</div>'
          + '</div>';
      });
      if (d.decision) html += '<div class="decision-box"><b>口径建议</b><br>' + d.decision + '</div>';
    }
    docBody.innerHTML = html;
    injectBadges(sceneId);
    bindHover();
  }

  function injectBadges(sceneId){
    document.querySelectorAll('.anno-badge').forEach(function(b){ b.remove(); });
    var d = docs[sceneId];
    if (!d||!d.items) return;
    d.items.forEach(function(it,i){
      var el = document.querySelector('.product-panel .proto-element[data-proto-id="' + it.protoId + '"]');
      if (!el) return;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var badge = document.createElement('span');
      badge.className = 'anno-badge';
      badge.textContent = String(i+1);
      badge.dataset.protoId = it.protoId;
      badge.title = it.title;
      badge.addEventListener('click', function(e){
        e.stopPropagation();
        var desc = docBody.querySelector('.proto-desc[data-proto-id="' + it.protoId + '"]');
        if (desc) desc.scrollIntoView({behavior:'smooth', block:'nearest'});
      });
      el.appendChild(badge);
    });
  }

  function highlight(protoId, on){
    document.querySelectorAll('.proto-element[data-proto-id="' + protoId + '"]')
      .forEach(function(el){ el.classList.toggle('active-highlight', on); });
    document.querySelectorAll('.proto-desc[data-proto-id="' + protoId + '"]')
      .forEach(function(el){ el.classList.toggle('active-highlight', on); });
    document.querySelectorAll('.anno-badge[data-proto-id="' + protoId + '"]')
      .forEach(function(b){ b.classList.toggle('active', on); });
  }

  function bindHover(){
    document.querySelectorAll('.product-panel .proto-element[data-proto-id]').forEach(function(el){
      el.onmouseenter = function(){
        var pid = el.dataset.protoId;
        highlight(pid, true);
        var desc = docBody.querySelector('.proto-desc[data-proto-id="' + pid + '"]');
        if (desc) desc.scrollIntoView({behavior:'smooth', block:'nearest'});
      };
      el.onmouseleave = function(){ highlight(el.dataset.protoId, false); };
    });
    docBody.querySelectorAll('.proto-desc[data-proto-id]').forEach(function(el){
      el.onmouseenter = function(){ highlight(el.dataset.protoId, true); };
      el.onmouseleave = function(){ highlight(el.dataset.protoId, false); };
      el.onclick = function(){
        var pid = el.dataset.protoId;
        var proto = document.querySelector('.product-panel .proto-element[data-proto-id="' + pid + '"]');
        if (proto){
          var top = canvas.scrollTop + proto.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 40;
          canvas.scrollTo({top: Math.max(0,top), behavior:'smooth'});
        }
      };
    });
  }

  window.setScene = function(sceneId){
    tabs.querySelectorAll('.scene-tab').forEach(function(b){
      b.classList.toggle('active', b.dataset.scene === sceneId);
    });
    renderDocs(sceneId);
    var d = docs[sceneId];
    if (d && d.items && d.items[0]){
      var el = document.querySelector('.product-panel .proto-element[data-proto-id="' + d.items[0].protoId + '"]');
      if (el){
        var top = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 40;
        canvas.scrollTo({top: Math.max(0,top), behavior:'smooth'});
      }
    }
  };

  var sceneKeys = Object.keys(docs);
  document.getElementById('panelSceneCount').textContent = '共 ' + sceneKeys.length + ' 个场景';
  sceneKeys.forEach(function(sid,idx){
    var b = document.createElement('button');
    b.className = 'scene-tab'; b.dataset.scene = sid;
    b.textContent = (idx+1) + '. ' + docs[sid].heading;
    b.onclick = function(){ window.setScene(sid); };
    tabs.appendChild(b);
  });

  document.getElementById('resizeHandle').addEventListener('pointerdown', function(e){
    e.preventDefault();
    function move(ev){
      var w = Math.min(MAX_W, Math.max(MIN_W, (window.innerWidth-ev.clientX)/window.innerWidth*100));
      docPanel.style.width = w + '%';
    }
    function up(){
      localStorage.setItem(W_KEY, parseFloat(docPanel.style.width));
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });

  window.addEventListener('resize', applyWidth);
  applyWidth();
  window.setScene(sceneKeys[0]);
})();
</script>
```

## 全链路工作流

```
Product requirements (natural language)
   │
   ├── 1. spec-analyze analysis
   │       ├── Route assessment → path selection
   │       ├── Context exploration (files/docs/code)
   │       ├── Multi-role questioning (converge requirements)
   │       ├── Stress testing (identify boundaries & risks)
   │       └── Solution convergence + design presentation → S3
   │
   ├── 1b. Component enumeration & type mapping (see annotation-templates.md)
   │       ├── List all interactive components on the page
   │       ├── Map each to type (T1-T11)
   │       └── Declare nesting relationships → S3a
   │
   ├── 2. Output generation (Full path)
   │       ├── Fill type templates per component (see annotation-templates.md §4)
   │       ├── proposal.md (functional requirements + 3-column annotations)
   │       ├── design.md (component design + annotation blocks + field table)
   │       └── tasks.md (task steps with annotation references)
   │
   ├── 2b. HTML Annotation Build-in (conditional — user agrees in Step 8F)
   │       ├── Step 8F: 呈现模式路由（三分支：inline / 侧栏 / 评审模式；评审场景默认评审模式，见 §评审模式输出模板）
   │       ├── If yes: generate HTML FROM SCRATCH with annotation system built in (not retrofitted)
   │       ├──   ├── review-docs JSON（PM schema：summary/annotation{feature/logic/states/boundary/copy}）
   │       │   ├── CSS: 权威评审模式样式（含 .anno-badge、.panel-header）
   │       │   └── JS: v4.0 权威脚本（徽标锚定、滚动联动、双向高亮）
   │       ├── 如果选择内联或双模式: 生成带内联注释容器的 HTML
   │       ├── 如果选择纯侧边面板: 使用现有方案（不变）
   │       ├── Then Step 9F: verify annotations are correctly embedded (not re-generate)
   │       └── Run back-propagation: sync HTML annotation fixes back to design.md
   │
   │
   ├── 3. Quality self-check → S4
   │       ├── Content quality: product language, no code syntax, no placeholders
   │       ├── State coverage: per type minimums (see annotation-templates.md §4)
   │       ├── Permission & validation: declared for all relevant components
   │       ├── Cross-component consistency: same type, same depth
   │       ├── Badge injection: every annotated proto-element has .anno-badge
   │       └── Error scenarios: coverage against annotation-templates.md error table
   │
   ├── 4. Requirements review
   │       ├── PM → F00X descriptions + acceptance criteria
   │       ├── Dev → data annotation (format constraints) + annotation blocks + field table
   │       ├── Tester → annotation state + error handling + boundary values
   │       └── UI → style colors/spacing + responsive + copy
   │
   ├── 5. Agent development
   │       ├── Read tasks → follow annotation references
   │       ├── Jump to design.md annotation blocks
   │       └── Implement behavior from annotations
   │
   └── 6. Code output
           ├── Field copy → placeholder / label / error text
           ├── Format constraints → regex / length / required
           ├── Interaction behavior → matches design annotations
           └── Boundary handling → matches annotation state
```
