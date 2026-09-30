# HTML Annotation System — Embedding PRD Annotations into Prototypes

> 将 design.md 的 Annotation Block 转换为 HTML 页面上的交互式注释面板，让评审者无需翻阅文档即可看到每个组件的 PRD 规格。

---

## 1. When to Use

HTML 注释面板适用于以下场景：

| 条件 | 说明 |
|------|------|
| 已有 HTML 原型 | 交互原型已构建，需要在同一页面上叠加注释 |
| 组件数 ≥ 3 | 组件数量少时直接贴 design.md 更高效 |
| 评审需要多方参与 | PM/Dev/UI/Tester 需在同一页面上交叉验证 |

**如不满足上述条件，跳过 HTML 注释生成，保持纯 markdown 输出即可。**

---

## 2. Architecture

### 2.0 双模式架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│  页面区域                                                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Section: Stats Cards                    Header [📋]     │    │
│  │  ┌──────┐┌──────┐┌──────┐                (侧边面板切换)   │    │
│  │  │ Card ││ Card ││ Card │                                  │    │
│  │  └──────┘└──────┘└──────┘                                  │    │
│  ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤    │  ← 虚线分隔
│  │  ▼ C01 @StatsRow  L1                    [📋]              │    │  ← 内联注释
│  │  ┌────────────────────────────────────────────────────┐  │    │    (默认折叠)
│  │  │ 🔹 Trigger: page load → fetchStats()               │  │    │
│  │  │ 🔹 Behavior: 计算并展示 3 张统计卡片                │  │    │
│  │  │ 🔹 UI State: normal / loading / empty / error       │  │    │
│  │  └────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Section: Data Table                           [📋]      │    │
│  │  ┌─────┬─────┬─────┬───────┬────────┐                    │    │
│  │  │Name │Email│Role │Status │Joined  │                    │    │
│  │  ├─────┼─────┼─────┼───────┼────────┤                    │    │
│  │  │ ... │ ... │ ... │ ...   │ ...    │                    │    │
│  │  └─────┴─────┴─────┴───────┴────────┘                    │    │
│  ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤    │
│  │  ▶ C02 @DataTable  L2 (点击展开)          [📋]           │    │  ← 内联注释
│  └──────────────────────────────────────────────────────────┘    │  ← (折叠态)
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Section: Create User Form                      [📋]     │    │
│  │  ┌──────────────────────────────┐                        │    │
│  │  │ Full Name * [____________]   │                        │    │
│  │  │ Email *     [____________]   │                        │    │
│  │  │ Role *      [Select...▼]    │                        │    │
│  │  │ [Create] [Cancel]           │                        │    │
│  │  └──────────────────────────────┘                        │    │
│  ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤    │
│  │  ▼ C03 @CreateUserForm  L2                 [📋]           │    │  ← 内联注释
│  │  ┌────────────────────────────────────────────────────┐  │    │
│  │  │ 🔹 Fields: Full Name, Email, Role                  │  │    │
│  │  │ 🔹 Behavior: blur 校验 → submit 全体验证 → API     │  │    │
│  │  │ 🔹 State: normal / fieldError / submitting / ...   │  │    │
│  │  └────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  📋 PRD 注释全览 (Header 右侧，切换侧边面板)              │    │  ← 侧边面板
│  └──────────────────────────────────────────────────────────┘    │     (默认隐藏)
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 双模式架构

| 模式 | 默认状态 | 触发方式 | 展示范围 | 数据源 |
|------|---------|---------|---------|-------|
| **内联模式** | 折叠 | 点击组件 📋 按钮 | 当前组件 | ANNOTATIONS |
| **侧边面板** | 隐藏 | 点击 Header 📋 按钮 | 全部组件 | ANNOTATIONS |

**独立性原则：** 两种模式状态独立。内联折叠不影响侧边面板，侧边面板切换不影响内联。两者通过同一数据源 ANNOTATIONS 保持同步。

### 2.2 内联注释渲染规则

每个组件的内联注释渲染顺序由组件类型决定：

| 类型 | 内联展示字段（按顺序） |
|------|---------------------|
| T1 DisplayMetric | data, trigger, state |
| T2 DataList | columns, pagination, api, state |
| T3 ActionButton | behavior, state |
| T4 ActionMenu | items, dismiss, state |
| T5 ConfirmAction | content, behavior, state |
| T6 FormFill | fields, behavior, api, state |
| T7 ItemSelect | search, selection, confirm, state |
| T8 SearchSelect | match, display, callback, state |
| T9 Toast | behavior, timing, types |
| T10 StatusPlaceholder | content, behavior |
| T11 PageInfo | content, placement |

### 2.3 视觉锚定规范

- 注释区域使用 `1px dashed #e5e7eb` 分隔线与组件区域区分
- 注释卡片左侧使用 `4px solid #2563eb` 色块锚定
- 注释卡片背景 `#fafbfc`，与组件白色背景区分
- 折叠态只显示 header 行：`▶ C01 @StatsRow  L1`
- 展开态显示完整注释内容，每个字段前加 `🔹` 前缀
- 折叠/展开使用 `▶` / `▼` 图标
- 内联注释容器紧跟在组件内容下方（间隔 ≤ 4px）

### 2.4 内联注释交互流

| 用户操作 | 内联效果 | 侧边面板效果 |
|---------|---------|-------------|
| 点击组件内 📋 | 展开/折叠该组件的内联注释 | 不变 |
| 点击 Header 📋 | 不变 | 切换侧边面板显隐 |
| 侧边面板中点击导航标签 | 不变 | 切换显示组件 |
| 侧边面板打开时，点击组件的 📋 | 展开该组件内联注释 | 侧边面板切换到该组件 |
| 内联注释展开时，展开另一个组件 | 前一个自动折叠 | 不变 |
| ESC | 折叠所有内联 | 关闭侧边面板 |
| 点击遮罩层 | 不变 | 关闭侧边面板 |

### 2.5 组成部分

| 组件 | 职责 | 说明 |
|------|------|------|
| **注释数据** | 存储从 design.md 提取的注释内容 | JS 对象，每个 key 对应一个组件 |
| **触发按钮** | 提供注释面板的入口 | inline 按钮(组件区右上角) + header 按钮(全局) |
| **注释弹窗** | 展示完整的 PRD 注释内容 | 居中弹窗，带导航标签切换 |
| **遮罩层** | 点击外部关闭面板 | 半透明背景，z-index 9999 |

### 2.6 双模式交互流程

```
用户点击组件 📋 按钮
  → toggleInline(key)
    → 展开内联注释（如果另一个已展开，先折叠它）
    → 如果侧边面板打开，同步切换到该组件
    → 高亮该组件的触发按钮

用户点击 Header 📋 按钮
  → togglePanel()
    → 如果侧边面板关闭：打开面板，显示当前内联组件的注释
    → 如果侧边面板打开：关闭面板
    → 切换遮罩层

用户点击侧边面板导航标签
  → switchPanelTo(key)
    → 切换面板中显示的组件
    → 不改变内联状态

用户点击 ESC
  → 折叠所有内联注释
  → 关闭侧边面板
  → 移除遮罩层
```

---

### 2.7 评审视图 / 实施视图（v3.2）

注释面板支持两个视图级别，底层 `ANNOTATIONS` 数据始终完整：

| 视图 | 默认 | 面板展示 | 隐藏 |
|---|---|---|---|
| 评审视图 | ✅ | 触发、行为、关闭、用户可见状态、视觉要点、UI 文案、字段摘要表 | state 全枚举、timing、API、Permission、i18n、accessibility |
| 实施视图 | 按需切换 | 全部字段 + 共享块 + ℹ️ 字段弹窗 | 无 |

