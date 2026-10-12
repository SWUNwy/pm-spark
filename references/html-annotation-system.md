# HTML Annotation System — 原型中的 PM 注释

将设计文档中的 PM 六字段渲染为 HTML 注释，评审者可直接在组件旁阅读用途、行为、状态和边界。

## 1. 使用条件

已有 HTML 原型或用户要求生成带注释原型时使用。组件较少也可直接交付 Markdown。组件枚举先于输出：每个交互组件记录唯一锚点与 T1–T11 类型，避免遗漏与幽灵项。

## 2. 呈现模式

| 模式 | 呈现 | 数据 |
|---|---|---|
| 内联 | 组件下方折叠卡片 | PM 六字段 |
| 侧栏/弹窗 | 通过组件入口切换内容 | PM 六字段 |
| 评审模式 | 常驻右栏、场景切换、编号徽标和滚动联动 | review-docs JSON |

三个模式使用相同 PM 内容，不因呈现方式改变字段结构。折叠标题显示组件名称、类型或字段完整性；展开依次显示摘要、功能定位、交互逻辑、状态说明、边界条件、UI 文案。无关键文案时省略 UI 文案块。

类型决定应覆盖的产品行为和状态，见 `annotation-templates.md §3`；渲染顺序始终按六字段。工程细节仅在独立 implementation 交接文档中输出。

### 2.1 内联和侧栏

- 每个组件至少一个注释入口，在组件可视边界内，与边缘间距不超过 8px。
- 内联注释紧跟组件下方，使用虚线分隔、左侧色块和独立背景。
- 内联展开、侧栏切换与字段编辑均读取同一结构化数据。
- 修改六字段后同步刷新内联与侧栏，并记录需同步的设计文档章节。
- 关闭、ESC 和恢复展开状态按产品原型实际需求实现，不能隐藏缺失字段。

### 2.2 评审模式布局契约

```text
.layout { display:flex }
  .product-panel { width:82%; overflow:auto }
    .proto-element[data-proto-id]
  .doc-panel { width:18%; max-width:30% }
    .panel-header（PRD 注释）
    .resize-handle
    .scene-tabs
    #docBody
```

右栏持久分栏。拖宽范围为 18%–30%，localStorage 的 `reviewPanelWidth` 记忆宽度；视口不超过 760px 时改为纵向堆叠并隐藏拖拽手柄。

### 2.3 数据结构

以 `<script id="review-docs" type="application/json">` 承载严格 JSON：

```json
{
  "create": {
    "heading": "创建成员",
    "crumb": "成员管理 / 创建",
    "items": [
      {
        "protoId": "create-form",
        "title": "成员表单",
        "type": "T6",
        "scopeMark": "new",
        "summary": "填写信息后创建成员。",
        "annotation": {
          "feature": "为管理员提供成员创建入口。",
          "logic": "填写并提交；成功关闭表单并刷新列表；取消不创建。",
          "states": "可填写、字段错误、提交中、成功、失败可重试；错误时保留已填内容。",
          "boundary": "仅管理员可操作；必填项未填不可提交；未保存退出时提示确认。",
          "copy": "创建成员；创建成功；请填写姓名。"
        }
      }
    ],
    "decision": "保留失败后的输入内容，便于重试。"
  }
}
```

`summary` 与 `type` 在条目顶层，其余 PM 字段在 `annotation` 中。每个条目的 `protoId` 必须对应左侧 `data-proto-id`。`scopeMark` 只允许 existing/new/adjusted；`decision` 是可选场景字段，不能写在条目里。空场景允许 `items: []`，展示「本场景暂无注释条目」。

### 2.4 两层职责

| 层 | 职责 |
|---|---|
| Product layer | 原型 DOM、产品结构与业务交互 |
| Annotation layer | review-docs 数据、右栏 `.proto-desc` 和 `.anno-badge` 徽标 |

权威 CSS / JS 仅维护在 `annotation-output-templates.md`。生成页面与 demo 原样嵌入权威实现，模板同步测试保证两者一致。

### 2.5 徽标、悬停与滚动

- `renderDocs()` 后调用 `injectBadges()`，为匹配组件注入 `.anno-badge`。
- 徽标在组件右上角绝对定位，数字为当前场景条目索引加一；切换场景移除旧徽标再注入。
- 左侧组件 hover：双方高亮、右侧条目滚动到可见区域。
- 右侧条目 hover：双方高亮；点击条目使左侧 canvas 滚动到组件。
- 点击左侧徽标使右侧对应条目滚动到可见区域。
- 同一组件有多个条目时须在评审前核对锚点是否需要拆分，避免徽标遮挡。

## 3. 生成与验证

1. 枚举组件并选择类型；从设计信息填充六字段。
2. 先校验结构化数据，再使用相同数据渲染 HTML 与 Markdown。
3. 嵌入权威 CSS / JS，为每个组件设置 `data-proto-id`。
4. 运行 `node scripts/validate-annotations.js <HTML>`；无错误后验证真实页面交互。
5. 核对编号、场景切换、双向高亮、滚动、拖宽记忆、窄屏堆叠与空态。
6. 将 HTML 验证中修正的行为、状态、边界反向同步到设计文档。

脚本验证 PM 必填字段、字符串完整性、类型、未知字段和锚点配对。产品语义与按类型覆盖的状态需人工核对，不用字段数量替代需求完整性。

## 4. 旧格式迁移隔离

旧 ANNOTATIONS blocks / VIEW_DESCS 不作为新页面生成模板。`--legacy` 仅显式检查旧文件；`--migrate` 输出独立 `.pm.json` 草稿，不改变原文件，无法确定的字段留空并阻断交付。当前 HTML、Markdown 和迁移输出均不得生成废弃的注释等级字段。迁移细节见 `annotation-templates.md §7`。