- 渲染角色标签使用中文：`【开发】`、`【开发·测试】`、`【UI】`、`【测试】`（数据键保持英文语义不变）。
- 面板提供「评审 / 实施」切换入口；默认评审视图，避免技术细节淹没评审重点。
- 字段级注释：评审视图以表格呈现；实施视图保留 ℹ️ 弹窗。

### 2.8 评审模式（Review Mode，v4.0）——第三种呈现模式

> 消歧：§2.7 的"评审视图"是注释面板内的显示切换；本节"评审模式"是与 inline/侧栏并列的
> 第三种**呈现模式**——整页交付物结构（持久右栏 + 徽标锚定 + 滚动联动），用于产品方案评审会
> （内审/业务/研发评审），经 Step 8F 模式路由确认后启用。

#### 2.8.1 布局契约

```
页面结构:
  .layout { display:flex }
    .product-panel { width:82%; overflow:auto }
      .proto-element[data-proto-id] ...（被注释组件，由 JS 动态注入 .anno-badge）
    .doc-panel { width:18%; max-width:30%; background:#eff6ff; border-left:3px solid #3b82f6 }
      .panel-header（固定标题栏 "PRD 注释"，视觉区分文档层）
      .resize-handle（左缘 6px 拖拽手柄; 拖宽范围 18%→30%; localStorage 记忆）
      .scene-tabs（多场景交付时的场景切换标签行）
      #docBody（注释条目列表）
```

- 右栏**持久分栏非模态**（评审会需要全程可见，不可误关）。
- 拖宽：宽度自 18% 起可调，上限 30%（达到后不可再拖）；宽度经 localStorage（key=`reviewPanelWidth`）记忆，刷新保留。
- 降级：视口 ≤760px 时右栏转堆叠区块（纵向排列）、拖拽手柄禁用。

#### 2.8.2 docs 两级数据结构

```js
docs = {
  "<sceneId>": {
    heading: "场景/需求组标题",
    crumb: "面包屑（如 营销系统 / 优惠券）",
    items: [
      {
        protoId: "组件锚点id",
        title: "条目标题",
        scopeMark: "existing|new|adjusted",
        summary: "1-2句核心摘要",
        annotation: {
          feature: "功能定位",
          logic: "交互逻辑（步骤式）",
          states: "用户可见状态 + 视觉设计状态",
          boundary: "产品边界条件",
          copy: "关键UI文案（可选）"
        }
      }
    ],
    decision: "口径建议文本（可选；缺省不渲染 decision-box）"
  }
}
```

- 交付物内以 `<script id="review-docs" type="application/json">` 承载（严格 JSON），结构见 `annotation-output-templates.md §评审模式`。
- 条目默认展示 `summary` + 5个 PM 字段（feature/logic/states/boundary/copy）；不渲染 L2/L3 研发注释。

#### 2.8.3 两层职责

评审模式保持两层分离：

| 层 | 职责 | 禁止承担 |
|---|---|---|
| Product layer | 原型 DOM、用户可见产品结构与交互 | 注释渲染 |
| Annotation layer | `review-docs` 数据与右栏 `.proto-desc` 注释 + `.anno-badge` 徽标层 | 改写原型 DOM |

权威实现仅维护在 `references/annotation-output-templates.md`，Demo 必须同步嵌入，不在本文件复制实现。

#### 2.8.4 徽标锚定系统

- JS 在 `renderDocs()` 后调用 `injectBadges()`，为每个有注释的 `proto-element` 注入 `.anno-badge`
- 徽标绝对定位于 `proto-element` 右上角（`top:-8px; right:-8px`）
- 徽标数字 = 条目在当前场景 `items[]` 中的索引+1（场景内序号）
- `proto-element` 需要 `position:relative`（JS 自动修正 static 情况）
- 切换场景时先移除全部旧徽标再重新注入

#### 2.8.5 悬停双向高亮（v4.0）

- 左侧 `proto-element` hover → 右侧对应 `proto-desc` 高亮 + `scrollIntoView(nearest)`
- 右侧 `proto-desc` hover → 左侧对应 `proto-element` 高亮（不强制滚动原型）
- 右侧 `proto-desc` click → 左侧原型 `canvas.scrollTo` 到该组件
- 左侧徽标 click → 右侧 `docBody scrollIntoView` 到对应条目
- `highlight()` 同时切换 `.anno-badge` 的 `.active` 类（徽标变色反馈）
- 拖宽：pointer 事件（pointerdown/pointermove/pointerup），宽度区间 [18%, 30%]，松手时写 localStorage。
- 降级：CSS media query（`max-width:760px`）`.doc-panel` 转堆叠区块、`.resize-handle` 隐藏。

#### 2.8.6 空态与边界

- 无注释条目：右栏显示"本场景暂无注释条目"空态提示（不报错）。
- 同一组件被多个条目锚定：多个徽标共用同一 `proto-element`（最后注入的徽标可见）。
- scope-mark 徽标：existing=灰"已有"、new=绿"新增"、adjusted=橙"调整"，悬停显示完整徽标（不截断）。

## 3. Data Format — 从 design.md Annotation Block 到 JS 对象

### 3.1 转换规则

每个 design.md 的 Annotation Block 转换为一个 JS 条目：

```
design.md Annotation Block                    JS ANNOTATIONS entry
─────────────────────────────                  ────────────────────
§2.1 @StatsCardRow L2         ────→           stats: {
  |   trigger: 页面加载...                        id: 'C01',
  |   behavior: 内部=count(...)                  name: '@StatsCardRow',
  |   style: 白色背景...                          level: 'L2',
  |   state: normal/zero                         desc: '展示 3 张统计卡片...',
  |   timing: ≤100ms                             states: 'normal / zero',
  |   dismiss: 数据变更...                        blocks: [
  └── title字段 → lines数组列表                      { title: 'Trigger', lines: [...] },
                                                    { title: 'Behavior', lines: [...] },
                                                    ...
                                                  ]
                                               }
```

### 3.2 完整 JS 数据结构

```javascript
const ANNOTATIONS = {
  stats: {
    id: 'C01',
    name: '@StatsRow',
    type: 'T1',
    level: 'L1',
    desc: '展示 3 张统计卡片，概览流量主数据',
    states: 'normal / loading / empty / error',
    blocks: [
      { title: 'Trigger', lines: ['页面加载 → updateStats()'] },
      { title: 'Behavior', lines: [
        '内部流量主 = count(type=internal)',
        '总流量主 = count(all)',
        '活跃流量主 = count(type=internal AND status=active)'
      ]},
      { title: 'Dismiss', lines: ['数据变更 → updateStats()'] }
    ],
    fields: {
      'internal': {
        label: '内部流量主',
        desc: 'type=internal 且状态非 deleted 的流量主',
        blocks: [
          { title: 'Definition', lines: ['type=internal 且 status 非 deleted 的流量主'] },
          { title: 'Permission', lines: ['管理员、运营可见'] }
        ]
      },
      'total': {
        label: '总流量主',
        desc: '全部流量主（含内部和外部）',
        blocks: [
          { title: 'Definition', lines: ['全部流量主（含内部+外部）'] },
          { title: 'Permission', lines: ['管理员、运营、财务可见'] }
        ]
      },
      'active': {
        label: '活跃流量主',
        desc: 'type=internal、status=active 且近 7 天有 API 请求的流量主',
        blocks: [
          { title: 'Definition', lines: ['type=internal 且 status=active 且近 7 天有请求的流量主'] },
          { title: 'Permission', lines: ['仅管理员可见'] }
        ]
      }
    }
  },
  table: {
    id: 'C02',
    name: '@DataTable',
    type: 'T2',
    level: 'L2',
    desc: '展示流量主列表，支持分页和选择',
    states: 'normal / loading / empty / error',
    blocks: [
      { title: 'Trigger', lines: ['页面加载 → fetchPublishers()'] },
      { title: 'Behavior', lines: [
        '点击行 → 查看详情',
        '勾选 checkbox → 启用批量操作'
      ]},
      { title: 'UI State', lines: [
        'normal: 正常显示列表',
        'loading: 骨架屏',
        'empty: "暂无数据" + 创建按钮',
        'error: "加载失败，请重试"'
      ]}
    ],
    columns: {
      'name': {
        label: '流量主名称',
        blocks: [
          { title: 'Format', lines: ['string, max 50, 唯一'] },
          { title: 'Source', lines: ['publisher.name'] }
        ]
      },
      'type': {
        label: '类型',
        blocks: [
          { title: 'Format', lines: ['enum: internal / external'] },
          { title: 'Source', lines: ['publisher.type'] }
        ]
      },
      'status': {
        label: '状态',
        blocks: [
          { title: 'Format', lines: ['enum: active / inactive / deleted'] },
          { title: 'Color', lines: ['活跃: green(#10b981), inactive: gray(#6b7280)'] }
        ]
      },
      'createdAt': {
        label: '创建时间',
        blocks: [
          { title: 'Format', lines: ['datetime ISO 8601, 展示为 YYYY-MM-DD'] },
          { title: 'Source', lines: ['publisher.created_at'] }
        ]
      }
    }
  },
  form: {
    id: 'C03',
    name: '@CreateUserForm',
    type: 'T6',
    level: 'L2',
    desc: '创建新的流量主，填写基本信息',
    states: 'normal / fieldError / submitting / success / apiError',
    blocks: [ /* 保持不变 */ ],
    fields: {
      'name': {
        label: '流量主名称',
        blocks: [
          { title: 'Validation', lines: ['required, max 50, 唯一性校验'] }
        ]
      },
      'email': {
        label: '邮箱',
        blocks: [
          { title: 'Validation', lines: ['required, email format, max 100'] }
        ]
      },
      'type': {
        label: '类型',
        blocks: [
          { title: 'Options', lines: ['internal: 内部', 'external: 外部'] }
        ]
      }
    }
  }
};
```
```

### 3.3 字段提取对照表

| design.md Annotation Block 字段 | -> JS blocks.title | 说明 |
|--------------------------------|-------------------|------|
| `[Dev] trigger:` | `'Trigger'` | 展开为 lines 数组，每行一个触发条件 |
| `[Dev·Tester] behavior:` | `'Behavior'` | 行为描述，树形缩进保留 |
| `[UI] placement:` | `'Placement'` | 位置描述 |
| `[UI] style:` | `'UI Style'` | 可视化细节，颜色/间距/字体 |
| `[UI] state:` | `'UI State'` | 状态描述，每行一个状态 |
| `[UI] timing:` | `'Timing'` | 动画时间参数 |
| `[UI] responsive:` | `'Responsive'` | 响应式策略 |
| `[Tester] state:` | `'Tester State'` | 测试视角的状态验证路径 |
| `[Dev] dismiss:` | `'Dismiss'` | 关闭条件 |

### 3.4 树形缩进约定

Behavior 和 State 中常用树形结构表示条件分支：

```
'  ├── 条件A → 结果A'     ← 2空格 + ├── 前缀
'  └── 条件B → 结果B'     ← 2空格 + └── 前缀
```

渲染时自动转换为 `&nbsp;&nbsp;&nbsp;&nbsp;├── ` 以保持缩进。

### 3.5 数据同步机制

```
                  ┌──────────────────────┐
                  │  ANNOTATIONS 数据源     │
                  │  (唯一真实来源)          │
                  └──────┬───────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌───────────────┐       ┌───────────────┐
    │  renderInline() │       │ renderModal() │
    │  → 更新内联 DOM  │       │ → 更新弹窗 DOM  │
    └───────────────┘       └───────────────┘
            │                         │
            └──────────┬──────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  editAnnot(key,      │
            │   field, operation,  │
            │   content)           │
            │  → 修改 ANNOTATIONS   │
            │  → 调用两个渲染函数    │
            └──────────────────────┘
```

**编辑操作入口：** `editAnnot(componentKey, field, operation, content)`
- 修改 ANNOTATIONS 对象
- 更新内联 DOM（如果当前展开）
- 更新弹窗 DOM（如果当前显示该组件）
- 使用 `requestAnimationFrame` 防抖，避免重复渲染

**同步规则：**
- 任何修改都经过 `editAnnot()`，不直接操作 DOM
- 内联和弹窗的渲染函数是纯函数——输入 ANNOTATIONS 数据，输出 DOM
- 不存在"编辑中"状态——编辑是即时的（非异步），不存在时序冲突

### 3.6 跨引用格式（Cross-Reference Format）

当注释内容需要引用外部文档时，使用 `→` 前缀定义引用目标：

| 引用类型 | 语法 | 示例 | 渲染效果 |
|---------|------|------|---------|
| 设计文档章节 | `→ design.md §N.M` | `→ design.md §4.1` | 可点击链接，跳转至设计文档 |
| 决策记录 | `→ decision-log #D00X` | `→ decision-log #D003` | 可点击链接，跳转至决策记录 |
| 功能需求 | `→ F00X` | `→ F001` | 可点击链接，跳转至需求文档 |
| 流程图 | `→ REF-ID` | `→ R001-MENU-MERGE` | 可点击链接，跳转至流程图 |

**内容规则：**
- 引用必须放在行尾，格式：`{描述文字}（→ {引用}）`
- 示例：`合并入口是因为用户报备流程中需要先判断报备类型（→ design.md §4.1 R001-MENU-MERGE）`
- 不允许引用无对应的文档锚点

**渲染规则（popup 模式）：**
- `→` 符号渲染为 `↗` 外部链接图标
- 引用文本渲染为蓝色可点击链接
- 鼠标悬停显示 tooltip 引用来源
- 不支持跨文档跳转时，显示为半透明（disabled）状态

**渲染规则（inline 模式）：**
- 引用显示为 `[↗]` 标记，不展开完整链接
- 点击 `[↗]` 打开侧边面板的引用详情
- 优先显示引用目标而不是完整 URL

---

## 4. Component Mapping — 触发按钮布局

### 4.0 前置条件：组件枚举与类型映射

在放置 trigger 按钮之前，必须先完成组件枚举和类型映射（参见 `annotation-templates.md` §9 — 对应 SKILL.md Full 路径 Step 6F）：

- 列出页面所有交互组件
- 映射每个组件到类型（T1-T11），确定字段结构
- 声明嵌套关系（父子组件的 context 引用）
- 确保无遗漏、无幽灵项

触发按钮只应在枚举清单中的组件上放置。清单外的不放置，清单内的不遗漏。

### 4.0.1 空组件触发流程（无 ANNOTATIONS 数据时）

当组件已在枚举清单中但尚无 ANNOTATIONS 数据时，触发按钮表现为"空状态"——点击后引导用户创建注释，而非展示空面板。

#### 判断条件

| 条件 | 触发按钮表现 |
|------|------------|
| 组件在 ANNOTATIONS 中有对应条目 | 正常展示注释面板/弹窗 |
| 组件在枚举清单中但 ANNOTATIONS 无对应条目 | 空状态触发按钮，引导创建 |
| 组件不在枚举清单中 | 不放置触发按钮 |

#### 空状态触发按钮样式

```html
<!-- 空状态触发按钮 — 虚线和问号表示"待注释" -->
<button class="annot-trigger annot-trigger-empty" data-annot="C04_NewComponent"
        onclick="openAnnotationEditor('C04_NewComponent')"
        title="该组件尚未添加注释，点击添加">❓</button>
```

```css
/* 空状态触发按钮样式 */
.annot-trigger-empty {
  border: 1.5px dashed #f59e0b !important;  /* 橙色虚线边框 */
  background: #fffbeb !important;           /* 淡橙色背景 */
  opacity: 0.8;
}
.annot-trigger-empty:hover {
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}
```

#### 点击行为

点击空状态触发按钮时，打开"注释创建向导"：

1. **类型选择**：展示 T1-T11 类型候选列表（按关键词匹配排序），用户选择或跳过
2. **字段引导**：按类型模板逐字段引导用户输入（见 SKILL.md Step 11F-P2 → 11F-P5）
3. **实时预览**：每填充一个字段，右侧预览区同步更新注释面板
4. **保存**：用户确认后，写入 ANNOTATIONS 数据，触发按钮恢复为正常状态

#### 创建向导 HTML 结构

```html
<!-- 注释创建向导弹窗 -->
<div id="annotCreateWizard" class="annot-modal" style="display:none;">
  <div class="annot-modal-content" style="width: 640px; max-height: 85vh;">
    <div class="annot-modal-header">
      <span>添加注释 — <span id="wizardComponentName">组件名</span></span>
      <button onclick="closeWizard()" class="annot-close">&times;</button>
    </div>
    <div class="wizard-body">
      <div class="wizard-step" id="wizardStep1">
        <h4>Step 1: 选择组件类型</h4>
        <div id="typeCandidates"><!-- 由 JS 动态生成 --></div>
      </div>
      <div class="wizard-step" id="wizardStep2" style="display:none;">
        <h4>Step 2: 填写注释内容</h4>
        <div id="fieldEditor"><!-- 由 JS 动态生成 --></div>
      </div>
      <div class="wizard-step" id="wizardStep3" style="display:none;">
        <h4>Step 3: 预览</h4>
        <div id="previewPanel"><!-- 实时预览 --></div>
      </div>
    </div>
  </div>
</div>
```

#### 创建完成后

- 新注释数据追加到 `window.ANNOTATIONS`
- 触发按钮状态从 `annot-trigger-empty` 切换为 `annot-trigger`
- 触发按钮图标从 `❓` 切换为 `📋`
- 组件在 Component Manifest 中标记为"已注释"
- 触发 `validate-annotations.js` 验证新注释

### 4.1 触发按钮放置规则

每个组件必须有至少 1 个 trigger 按钮。按钮必须在组件的可视边界内，与组件边缘间距 ≤ 8px（视觉上"贴紧"）。

| 组件类型 | 触发按钮位置 | HTML 结构要求 |
|----------|-------------|---------------|
| 页面级组件 (统计卡片) | 组件容器右上角，距容器边缘 ≤ 8px | 容器添加 `class="annot-section"` 和 `position: relative` |
| 工具栏/操作栏 | 工具栏右上角，与操作按钮同行 | 按钮后添加 inline trigger（22px 圆形） |
| 数据表格 | 表格容器右上角，距容器边缘 ≤ 8px | 容器添加 `position: relative` |
| 弹窗/Modal header | header 标题右侧，与关闭按钮同行 | 26px 圆形按钮，flex 布局居中 |
| 表单区块 | 表单区域右上角 | inline trigger（22px 圆形） |
| 详情页区块 | 区块标题行右侧 | inline trigger，与编辑按钮同行 |
| 页面 header | h1 标题右侧，与 ⓘ 图标同行 | 28px 圆形按钮 |

| 字段级组件 | 触发按钮位置 | HTML 结构要求 |
|-----------|-------------|---------------|
| 统计卡片字段值 | 字段值右上角，距文本 ≤ 4px | 12px 圆形按钮，半透明 |
| 表格列头 | 列标题右侧，与排序图标同行 | 12px 圆形按钮，半透明 |
| 表单字段 | 标签右侧或输入框右侧 | 14px 圆形按钮，半透明 |

### 4.2 触发按钮 HTML（双模式）

```html
<!-- 组件 inline 触发（展开/折叠内联注释） -->
<div class="stats-row annot-section">
  <button class="annot-trigger" data-annot="stats" onclick="toggleInline('stats')"
          title="查看 PRD 注释">📋</button>
  <!-- 原有组件内容 -->
</div>

<!-- 内联注释容器（紧跟在组件内容下方） -->
<div class="annot-inline" id="annotInline-stats" style="display:none;">
  <div class="annot-inline-header" onclick="toggleInline('stats')">
    <span class="annot-icon">▶</span>
    <span class="annot-title">C01 @StatsRow</span>
    <span class="annot-level">L1</span>
    <span class="annot-badge">3 fields</span>
  </div>
  <!-- 由 renderInline() 填充 -->
</div>

<!-- 页面 header 常驻触发（切换弹窗） -->
<div class="page-header-actions">
  <button class="btn btn-annot-toggle" onclick="openModal()"
          title="PRD 注释全览">📋 PRD 注释</button>
</div>

<!-- 统计卡片字段级触发 -->
<div class="stat-card">
  <div class="label">
    活跃流量主
    <button class="annot-trigger-field" data-annot-field="stats.active"
            onclick="toggleFieldAnnot('stats', 'active')" title="查看字段注释">ℹ️</button>
  </div>
  <div class="value">89</div>
</div>

<!-- 表格列头触发 -->
<th>
  流量主名称
  <button class="annot-trigger-col" data-annot-col="table.name"
          onclick="toggleFieldAnnot('table', 'name')" title="查看列注释">ℹ️</button>
</th>

<!-- 表单字段触发 -->
<div class="form-group">
  <label>
    邮箱 *
    <button class="annot-trigger-field" data-annot-field="form.email"
            onclick="toggleFieldAnnot('form', 'email')" title="查看字段注释">ℹ️</button>
  </label>
  <input type="email" placeholder="请输入邮箱地址">
</div>
```

### 4.3 导航标签

注释面板打开后，顶部显示 6 个导航标签，对应所有注释模块。标签使用简短中文名：

```html
<button class="annot-nav-btn" onclick="toggleAnnot('stats')">📊 统计卡片</button>
<button class="annot-nav-btn" onclick="toggleAnnot('batch')">⚡ 批量操作</button>
<button class="annot-nav-btn" onclick="toggleAnnot('table')">📋 数据表格</button>
<button class="annot-nav-btn" onclick="toggleAnnot('addExisting')">📋 添加已有</button>
<button class="annot-nav-btn" onclick="toggleAnnot('createNew')">➕ 新建</button>
<button class="annot-nav-btn" onclick="toggleAnnot('addMedia')">📱 添加媒体</button>
```

**icon + 短名推荐对照**：

| 组件 | Emoji | 推荐短名 |
|------|-------|----------|
| StatsCard | 📊 | 统计卡片 |
| BatchDropdown | ⚡ | 批量操作 |
| PublisherTable | 📋 | 数据表格 |
| AddExistingModal | 📋 | 添加已有 |
| CreatePublisherForm | ➕ | 新建 |
| AddMediaModal | 📱 | 添加媒体 |
| SearchableSelect | 🔍 | 搜索选择 |
| BatchConfirmModal | ⚠️ | 确认弹窗 |
| Toast | 🔔 | 通知 |

---

## 5. Integration Steps

将 HTML 注释系统集成到现有原型中，按以下步骤操作：

### Step 1: 准备注释数据

从 design.md 的 Annotation Block 提取数据，按 §3 格式构造 `ANNOTATIONS` 对象：

1. 遍历 design.md §2 中所有 `@ComponentName` 组件
2. 为每个组件创建一个 key（英文简短标识）
3. 提取 id / name / level / desc / states
4. 将每个 Annotation 字段拆分为 `{ title, lines }` 块
5. 保留树形缩进

### Step 2: 注入 CSS

将附录「完整 CSS」复制到原型 `<style>` 末尾。关键参数：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 弹窗宽度 | 600px | 弹窗宽度 |
| 动画时长 | 250ms | 弹窗缩放动画时长 |
| z-index | 10000 | 弹窗层级 |
| 触发按钮默认透明度 | 0.85 | hover 时变为 1.0 |

### Step 3: 注入 HTML 结构

在 `</body>` 前插入：

```html
<!-- Floating Annotation Panel -->
<div class="annot-panel" id="annotPanel">
  <div class="annot-panel-header">
    <h3 id="annotTitle">PRD 注释</h3>
    <div>
      <button class="btn-annot-edit" id="btnEditMode" onclick="toggleEditMode()"
              style="font-size:12px;padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;margin-right:8px;">✏️ 编辑注释</button>
      <button class="annot-panel-close" onclick="closeAnnot()">✕</button>
    </div>
  </div>
  <div class="annot-nav" id="annotNav">
    <!-- 导航标签 -->
  </div>
  <div class="annot-panel-body" id="annotBody">
    <!-- 由 JS 渲染 -->
  </div>
</div>

<!-- Floating Action Button (visible when panel closed) -->
<button class="annot-fab" id="annotFab" onclick="openModal()" title="打开 PRD 注释">📋</button>
```

### Step 4: 添加触发按钮

为每个页面级组件容器添加 `.annot-section` class 和 📋 触发按钮（见 §4.2）。

在页面 header 添加常驻「📋 PRD 注释」按钮。

### Step 5: 注入 JS

将附录「完整 JS」复制到 `<script>` 末尾。确保：

- `ANNOTATIONS` 对象包含所有组件数据
- `toggleAnnot()` 和 `closeAnnot()` 函数定义正确
- `keys` 数组顺序与导航标签一致

### Step 6: 验证

- [ ] 组件枚举清单中的所有组件都已放置 trigger 按钮（无遗漏）
- [ ] 每个 trigger 按钮在其组件可视边界内，间距 ≤ 8px
- [ ] 点击 header「📋 PRD 注释」按钮 → 面板打开，显示第一个组件注释
- [ ] 点击导航标签 → 切换对应组件注释
- [ ] 点击 inline 📋 按钮 → 打开面板并定位到对应组件的注释
- [ ] 点击 ✕ / ESC → 面板关闭，FAB 按钮重新显示
- [ ] 面板内容完整，无空白 block，无 HTML 转义问题
- [ ] 触发按钮 `data-annot` 属性与 `ANNOTATIONS` key 一致
- [ ] Back-propagation 已完成（如有修正 → design.md 已同步更新）

### 内联注释验证（双模式新增）

- [ ] 每个组件有内联注释容器（annot-inline），紧跟在组件内容下方
- [ ] 内联注释默认折叠（display: none）
- [ ] 点击组件 📋 按钮 → 展开该组件内联，自动折叠之前展开的
- [ ] 点击 Header 📋 按钮 → 切换弹窗显隐
- [ ] 内联展开时，弹窗打开 → 弹窗切换到该组件
- [ ] 内联和弹窗状态独立（折叠内联不影响弹窗）
- [ ] 内联注释按类型渲染顺序展示（非 blocks 顺序）
- [ ] 内联注释视觉锚定正确（虚线分隔 + 左侧色块 + 背景色区分）
- [ ] 数据同步：editAnnot → 内联 + 弹窗同时更新
- [ ] 折叠/展开动画流畅（300ms ease）
- [ ] ESC 关闭所有（内联折叠 + 弹窗关闭）

### 字段级注释验证（v2 新增）

- [ ] 每个统计卡片的字段值有 ℹ️ 触发按钮
- [ ] 点击字段级 ℹ️ 按钮 → 弹窗显示该字段的专用注释
- [ ] 弹窗标题格式为 "C01 @StatsRow › 活跃流量主"
- [ ] 弹窗内容为该字段的 Definition + Permission 等专用 block
- [ ] 字段级弹窗关闭不影响其他组件状态
- [ ] 每个表格列头有 ℹ️ 触发按钮
- [ ] 点击列头 ℹ️ 按钮 → 弹窗显示 Format + Source 等注释
- [ ] 每个表单字段有 ℹ️ 触发按钮
- [ ] 点击表单字段 ℹ️ 按钮 → 弹窗显示 Validation + Options 等注释

### 编辑模式验证（v2 新增）

- [ ] 弹窗 header 有 "✏️ 编辑注释" 按钮
- [ ] 点击编辑按钮 → blocks 变为 textarea 可编辑
- [ ] 保存按钮 → 修改持久化到 ANNOTATIONS 数据源
- [ ] 保存后内联注释同步更新（如果展开）
- [ ] 取消按钮 → 恢复原始内容，不保存
- [ ] 编辑完成后 "✏️ 编辑注释" 按钮恢复原始状态

### 面板交互验证（v2 新增）

- [ ] 浮动操作按钮（.annot-fab）固定在右下角，点击后打开面板（.annot-panel）
- [ ] 面板（.annot-panel）从右下角浮入，带 transform 动画
- [ ] 面板打开时 FAB 按钮隐藏（.hidden）
- [ ] 面板关闭时 FAB 按钮重新显示
- [ ] 面板最大宽度 480px，最大高度 60vh，支持内部滚动
- [ ] ESC 关闭面板
- [ ] 弹窗内导航标签支持切换不同组件

---

## 6. Complete Template Library

### 6.1 CSS 模板

```css
/* ============================================
   PRD Annotation System
   ============================================ */

/* Trigger Buttons */
.annot-trigger {
  position: absolute; top: 8px; right: 8px; z-index: 10;
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid #d1d5db; background: #fff;
  cursor: pointer; font-size: 13px; line-height: 26px; text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,.08); opacity: 0.85;
  transition: opacity .2s ease, background .2s ease;
}
.annot-trigger:hover { background: #eff6ff; border-color: #2563eb; }
.annot-trigger.active {
  opacity: 1; background: #2563eb; border-color: #2563eb;
  color: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.2);
}
.annot-section { position: relative; }
.annot-section:hover .annot-trigger { opacity: 1; }

/* Header Toggle Button */
.btn-annot-toggle { font-size: 12px !important; padding: 5px 12px !important; }
.btn-annot-toggle.active {
  background: #2563eb !important; color: #fff !important;
  border-color: #2563eb !important;
}

/* Floating Panel */
.annot-panel {
  position: fixed; bottom: 24px; right: 24px;
  width: 480px; max-width: calc(100vw - 48px); max-height: 60vh;
  background: #fff; border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,.12);
  z-index: 10000; display: flex; flex-direction: column;
  transform: translateY(calc(100% + 32px)); opacity: 0;
  pointer-events: none;
  transition: transform .25s cubic-bezier(.4,0,.2,1), opacity .2s ease;
}
.annot-panel.open {
  transform: translateY(0); opacity: 1;
  pointer-events: auto;
}
.annot-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e5e7eb;
}
.annot-panel-header h3 { font-size: 14px; font-weight: 600; color: #111827; }
.annot-panel-close {
  width: 28px; height: 28px; border: none; background: #f3f4f6;
  border-radius: 50%; cursor: pointer; font-size: 16px;
  text-align: center; color: #6b7280;
}
.annot-panel-close:hover { background: #e5e7eb; }

/* Panel Body */
.annot-panel-body {
  flex: 1; overflow-y: auto; padding: 14px 18px;
}

/* Navigation */
.annot-nav {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 10px 20px; border-bottom: 1px solid #f3f4f6;
}
.annot-nav-btn {
  font-size: 11px; padding: 4px 10px; border-radius: 12px;
  border: 1px solid #e5e7eb; background: #fff; cursor: pointer;
  color: #6b7280; transition: all .2s ease;
}
.annot-nav-btn:hover { border-color: #2563eb; color: #2563eb; }
.annot-nav-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

/* Body */
.annot-section-title {
  font-size: 12px; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #f3f4f6;
}
.annot-line { font-size: 13px; line-height: 1.7; color: #374151; margin-bottom: 2px; }
.annot-label { color: #9ca3af; font-weight: 600; min-width: 80px; display: inline-block; }
.annot-block { margin-bottom: 16px; }

/* Floating Action Button */
.annot-fab {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  width: 48px; height: 48px; border-radius: 50%;
  background: #2563eb; color: #fff; border: none;
  box-shadow: 0 4px 12px rgba(37,99,235,.35);
  cursor: pointer; font-size: 20px; line-height: 48px; text-align: center;
  transition: transform .2s ease, opacity .2s ease;
}
.annot-fab:hover { transform: scale(1.08); }
.annot-fab.hidden { transform: scale(0); opacity: 0; pointer-events: none; }

/* Responsive */
@media (max-width: 640px) {
  .annot-panel { width: calc(100vw - 32px); right: 16px; bottom: 16px; max-height: 70vh; }
}

/* ============================================
   Inline Annotation Styles
   ============================================ */

/* Inline container */
.annot-inline {
  margin-top: 0;
  border-top: 1px dashed #e5e7eb;
  background: #fafbfc;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  transition: max-height .3s ease, opacity .3s ease;
}

/* Inline header (always visible) */
.annot-inline-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; cursor: pointer; user-select: none;
  font-size: 13px; color: #374151;
}
.annot-inline-header:hover { background: #f3f4f6; }
.annot-inline-header .annot-icon {
  font-size: 11px; margin-right: 8px; color: #6b7280;
  transition: transform .2s ease;
}
.annot-inline-header .annot-icon.open { transform: rotate(90deg); }
.annot-inline-header .annot-badge {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
}
.annot-inline-header .annot-title {
  font-weight: 600; flex: 1;
}
.annot-inline-header .annot-level {
  font-size: 11px; color: #9ca3af; margin-left: 8px;
}

/* Inline body */
.annot-inline-body {
  padding: 0 16px 12px 16px;
}
.annot-inline-body .annot-block {
  margin-bottom: 10px;
}
.annot-inline-body .annot-section-title {
  font-size: 11px; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 4px; display: flex; align-items: center; gap: 6px;
}
.annot-inline-body .annot-section-title::before {
  content: '🔹';
  font-size: 10px;
}
.annot-inline-body .annot-line {
  font-size: 12px; line-height: 1.6; color: #374151;
  margin-bottom: 1px; padding-left: 18px;
}

/* State-aware annotation display */
.annot-inline.draft { border-left: 3px solid #f59e0b; }
.annot-inline.review { border-left: 3px solid #3b82f6; }
.annot-inline.final { border-left: 3px solid #10b981; }
.annot-inline.unstable { border-left: 3px solid #ef4444; }
```

### 6.2 JS 模板

```javascript
// ============================================
// PRD Annotation Data
// ============================================
const ANNOTATIONS = {
  // 每个 key 对应一个组件，参考 §3 Data Format
  // 示例：
  stats: {
    id: 'C01',
    name: '@StatsCardRow',
    level: 'L2',
    label: '📊 统计卡片',
    desc: '展示 3 张统计卡片，概览流量主数据',
    states: 'normal / loading / empty / error',
    blocks: [
      { title: 'Trigger', lines: ['页面加载 → updateStats()'] },
      { title: 'Behavior', lines: [
        '内部流量主：统计 type 为 internal 且状态非 deleted 的流量主数量',
        '总流量主：统计全部流量主数量（含内部和外部）',
        '活跃流量主：统计 type 为 internal、状态为 active 且近 7 天有 API 请求的流量主数量'
      ]},
      { title: 'Dismiss', lines: ['数据变更 → updateStats()'] }
    ]
  }
};

// ============================================
// Unified State Management
// ============================================
var state = {
  panelOpen: false,     // panel visibility
  inlineKey: null,      // current inline component (null = none)
  panelKey: null,       // component shown in panel
  panelField: null,     // field shown in panel (null = component-level)
  editMode: false,      // edit mode on/off
  editHistory: []       // [{type, key, field, before, after}]
};

// ============================================
// State-dependent Render Helper
// ============================================
function render() {
  if (!state.panelKey) return;
  var data = ANNOTATIONS[state.panelKey];
  if (!data) return;

  if (state.panelField) {
    var fields = data.fields || data.columns;
    if (fields && fields[state.panelField]) {
      renderFieldBody(fields[state.panelField], state.editMode);
    }
  } else {
    renderAnnotBody(data, state.editMode);
  }
}

// ============================================
// Annotation Panel Control
// ============================================
function openModal(key) {
  const panel = document.getElementById('annotPanel');
  const fab = document.getElementById('annotFab');
  const isOpen = panel.classList.contains('open');

  if (key) {
    switchPanelTo(key);
    panel.classList.add('open');
    fab.classList.add('hidden');
    return;
  }

  if (isOpen) {
    closeAnnot();
  } else {
    const keys = Object.keys(ANNOTATIONS);
    if (keys.length > 0) {
      const target = state.inlineKey || keys[0];
      switchPanelTo(target);
    }
    panel.classList.add('open');
    fab.classList.add('hidden');
  }
}

function switchPanelTo(key) {
  state.panelKey = key;
  state.panelField = null;
  state.editMode = false;
  var editBtn = document.getElementById('btnEditMode');
  if (editBtn) editBtn.textContent = '✏️ 编辑注释';
  const data = ANNOTATIONS[key];
  if (!data) return;

  document.querySelectorAll('.annot-trigger, .btn-annot-toggle')
    .forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('[data-annot="' + key + '"]')
    .forEach(function(b) { b.classList.add('active'); });

  document.getElementById('annotTitle').textContent = data.id + ' ' + data.name + ' ' + data.level;
  renderNav(key);

  renderAnnotBody(data, false);
}

function renderNav(key, activeField) {
  var nav = document.getElementById('annotNav');
  var data = ANNOTATIONS[key];
  if (!data) return;

  var html = '';
  if (activeField) {
    var fields = data.fields || data.columns;
    if (fields) {
      Object.keys(fields).forEach(function(fk) {
        var active = fk === activeField ? ' active' : '';
        html += '<button class="annot-nav-btn' + active + '" onclick="toggleFieldAnnot(\'' + key + '\',\'' + fk + '\')">' + escapeHtml(fields[fk].label) + '</button>';
      });
    }
  } else {
    var keys = Object.keys(ANNOTATIONS);
    keys.forEach(function(k) {
      var active = k === key ? ' active' : '';
      var label = ANNOTATIONS[k].label || k;
      html += '<button class="annot-nav-btn' + active + '" onclick="switchPanelTo(\'' + k + '\')">' + escapeHtml(label) + '</button>';
    });
  }
  nav.innerHTML = html;
}

function closeAnnot() {
  state.panelKey = null;
  state.panelField = null;
  state.editMode = false;
  document.getElementById('annotPanel').classList.remove('open');
  document.getElementById('annotFab').classList.remove('hidden');
  document.querySelectorAll('.annot-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.annot-trigger, .annot-trigger-field, .annot-trigger-col')
    .forEach(function(b) { b.classList.remove('active'); });
  var hdrBtn = document.querySelector('.btn-annot-toggle');
  if (hdrBtn) hdrBtn.classList.remove('active');
}

// ============================================
// Annotation Body Renderer
// ============================================
function renderAnnotBody(data, editable) {
  var body = document.getElementById('annotBody');
  var html = '';

  // Description block
  html += '<div class="annot-block"><div class="annot-section-title">DESCRIPTION</div>';
  if (editable) {
    html += '<textarea class="annot-edit-textarea" data-field="desc" rows="2">'
          + escapeHtml(data.desc) + '</textarea>';
  } else {
    html += '<div class="annot-line">' + escapeHtml(data.desc) + '</div>';
  }
  html += '<div class="annot-line"><span class="annot-label">States:</span> '
        + escapeHtml(data.states) + '</div></div>';

  // Annotation blocks
  data.blocks.forEach(function(b, bi) {
    html += '<div class="annot-block"><div class="annot-section-title">'
          + escapeHtml(b.title.toUpperCase()) + '</div>';
    if (editable) {
      html += '<textarea class="annot-edit-textarea" data-block="' + bi + '" rows="'
            + Math.max(b.lines.length + 1, 3) + '">'
            + b.lines.map(function(l) { return escapeHtml(l); }).join('\n')
            + '</textarea>';
    } else {
      b.lines.forEach(function(l) {
        var line = l.replace(/^  ├── /, '&nbsp;&nbsp;&nbsp;&nbsp;├── ')
                     .replace(/^  └── /, '&nbsp;&nbsp;&nbsp;&nbsp;└── ');
        html += '<div class="annot-line">' + line + '</div>';
      });
    }
    html += '</div>';
  });

  if (editable) {
    html += '<div class="annot-edit-actions">';
    html += '<button class="btn btn-primary" onclick="saveEdit()">💾 保存修改</button>';
    html += '<button class="btn btn-cancel" onclick="toggleEditMode()">取消</button>';
    html += '</div>';
  }

  body.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close on ESC
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && state.panelKey) closeAnnot();
});

// ============================================
// Inline Annotation Control
// ============================================

function toggleInline(key) {
  const container = document.getElementById('annotInline-' + key);
  if (!container) return;

  if (state.inlineKey === key && container.style.display !== 'none') {
    // 折叠
    container.style.display = 'none';
    state.inlineKey = null;
    updateTriggerState(key, false);
    return;
  }

  // 折叠前一个
  if (state.inlineKey && state.inlineKey !== key) {
    const prev = document.getElementById('annotInline-' + state.inlineKey);
    if (prev) prev.style.display = 'none';
    updateTriggerState(state.inlineKey, false);
  }

  // 展开当前
  const data = ANNOTATIONS[key];
  if (!data) return;
  renderInline(key, data);
  container.style.display = 'block';
  state.inlineKey = key;
  updateTriggerState(key, true);

  // 如果弹窗打开，同步切换
  if (document.getElementById('annotPanel').classList.contains('open')) {
    switchPanelTo(key);
  }
}

function renderInline(key, data) {
  const container = document.getElementById('annotInline-' + key);
  if (!container) return;

  // 生成内联渲染顺序
  const orderMap = {
    T1: ['data', 'trigger', 'state'],
    T2: ['columns', 'pagination', 'api', 'state'],
    T3: ['behavior', 'state'],
    T4: ['items', 'dismiss', 'state'],
    T5: ['content', 'behavior', 'state'],
    T6: ['fields', 'behavior', 'api', 'state'],
    T7: ['search', 'selection', 'confirm', 'state'],
    T8: ['match', 'display', 'callback', 'state'],
    T9: ['behavior', 'timing', 'types'],
    T10: ['content', 'behavior'],
    T11: ['content', 'placement']
  };
  const order = orderMap[data.type] || ['trigger', 'behavior', 'state'];

  // 按顺序排列 blocks
  const orderedBlocks = [];
  order.forEach(function(field) {
    const block = data.blocks.find(function(b) {
      return b.title.toLowerCase().replace(/\s+/g, '') === field.toLowerCase();
    });
    if (block) orderedBlocks.push(block);
  });

  // 构建 HTML
  var html = '';
  html += '<div class="annot-inline-body">';
  html += '<div class="annot-block">';
  html += '<div class="annot-section-title">DESCRIPTION</div>';
  html += '<div class="annot-line">' + escapeHtml(data.desc) + '</div>';
  html += '<div class="annot-line"><strong>States:</strong> ' + escapeHtml(data.states) + '</div>';
  html += '</div>';

  orderedBlocks.forEach(function(b) {
    html += '<div class="annot-block">';
    html += '<div class="annot-section-title">' + escapeHtml(b.title.toUpperCase()) + '</div>';
    b.lines.forEach(function(l) {
      var line = l.replace(/^  ├── /, '&nbsp;&nbsp;&nbsp;&nbsp;├── ')
                   .replace(/^  └── /, '&nbsp;&nbsp;&nbsp;&nbsp;└── ');
      html += '<div class="annot-line">' + line + '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function updateTriggerState(key, active) {
  document.querySelectorAll('[data-annot="' + key + '"]').forEach(function(b) {
    if (active) b.classList.add('active');
    else b.classList.remove('active');
  });
}


// ============================================
// Field-level Annotation Control
// ============================================

function toggleFieldAnnot(componentKey, fieldKey) {
  const data = ANNOTATIONS[componentKey];
  if (!data) return;

  const fieldData = data.fields && data.fields[fieldKey];
  const colData = data.columns && data.columns[fieldKey];
  const entry = fieldData || colData;
  if (!entry) return;

  state.panelKey = componentKey;
  state.panelField = fieldKey;
  document.getElementById('annotTitle').textContent = data.id + ' ' + data.name + ' › ' + entry.label;
  document.getElementById('annotPanel').classList.add('open');
  document.getElementById('annotFab').classList.add('hidden');

  renderFieldBody(entry);
}

function renderFieldBody(entry) {
  var body = document.getElementById('annotBody');
  var html = '';

  entry.blocks.forEach(function(b) {
    html += '<div class="annot-block"><div class="annot-section-title">'
          + escapeHtml(b.title.toUpperCase()) + '</div>';
    b.lines.forEach(function(l) {
      html += '<div class="annot-line">' + escapeHtml(l) + '</div>';
    });
    html += '</div>';
  });

  body.innerHTML = html;
}

// ============================================
// Data Synchronization
// ============================================

function editAnnot(key, field, operation, content) {
  var data = ANNOTATIONS[key];
  if (!data) return;

  var block = data.blocks.find(function(b) {
    return b.title.toLowerCase() === field.toLowerCase();
  });
  if (!block) return;

  if (operation === 'append') {
    block.lines.push(content);
  } else if (operation === 'replace') {
    block.lines = [content];
  }

  // 更新内联 DOM（如果当前展开）
  var inlineContainer = document.getElementById('annotInline-' + key);
  if (inlineContainer && inlineContainer.style.display !== 'none') {
    renderInline(key, data);
  }

  // 更新弹窗（如果当前显示该组件）
  if (state.panelKey === key) {
    renderAnnotBody(data, state.editMode);
  }

  console.log('[Annot] ' + key + ' ' + field + ' ' + operation + ': ' + content);
}

// ============================================
// Annotation Edit Mode
// ============================================

function toggleEditMode() {
  state.editMode = !state.editMode;
  if (state.panelKey) {
    const data = ANNOTATIONS[state.panelKey];
    if (data) renderAnnotBody(data, state.editMode);
  }
  const btn = document.getElementById('btnEditMode');
  if (btn) {
    btn.textContent = state.editMode ? '💾 保存修改' : '✏️ 编辑注释';
    btn.classList.toggle('active', state.editMode);
  }
}

function saveEdit() {
  if (!state.panelKey) return;
  var data = ANNOTATIONS[state.panelKey];
  var before = JSON.stringify(data);

  var descField = document.querySelector('[data-field="desc"]');
  if (descField && descField.value !== data.desc) {
    data.desc = descField.value;
  }

  data.blocks.forEach(function(b, bi) {
    var textarea = document.querySelector('[data-block="' + bi + '"]');
    if (textarea) {
      var newLines = textarea.value.split('\n').filter(function(l) { return l.trim() !== ''; });
      b.lines = newLines;
    }
  });

  // Record history
  state.editHistory.push({
    type: 'edit',
    key: state.panelKey,
    before: before,
    after: JSON.stringify(data)
  });

  // 同步更新内联
  var inlineContainer = document.getElementById('annotInline-' + state.panelKey);
  if (inlineContainer && inlineContainer.style.display !== 'none') {
    renderInline(state.panelKey, data);
  }

  state.editMode = false;
  var btn = document.getElementById('btnEditMode');
  if (btn) { btn.textContent = '✏️ 编辑注释'; btn.classList.remove('active'); }
  renderAnnotBody(data, false);

  showDiffSummary(data, before);
  console.log('[Annot] Saved edits for ' + state.panelKey);
}

function undoEdit() {
  var last = state.editHistory.pop();
  if (!last) return;
  var data = ANNOTATIONS[last.key];
  if (!data) return;
  var restored = JSON.parse(last.before);
  Object.assign(data, restored);
  if (state.panelKey === last.key) {
    renderAnnotBody(data, false);
  }
  var inlineContainer = document.getElementById('annotInline-' + last.key);
  if (inlineContainer && inlineContainer.style.display !== 'none') {
    renderInline(last.key, data);
  }
  console.log('[Annot] Undo: ' + last.key);
}

function showDiffSummary(newData, before) {
  var oldData = JSON.parse(before);
  var changes = [];
  newData.blocks.forEach(function(b, bi) {
    var oldBlock = oldData.blocks[bi];
    if (!oldBlock) return;
    var oldLines = oldBlock.lines.join('\n');
    var newLines = b.lines.join('\n');
    if (oldLines !== newLines) {
      changes.push(b.title + ' (' + oldBlock.lines.length + '→' + b.lines.length + ' 行)');
    }
  });
  if (changes.length > 0) {
    var bar = document.createElement('div');
    bar.style.cssText = 'padding:8px 16px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:12px;color:#166534;';
    bar.textContent = '✅ 已保存: ' + changes.join(', ');
    var header = document.querySelector('.annot-panel-header');
    if (header) header.parentNode.insertBefore(bar, header.nextSibling);
    setTimeout(function() { bar.remove(); }, 3000);
  }
}

// ============================================
// Verification Mode
// ============================================

function runVerification() {
  var results = [];
  var keys = Object.keys(ANNOTATIONS);

  // Check 1: Trigger coverage
  keys.forEach(function(k) {
    var hasTrigger = document.querySelector('[data-annot="' + k + '"]');
    if (!hasTrigger) {
      results.push({ type: 'error', msg: k + ': 缺少 trigger 按钮' });
    }
  });
  if (keys.every(function(k) { return document.querySelector('[data-annot="' + k + '"]'); })) {
    results.push({ type: 'pass', msg: '所有组件均有 trigger 按钮' });
  }

  // Check 2: State coverage
  var stateMinimums = {
    T1: ['normal','loading','error'],
    T2: ['normal','loading','empty','error'],
    T3: ['normal','disabled','loading'],
    T4: ['normal','open','disabled'],
    T5: ['normal','submitting','error'],
    T6: ['normal','fieldError','submitting','success','apiError'],
    T7: ['normal','loading','empty','searchEmpty','selected','confirming','error'],
    T8: ['idle','focus','searching','selected','empty','error'],
    T9: ['show','hidden'],
    T10: ['empty','loading','error'],
    T11: ['hidden','visible']
  };
  keys.forEach(function(k) {
    var data = ANNOTATIONS[k];
    var min = stateMinimums[data.type];
    if (min) {
      var covered = data.states.split('/').map(function(s) { return s.trim(); });
      var missing = min.filter(function(m) { return covered.indexOf(m) === -1; });
      if (missing.length > 0) {
        results.push({ type: 'warn', msg: k + ' (' + data.type + '): 缺少状态 ' + missing.join(', ') });
      }
    }
  });

  // Check 3: Content rules — flag code patterns
  var codePatterns = [/count\(/i, /SELECT /i, /WHERE /i, /=>/, /===/, /\.map\(/, /\.filter\(/];
  keys.forEach(function(k) {
    var data = ANNOTATIONS[k];
    data.blocks.forEach(function(b) {
      b.lines.forEach(function(l) {
        codePatterns.forEach(function(p) {
          if (p.test(l)) {
            results.push({ type: 'warn', msg: k + '.' + b.title + ': 可能包含代码语法 "' + l.trim().substring(0, 40) + '"' });
          }
        });
      });
    });
  });

  // Render results
  renderVerificationResults(results);
}

function renderVerificationResults(results) {
  var body = document.getElementById('annotBody');
  var pass = results.filter(function(r) { return r.type === 'pass'; }).length;
  var warn = results.filter(function(r) { return r.type === 'warn'; }).length;
  var err = results.filter(function(r) { return r.type === 'error'; }).length;
  var total = results.length;

  var icon = err > 0 ? '❌' : warn > 0 ? '⚠️' : '✅';
  var html = '<div class="annot-block">';
  html += '<div class="annot-section-title">' + icon + ' 验证结果 (' + pass + '/' + total + ' 通过)</div>';
  results.forEach(function(r) {
    var ic = r.type === 'pass' ? '✅' : r.type === 'warn' ? '⚠️' : '❌';
    html += '<div class="annot-line" style="color:' + (r.type === 'pass' ? '#166534' : r.type === 'warn' ? '#92400e' : '#991b1b') + '">' + ic + ' ' + escapeHtml(r.msg) + '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
}

// Re-export switchPanelTo for HTML onclick use
function switchPanelToFromTrigger(key) {
  switchPanelTo(key);
}
```

### 6.3 HTML 结构模板

```html
<!-- Floating Annotation Panel -->
<div class="annot-panel" id="annotPanel">
  <div class="annot-panel-header">
    <h3 id="annotTitle">PRD 注释</h3>
    <div>
      <button class="btn-annot-edit" id="btnEditMode" onclick="toggleEditMode()"
              style="font-size:12px;padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;margin-right:8px;">✏️ 编辑注释</button>
      <button class="annot-panel-close" onclick="closeAnnot()">✕</button>
    </div>
  </div>
  <div class="annot-nav" id="annotNav">
    <!-- nav buttons -->
  </div>
  <div class="annot-panel-body" id="annotBody">
    <!-- Render by renderAnnotBody() -->
  </div>
</div>

<!-- Floating Action Button (visible when panel closed) -->
<button class="annot-fab" id="annotFab" onclick="openModal()" title="打开 PRD 注释">📋</button>
```

---

## 7. Cost-Benefit Guide

| 原型复杂度 | 推荐方案 | 预计成本 |
|-----------|---------|---------|
| 1-2 个组件 | 不嵌入，直接引用 design.md | 0 |
| 3-5 个页面级组件 | 只加 header 按钮 + 导航标签，不加 inline 触发 | ~50 行 |
| 5-10 个组件含弹窗 | 完整方案（header 按钮 + inline 触发 + 导航标签） | ~200 行 |
| 10+ 组件含复杂交互 | 完整方案 + 自定义 icon | ~300 行 |

**底线**：超过 3 个组件的原型建议嵌入 HTML 注释系统。成本固定（约 200 行模板代码），但评审效率提升显著（评审者无需在页面和文档间切换）。
