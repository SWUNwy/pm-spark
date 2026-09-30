# Annotation Templates — 类型化注释模板系统

> **版本:** v1.0
> **设计原则:** 第一性原理——从注释的消费者（PM/Dev/Test/Design）需求出发，确保质量内建于框架而非依赖外部检查。

---

## PM 输出路径约束（优先级最高）

当前调用为 **PM 注释快速路径**（原型注释 / 已有方案注释）时，以下约束覆盖所有类型模板的字段定义：

### PM 路径禁用字段（不生成、不填充）

| 禁用字段 | 原因 |
|---------|------|
| `api` / `endpoint` / `request` / `response` | 属于 Implementation 层 |
| `fields[].validation` / `fields[].error_code` | 属于 Implementation 层 |
| `columns[].format` / `columns[].source` | 属于 Implementation 层 |
| `timing` / `animation` | 属于 Implementation 层 |
| `accessibility` / `aria` | 属于 Implementation 层 |
| `i18n` / `locale` | 属于 Implementation 层 |
| `responsive` | 属于 Implementation 层 |
| `error_codes` | 属于 Implementation 层 |
| `style`（CSS 规范，如 px 值、color hex） | 属于 Implementation 层 |
| L2 字段（placement/timing/style） | 属于 Implementation 层 |
| L3 字段（accessibility/responsive/i18n） | 属于 Implementation 层 |

### PM 路径使用的 schema

PM 路径不使用 T1-T11 类型模板的字段填充方式。改用统一的 6 字段 PM schema：
`summary` / `feature` / `logic` / `states` / `boundary` / `copy`

T1-T11 类型模板仍用于**工程交接路径**（Implementation 层，需用户显式选择 delivery_layer=implementation）。

---

## 1. 概述

### 1.1 痛点

原 L1/L2/L3 框架是扁平通用模板——一个模板试图覆盖所有组件类型。导致：

- 字段结构存在，但字段内容质量无约束（代码语言 vs 产品语言）
- 关键维度遗漏（permission、validation 不在框架内）
- 状态覆盖要求模糊（"至少一种"意味着可以跳过 submitting/error）
- HTML trigger 无放置规则
- 组件间一致性无法验证

### 1.2 解法

**类型化模板**——按交互模式对组件分类，每类有专属的字段定义、内容规则、状态机。质量由模板结构保障，而非靠人肉检查清单。

### 1.3 设计原则

1. **消费者驱动：** 每个字段的存在理由是"有角色需要这个信息"
2. **类型驱动：** 同交互模式 = 同模板，不同模式 = 不同模板
3. **内容规则 > 字段存在：** 字段填了不等于填对了，内容规则定义"什么算对"
4. **状态机是强制门槛：** 类型级状态要求确保测试可操作性
5. **共享块避免冗余：** DialogContext / APICall / Permission 三种上下文被类型引用而非内嵌

---

## 2. 组件类型分类（Component Taxonomy）

分类依据是**交互模式**（interaction pattern）——同模式需要同模板，不同模式用不同模板。

| ID | 类型名 | 交互模式 | 典型实例 | 消费者主要关注者 |
|----|--------|---------|---------|:--------------:|
| T1 | **DisplayMetric** | 展示数据指标，无用户输入 | 统计卡片 | PM / Dev |
| T2 | **DataList** | 列表 + 分页 + 选择 | 流量主列表表格 | Dev / Test |
| T3 | **ActionButton** | 单操作触发 | "添加"按钮 | Dev / PM |
| T4 | **ActionMenu** | 多选一操作 | 批量操作 dropdown | Dev / Test |
| T5 | **ConfirmAction** | 二次确认 | 批量确认弹窗 | PM / Test |
| T6 | **FormFill** | 表单填写 + 校验 + 提交 | 创建流量主弹窗 | Dev / Test / PM |
| T7 | **ItemSelect** | 搜索 + 筛选 + 选择 + 确认 | 添加已有流量主弹窗 | Dev / Test |
| T8 | **SearchSelect** | 搜索式选择器（子组件） | 人员搜索器 | Dev |
| T9 | **Toast** | 瞬态反馈 | 操作成功提示 | Dev / Design |
| T10 | **StatusPlaceholder** | 空 / 加载 / 错误占位 | 骨架屏 / 空表格 | Dev / Design |
| T11 | **PageInfo** | 页面辅助说明 | 标题 ⓘ 气泡 | PM / Design |

### 2.1 分类规则

- 视觉变化（颜色、间距）不独立成类——它们依附于交互组件
- 嵌套组件在实例化时声明关系，不独立成类
- 只出现一次且确定不复用的组件不需要独立成类，用已有类型标注
- 弹窗（Dialog）不是类型，是上下文——FormFill / ItemSelect / ConfirmAction 通过 `context: DialogContext` 复用弹窗属性

### 2.2 "对话" / "内容"行为如何处理

"对话"（Chat）/ "内容"（Content Display）等行为有强展示逻辑但非高度交互的组件行为，依据底层交互模式选用类型处理、而无需为其单独设立类型：

- WebRTC/IM/评论区：驱动模式符合表单/数据列表原型界面的基础行为，用 T6 FormFill 控件、T2 DataList 控件组合构成。
- PDF/AI编辑器/文本编辑器：原生基于 Canvas/DOM + 快捷键/多点触控等多态交互，不适用于通用基于 CRUD 的模板体系，在需求分析阶段归入"高度交互"组件，在设计阶段单独定义。

### 2.3 自然语言 → 类型映射规则

当用户用自然语言描述组件时，使用以下规则自动映射到类型模板。

#### 2.3.1 关键词匹配表

| 用户描述关键词 | 推荐类型 | 典型场景 |
|---------------|---------|---------|
| 展示/统计/指标/卡片/数据概览 | T1 DisplayMetric | 统计卡片、数据概览 |
| 列表/表格/分页/数据列表/数据行 | T2 DataList | 数据表格、列表页 |
| 按钮/添加/提交/删除/操作 | T3 ActionButton | 操作按钮 |
| 下拉菜单/批量操作/菜单/选项 | T4 ActionMenu | 批量操作下拉 |
| 确认弹窗/二次确认/确认框/确认 | T5 ConfirmAction | 删除确认 |
| 表单/填写/创建/编辑/输入弹窗 | T6 FormFill | 创建表单弹窗 |
| 选择器/搜索选择/选择弹窗/选取 | T7 ItemSelect | 搜索选择器弹窗 |
| 搜索框/自动补全/搜索输入/联想 | T8 SearchSelect | 搜索输入框（子组件）|
| 提示/Toast/通知/反馈/消息 | T9 Toast | 操作反馈提示 |
| 空状态/加载/占位/骨架屏/错误 | T10 StatusPlaceholder | 空数据占位 |
| 提示气泡/帮助/说明/引导/信息 | T11 PageInfo | 信息提示气泡 |

#### 2.3.2 决策树

```
组件是否展示数据？
  ├─ 是 → 数据是否可交互？
  │     ├─ 是（可排序/筛选/选择/分页）→ T2 DataList
  │     └─ 否（只读展示，无用户输入）→ T1 DisplayMetric
  └─ 否 → 组件是否触发操作？
        ├─ 是 → 触发后是否需要用户输入？
        │     ├─ 是 → 是否需要搜索/选择？
        │     │     ├─ 是 → T7 ItemSelect
        │     │     └─ 否 → T6 FormFill
        │     └─ 否 → 是否需要二次确认？
        │           ├─ 是 → T5 ConfirmAction
        │           └─ 否 → 操作入口形态？
        │                 ├─ 单按钮/链接 → T3 ActionButton
        │                 └─ 多选项/下拉 → T4 ActionMenu
        └─ 否 → 组件是反馈/提示？
              ├─ 是 → 是否自动消失？
              │     ├─ 是 → T9 Toast
              │     └─ 否（需用户关闭）→ T11 PageInfo
              └─ 否 → 是否为占位/加载状态？
                    ├─ 是 → T10 StatusPlaceholder
                    └─ 否 → 判断是否为搜索输入子组件？
                          ├─ 是 → T8 SearchSelect
                          └─ 否 → 人工判断
```

#### 2.3.3 复合组件映射

当一个组件包含多个子组件时，父组件使用最外层交互模式映射，子组件独立映射：

| 复合场景 | 父组件类型 | 子组件类型 |
|---------|-----------|-----------|
| 弹窗内包含表单和搜索选择器 | T6 FormFill | T8 SearchSelect |
| 弹窗内包含列表和操作按钮 | T2 DataList | T3 ActionButton |
| 页面包含多个统计卡片 | T1 DisplayMetric | 无子组件 |
| 列表行内包含操作菜单 | T2 DataList | T4 ActionMenu |
| 弹窗内包含确认内容和提交 | T5 ConfirmAction | T3 ActionButton |
| 表单内包含搜索式选择器 | T6 FormFill | T7 ItemSelect |

#### 2.3.4 映射不确定性处理

| 情况 | 处理方式 |
|------|---------|
| 关键词匹配到多个类型 | 使用决策树二次确认，输出候选列表让用户选择 |
| 无关键词匹配 | 使用决策树从头判断，若仍无法确定则标记为"未分类" |
| 用户描述模糊（如"这里加个东西"） | 追问具体交互模式："这是展示数据、触发操作、还是提供反馈？" |
| 描述与决策树结果矛盾 | 以用户确认的交互模式为准，更新映射规则 |

---

## 3. 共享属性块

三种被多个类型引用的共享块，避免字段重复定义。

### 3.1 Block A：DialogContext — 弹窗上下文

> 引用方式：类型定义中声明 `context: DialogContext`，可缺省默认值。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| placement | 居中定位 + 宽度（px 或百分比） | 必填 |
| timing | 入场/出场动效及时长，默认 "200ms slideUp" | 可选 |
| dismiss | ESC / 遮罩层 / 关闭按钮（三选一或全选） | 必填 |
| z-index | 层叠层级，默认 1000 | 可选 |

### 3.2 Block B：APICall — 后端交互

> 引用方式：类型定义中声明 `api: [Block B]`。无反向后端调用的组件不应出现此块。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| endpoint | HTTP 方法 + 完整路径（含 path param 约定） | 必填 |
| params | 查询参数（key: 说明），无则省略 | 可选 |
| request | 请求体字段映射（从数据行/表单字段到 API 参数） | 必填（无 body 则填 N/A）|
| response | 成功响应结构 + 关键字段说明 | 必填 |
| error | 可预见的业务错误码 + 对应前端行为 | 可选 |

### 3.3 Block C：Permission — 权限约束

> 引用方式：类型定义中声明 `context: Block C`（或分别声明 view / operate）。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| view | 谁可以看到这个组件 | 必填（无约束填"所有人"）|
| operate | 谁可以操作（点击/编辑/提交）| 可选（与 view 相同时省略）|

### 3.4 Block D：Background — 业务背景与决策原因

> 引用方式：类型定义中声明 `background: Block D`。适用于所有类型，可选。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| rationale | **业务原因**——该组件为什么存在，解决什么用户问题，用自然语言描述 | 必填 |
| decisionRef | 决策记录引用（如 `→ decision-log #D003`） | 可选 |
| flowchartRef | 流程图引用（如 `→ design.md §4.1 R001-MENU-MERGE`） | 可选 |
| proposalRef | 功能需求引用（如 `→ F001`） | 可选 |

> **内容规则 - rationale 字段：** 必须包含"为什么"的语义，不能只描述"做什么"。正确："合并入口是因为用户需要根据报备类型判断从哪个入口进入，操作路径长且易出错"。错误："合并两个入口为一个"。

### 3.5 Block E：Refs — 跨引用元数据

> 引用方式：在组件 metadata 中声明 `refs: Block E`。适用于所有类型，可选。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| flowcharts | 关联的流程图 ID 列表（如 `['R001-MENU-MERGE', 'R001-SUBID-DECISION']`） | 可选 |
| designDoc | 关联的设计文档章节（如 `design.md §4.1`） | 可选 |
| decisionLog | 关联的决策记录 ID 列表（如 `['D003', 'D005']`） | 可选 |
| proposalRefs | 关联的功能需求 ID 列表（如 `['F001', 'F003']`） | 可选 |

### 3.6 Block F：Dependency — 跨组件依赖声明

> 引用方式：在组件 blocks 中使用 `{ title: 'Dependency', lines: [...] }`。适用于依赖外部选择器值的组件（如动态列表格）。

#### 3.6.1 简单依赖（1:1）

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| 依赖来源 | 被依赖的组件 Key + 字段名（如 `new-report-alliance 下拉框选中值`） | 必填 |
| 联动规则 | 变化时执行的操作（如 `重新渲染表格` / `清空已填值` / `局部更新`） | 必填 |
| 控制目标 | 被影响的组件 Key + 影响范围（如 `manualInputTable 的参数用途列展开`） | 可选 |

**声明示例：**
```
{ title: 'Dependency', lines: [
  '依赖来源：allianceSelector 选中值 → 决定 manualInputTable 参数用途列展开',
  '联动规则：切换联盟时清空已填参数值，重新渲染表格'
] }
```

#### 3.6.2 依赖链（多级传递）

当依赖关系超过 2 级时，使用 `dependencyChain` 格式声明完整链路：

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| 依赖链路 | 完整链路，用 `→` 连接，每步标注类型 | 必填 |
| 依赖类型 | 各步骤类型：`selector`(选择器) / `filter`(过滤) / `derived`(推导) / `render`(渲染) / `autoGenerate`(自动生成) / `validate`(校验) | 必填 |
| 联动规则 | 链路中每一步的触发行为 | 必填 |

**声明示例：**
```
{ title: 'Dependency', lines: [
  '依赖链路：AllianceSelector → 过滤账号选项 → AllianceAccountSelector → 识别业务线(DM) → renderManualTable → 自动生成 sub_id',
  '依赖类型：selector → filter → selector → derived → render → autoGenerate',
  '联动规则：切换联盟时重置账号选项 → 切换账号时重新识别业务线 → 业务线=DM+SHEIN 时自动生成 sub_id(93260+时间戳)'
] }
```

### 3.7 Block G：BusinessRules — 业务规则声明

> 引用方式：在组件 metadata 中声明 `businessRules: [Block G]`。适用于需要声明跨组件共享的业务规则的场景，如自动生成规则、排重校验、业务线识别规则等。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| ruleId | 规则唯一标识（如 `BR001`） | 必填 |
| scope | 作用范围（哪些组件受影响，如 `manualInputTable.sub_id`） | 必填 |
| condition | 触发条件（如 `联盟=SHEIN AND 业务线=DM`，用自然语言） | 必填 |
| rule | 规则描述（如 `sub_id = "93260" + timestamp`，用自然语言） | 必填 |
| validation | 校验方式（如 `前端排重：generatedSubIds 集合检查` / `后端唯一索引`） | 可选 |

**声明示例：**
```javascript
businessRules: [
  {
    ruleId: 'BR001',
    scope: 'manualInputTable.sub_id',
    condition: '联盟=SHEIN AND 业务线=DM',
    rule: 'sub_id 自动生成，格式为"93260"+时间戳（如 932601712345678901）',
    validation: '前端排重：已生成的 sub_id 存入 Set，不允许重复'
  },
  {
    ruleId: 'BR002',
    scope: 'allianceSelector + allianceAccountSelector → businessLine',
    condition: '每次切换联盟或账号时触发',
    rule: '业务线由联盟+联盟账号共同决定：账号 data-business-line 属性标识 DM/FT/PP',
    validation: '无业务线匹配时默认 DM，需提示用户确认'
  }
]
```

### 3.8 Block H：DataFlow — 跨组件数据流声明

> 引用方式：在父组件或数据流发起方的 blocks 中使用 `{ title: 'DataFlow', lines: [...] }`。适用于需要声明数据在组件间流动路径的场景。

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| 数据流 | 用 `→` 连接数据传递路径，标注数据类型 | 必填 |
| 转换规则 | 数据在传递过程中的转换逻辑 | 必填 |
| 回写规则 | 下游组件数据变化时是否回写上游 | 可选 |

**声明示例：**
```
{ title: 'DataFlow', lines: [
  'AllianceSelector.value(String) → AllianceAccountSelector.options(Array.filter) → 过滤账号选项',
  'AllianceSelector.value + AllianceAccountSelector.businessLine(String) → BusinessLine(derived) → 推导业务线',
  'BusinessLine=DM + Alliance=SHEIN → manualInputTable.sub_id(autoGenerate) → 自动生成 sub_id'
] }
```

### 3.9 嵌套引用规则

当组件 B 是组件 A 的子组件时（如 FormFill 在 EntryDialog 内），B 的共享块定义遵循以下层级：

- **同层共享：** 子组件直接引用父组件的 DialogContext（不重复定义）
- **向上覆盖：** 子组件权限缩小（例如列表中行内操作需额外权限）时，在子组件 Block C 中补充声明，仅声明的字段做 override，未声明的字段向父组件继承
- **跨级禁止：** 不允许子组件引用非直接父级的共享块

---

## 4. 类型模板定义

每个类型模板包含字段列表，每个字段标注：归属、必填等级、内容规则。

### 4.1 T1 DisplayMetric — 数据指标展示

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 触发更新的时机：page load / data change event / manual refresh |
| data | — | 是 | **指标计算规则**——用自然语言描述筛选逻辑，不能出现代码语法 |
| interaction | — | 否 | 点击指标卡的行为描述；无则省略，不写"N/A" |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |
| context | Block C | 视情况 | view 权限不涉及角色区分时可省略 |
| state | — | 是 | **至少覆盖：** normal, loading, error |
| style | — | 否 | 宽/高/间距/圆角/底色/阴影 |

> **内容规则 - data 字段：** 写"只统计 type 字段值为 internal 的流量主"，而非 "count(type=internal)"。

### 4.2 T2 DataList — 列表 + 分页 + 选择

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 加载/刷新列表的时机 |
| columns | — | 是 | 每列：field + label + 渲染规则（枚举映射/格式化/联动）；**支持动态列声明**（见下方 §4.2.1）|
| pagination | — | 是 | 每页条数、页码居中/居左、省略号策略 |
| selection | — | 否 | 选择模式（none / single / multi）、跨页是否保持选择 |
| rowActions | — | 否 | 行内操作按钮 + 触发条件/权限 |
| api | Block B | 是 | 列表接口（含 query 参数约定） |
| context | Block A | 否 | 如果在弹窗内则声明；否则省略 |
| context | Block C | 是 | 数据行级权限差异（不同角色看到不同数据）|
| state | — | 是 | **至少覆盖：** normal, loading, empty, error |
| style | — | 否 | 行高、斑马线/实线边框、hover 高亮色 |
| dependency | Block F | 否 | 如果列数/列内容依赖外部选择器值，需声明依赖关系（见 §4.2.1）|
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

#### 4.2.1 动态列（Dynamic Columns）模式

当表格的列数或列内容依赖外部选择器（如下拉框、RadioGroup）的值时，使用动态列模式。

**声明格式：**

```
固定列：列A(描述)/列B(描述)/列C(描述)
动态列：{概念列名}-{参数名}，按{选择器}展开，列数={选择器各选项对应参数个数}
列数变化：{最小列数}~{最大列数}列
```

**示例：** 参数用途列按联盟展开

```
固定列：报备媒体URL(必填)/报备媒体名称(必填)/出单上限(数字)/出单权重(数字)/状态/备注/操作
动态列：参数用途-{参数名}，按联盟选择器展开
  Awin → 3列：参数用途-clickref, 参数用途-clickref2, 参数用途-extr
  Impact → 2列：参数用途-subId1, 参数用途-sharedid
  PH → 2列：参数用途-subaffiliatedomain, 参数用途-Adref
  CF → 3列：参数用途-UniqueID2, 参数用途-UniqueID3, 参数用途-UniqueID4
  SHEIN → 2列：参数用途-sub_id, 参数用途-soruce_id
  Webgains → 1列：参数用途-origsource
列数变化：未选联盟时0列，最多3列，最少1列
```

##### 4.2.1.1 列级条件行为

当动态列中某列的行为因条件而异时（如特定条件下只读、自动生成），使用列级条件声明：

```
动态列：参数用途-{参数名}，按联盟展开
列级条件：
  - 列: sub_id
    条件: 联盟=SHEIN AND 业务线=DM
    行为: 只读，自动生成（93260+时间戳），排重校验，橙色背景标识
    条件(else): 手动输入，普通输入框
  - 列: soruce_id
    条件: 联盟=SHEIN AND 业务线=DM
    行为: 手动输入（无自动生成）
```

**字段说明：**

| 字段 | 内容规则 | 约束 |
|------|---------|:----:|
| 列 | 动态列的参数名 | 必填 |
| 条件 | 触发特殊行为的条件（自然语言） | 必填 |
| 行为 | 条件满足时该列的表现（输入方式/校验规则/样式） | 必填 |
| 条件(else) | 条件不满足时的默认行为 | 可选，缺省为"手动输入" |

**依赖声明（Dependency block）：** 使用 `Dependency` 块标题声明跨组件依赖关系：

```
{ title: 'Dependency', lines: [
  '依赖来源：{选择器组件Key} → 决定{目标列}展开',
  '联动规则：{切换时清空/保留已填值}，{重新渲染/局部更新}'
] }
```

### 4.3 T3 ActionButton — 单操作触发按钮

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | click / 快捷键 |
| behavior | — | 是 | **单句描述**——打开弹窗 / 跳转页面 / 调用接口 |
| context | Block C | 是 | view + operate 权限 |
| context | Block B | 否 | 如果直接调 API 则声明；否则不出现 |
| dismiss | — | 否 | 按钮本身无 dismiss；若触发弹窗则在弹窗处声明 |
| state | — | 是 | **至少覆盖：** normal, disabled（if 有条件禁用）, loading（if 直接调 API）|
| style | — | 否 | variant（primary/secondary/danger）、size |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

> **设计原则：** ActionButton 本身极简。复杂度包裹在被它打开的弹窗或触发的流程中，不堆在按钮上。

### 4.4 T4 ActionMenu — 多选一操作菜单

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | click → 展开菜单 |
| items | — | 是 | 每项：label, action, variant（danger？）, disabled condition |
| context | Block C | 是 | 谁可以使用这个菜单 |
| dismiss | — | 是 | 点击外部 / ESC / 选中后关闭 |
| state | — | 是 | **至少覆盖：** normal（折叠态）, open（展开态）, disabled（灰色态）|
| style | — | 否 | 触发按钮样式、下拉面板宽度、max-height |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.5 T5 ConfirmAction — 二次确认流程

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 什么操作会触发此确认（引用来源组件）|
| behavior | — | 是 | 确认后执行什么（直接描述业务结果，或引用 APICall）|
| content | — | 是 | icon + title + description + 确认列表摘要 |
| context | Block A | 是 | DialogContext + Block C |
| dismiss | Block A | 是 | 取消 / ESC / 遮罩 → 不执行；确认 → 执行 |
| state | — | 是 | **至少覆盖：** normal, submitting, error |
| style | Block A | 否 | 按钮排列（左取消右确认）、确认按钮颜色 |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.6 T6 FormFill — 表单填写 + 校验 + 提交

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 打开方式（页面加载 / 按钮点击→弹窗 / 行内展开）|
| fields | — | 是 | 见下方字段级子表 |
| api | Block B | 是 | 提交接口 |
| behavior | — | 是 | 提交前校验触发器（blur / submit）、提交后行为（关闭→刷新→Toast）|
| context | Block A | 视情况 | 如果在弹窗中必填 DialogContext |
| context | Block C | 是 | view + operate |
| dismiss | — | 是 | 未保存内容时关闭是否有提示；ESC/遮罩行为与 DialogContext 一致 |
| state | — | 是 | **强制覆盖：** normal, fieldError, submitting, success, apiError |
| style | — | 否 | label 宽度、input 高度、错误提示位置 |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

**fields 字段级子表：**

| 子字段 | 必填 | 内容规则 |
|--------|:----:|---------|
| label | 是 | 展示给用户的文案 |
| type | 是 | input / select / radio / textarea / url / email / password / number |
| placeholder | 否 | 占位文案；无则省略，不填"N/A" |
| required | 是 | true / false |
| validation | 视情况 | required=true 时必填；URL 格式 / 邮箱格式 / 密码长度 / 唯一性校验 |
| options | 否 | type=select 时枚举值列表；边界情况需包含说明和条件规则约定 |
| default | 否 | 预填值及来源（自动生成 / 权限系统 / URL 参数）；明确是否需要用户修改 |
| autoGenerate | 否 | 自动生成规则：生成公式 + 触发条件 + 是否只读 + 排重要求。格式：{公式}，条件：{条件}，只读：{true/false}，排重：{true/false} |
| readonly | 否 | 字段是否只读。true/false，缺省为 false；条件性只读需注明条件 |
| uniqueness | 否 | 排重要求。true/false + 校验范围（前端/后端/双重） |
| condition | 否 | 字段可见/可编辑的触发条件（自然语言描述）；条件不满足时的 fallback 行为 |

### 4.7 T7 ItemSelect — 搜索 + 筛选 + 选择 + 确认

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 打开方式 |
| search | — | 是 | 搜索触发方式（input / focus）、匹配逻辑（case-insensitive contains）|
| filter | — | 否 | 分类筛选条件 |
| selection | — | 是 | 模式（radio / checkbox）+ 选中后是否立即触发行为 |
| preCheck | — | 否 | 确认前校验逻辑（如已认证流量主拦截）|
| confirm | — | 是 | 确认后执行（API 调用 + 页面刷新）|
| api | Block B | 是 | 列表接口 + 提交接口（两个声明）|
| context | Block A | 视情况 | 如果在弹窗中必填 DialogContext |
| context | Block C | 是 | 可选择的条目范围限制 |
| dismiss | Block A | 是 | ESC / 遮罩 / 取消 |
| state | — | 是 | **强制覆盖：** normal, loading, empty, searchEmpty, selected, confirming, error |
| style | Block A | 否 | 列表高度、选中高亮色 |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.8 T8 SearchSelect — 搜索式选择器（子组件）

> **与 T7 的关系：** SearchSelect 是子组件，出现在 FormFill 表单行中或被 ItemSelect / FormFill 复用。它不单独打开弹窗。如果一个弹窗只做"搜索并选择"一件事，用 T7 而非 T8。

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | focus → 加载全部；input → 即时搜索（含 debounce 时长）|
| api | Block B | 是 | 搜索接口 |
| match | — | 是 | 匹配哪些字段 + 匹配模式（partial / prefix）|
| display | — | 是 | 选中后展示格式（如 "{id} | {name}"）|
| callback | — | 是 | 选中后触发（onSelect → 填充目标字段）|
| dismiss | — | 是 | click 外部 / ESC / 选中 → 收起下拉 |
| state | — | 是 | **至少覆盖：** idle, focus, searching, selected, empty, error |
| style | — | 否 | 下拉 max-height、overflow-y、选中高亮色 |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.9 T9 Toast — 瞬态反馈

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 什么操作成功后/失败后触发（引用来源组件的成功/fail callback）|
| behavior | — | 是 | showToast(message, type) → 自动隐藏（不支持手动关闭）|
| types | — | 是 | 枚举：success / error / info；说明各类型的使用场景 |
| timing | — | 是 | 显示时长 + 入场/出场动效类型及时长 |
| placement | — | 是 | 屏幕位置（如"顶部右侧 fixed"）|
| state | — | 是 | show / hidden |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.10 T10 StatusPlaceholder — 空 / 加载 / 错误占位

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | 何时显示（数据为空 / API 失败 / 加载中）|
| behavior | — | 是 | 每种状态展示什么 + 可操作按钮（if any）|
| content | — | 是 | 每种状态：icon, title, description, actionButton |
| dismiss | — | 否 | 数据加载成功 → 替换为正常内容（非手动关闭）|
| state | — | 是 | empty / loading / error（根据触发条件区分）|
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

### 4.11 T11 PageInfo — 页面辅助说明

| 字段 | 归属 | 必填 | 内容规则 |
|------|------|:----:|---------|
| trigger | — | 是 | click ⓘ → toggle 气泡 |
| content | — | 是 | 标题 + 正文文案 |
| placement | — | 是 | 气泡箭头指向位置 + 气泡框宽度 |
| dismiss | — | 是 | click 外部 → 关闭 |
| responsive | — | 否 | ≤768px 时宽度收窄 + left 偏移防溢出 |
| state | — | 是 | hidden / visible |
| background | Block D | 否 | 见 §3.4 Block D 内容规则 |

---

## 5. 嵌套关系规则

### 5.1 嵌套声明

在实例化注释时，嵌套关系通过 `context` 字段声明：

```yaml
# 实例化示例：添加已有流量主弹窗
metadata:
  key: addExisting
  type: T7 ItemSelect
  context:
    dialog: DialogContext  # 引用共享块 A

# 实例化示例：创建流量主表单
metadata:
  key: createNew
  type: T6 FormFill
  context:
    dialog: DialogContext  # 引用共享块 A
    components:
      - key: personnelSearch
        type: T8 SearchSelect
        context: {}  # DialogContext 继承父级，不重复定义
```

### 5.2 继承规则

- **DialogContext 继承：** 子组件不声明 DialogContext → 隐式使用父组件的 DialogContext
- **Permission 覆盖：** 子组件可单独声明 Block C（缩小权限范围），仅声明的字段覆盖父级；未声明的字段向父组件继承
- **跨级禁止：** 不允许子组件引用非直接父级的共享块。如需求需要跨级引用，说明组件树设计不合理，应重构

### 5.3 影响范围

当父组件标注为"修改"时，所有嵌套的子组件自动标注为"受影响需验证"。这是可维护性的基本机制。

---

## 6. 内容规则总则

所有字段的注释内容必须遵守以下规则：

### 6.1 语言规范

- **使用产品语言：** 描述用户可感知的行为和业务规则，不使用实现语言
  - 正确："仅统计 type 字段值为 internal 的流量主"
  - 错误："count(type=internal AND status=active)"
  - 正确："输入文字实时匹配流量主账号和名称"
  - 错误："input → filter by name/publisherId (case-insensitive)"
- **使用完整陈述句：** 不使用碎片化的关键词短语
  - 正确："点击外部或按下 ESC 键关闭弹窗"
  - 错误："click outside / ESC close"

### 6.2 精度规范

- **禁止模糊范围词：** 不使用"可能"、"应该"、"酌情"等模糊词——每个声明必须是确定的
- **枚举值全列举：** select 的选项全列出，不使用"等"、"..."
- **边界说明：** 数字类型的 min/max 显式标注

### 6.3 完整性规范

- **不留占位符：** 不允许 `{占位符}`、`{示例}` 等未替换文本
- **不写 "N/A"：** 某字段对当前实例不适用时直接省略该字段，不写 "N/A" 或"不适用"
- **不跨字段重复：** 同一信息只出现一次，引用使用 `→ 见 T6.FieldX`

### 6.4 可追溯规范

- 每条 behavior 如果对应 proposal 的 F00X，在括号内标注：`添加成员（F002）`
- 每条 API 声明标注对应后端接口的文档来源（如有）

### 6.5 内联展示格式规则

当注释以内联模式展示时，遵循以下额外规则：

| 规则 | 说明 |
|------|------|
| **字段名使用中文标签** | Trigger → 触发条件，Behavior → 行为描述，State → 状态，Dismiss → 关闭条件 |
| **单行不超过 60 字符** | 超长内容用 `├──` 树形结构换行 |
| **代码片段用 `inline code`** | API 路径、字段名、参数名使用反引号包裹 |
| **状态列表用斜杠分隔** | 如 `normal / loading / empty / error` |
| **省略非必要字段** | 对当前组件无意义的字段直接省略，不展示空字段占位 |

**渲染优先级（由类型决定）：**
每类组件在内联展示时，字段按特定顺序渲染（见 `html-annotation-system.md` §2.2），而非按 Annotation Block 中的书写顺序。

### 6.6 字段级注释规则

当组件包含多个字段时，除组件级注释外，可为每个字段添加独立注释：

**适用场景：**
- 统计卡片的每个指标值（定义、权限、计算规则）
- 表格的每个列头（格式、来源、校验规则）
- 表单的每个输入项（校验规则、枚举值、占位文案）

**字段级注释内容规则：**
- 字段级注释聚焦该字段本身，不重复组件级内容
- 每个字段必须包含 `desc` 字段，用一句话描述该字段的含义和用途，用于需求评审阶段快速理解
- 统计字段：包含 Definition（定义）、Permission（权限）、Calculation（计算规则，如适用）
- 表格列：包含 Format（格式约束）、Source（数据来源）、Color（颜色语义，如适用）
- 表单字段：包含 Validation（校验规则）、Options（枚举值）、Default（默认值）

**触发方式：** 字段值/标签旁显示 ℹ️ 小图标按钮，点击打开弹窗展示字段级注释。

### 6.7 内容规则 ID 映射表

每条内容规则分配唯一 ID（R001-R020），用于在验证脚本中程序化引用。规则按类别分组：

| ID | 类别 | 规则描述 | 适用范围 |
|----|------|---------|---------|
| R001 | 语言 | 使用产品语言描述业务规则，不使用代码语法 | 所有 data / calculation 字段 |
| R002 | 语言 | 使用完整陈述句，不使用碎片化关键词短语 | 所有 behavior / dismiss 字段 |
| R003 | 精度 | 不使用"可能"、"应该"、"酌情"等模糊词 | 所有字段 |
| R004 | 精度 | 枚举值全列举，不使用"等"、"..." | 所有 select / options 字段 |
| R005 | 精度 | 数字类型显式标注 min/max 边界 | 所有 number 类型字段 |
| R006 | 完整性 | 不留 `{占位符}`、`{示例}` 等未替换文本 | 所有字段 |
| R007 | 完整性 | 某字段不适用时直接省略，不写 "N/A" 或"不适用" | 所有字段 |
| R008 | 完整性 | 同一信息只出现一次，引用使用 `→ 见` 语法 | 所有字段 |
| R009 | 可追溯 | behavior 对应 proposal 的 F00X 时标注引用 | behavior 字段 |
| R010 | 可追溯 | API 声明标注对应后端接口文档来源 | api 字段 |
| R011 | 字段级 | 字段级注释聚焦该字段本身，不重复组件级内容 | fields 子字段 |
| R012 | 字段级 | 每个字段必须包含 desc 字段 | fields 子字段 |
| R013 | 状态 | state 覆盖 >= 模板要求的最低覆盖量 | state 字段 |
| R014 | 状态 | 状态名称使用模板定义的标准化名称 | state 字段 |
| R015 | 嵌套 | 子组件不声明 DialogContext → 隐式使用父级 | context 字段 |
| R016 | 嵌套 | 子组件权限仅声明的字段覆盖父级，未声明继承 | context 字段 |
| R017 | 内联 | 单行不超过 60 字符，超长用树形结构换行 | 内联模式 |
| R018 | 内联 | 字段名使用中文标签（Trigger → 触发条件） | 内联模式 |
| R019 | 背景 | rationale 必须包含"为什么"语义，不能只描述"做什么" | background 字段 |
| R020 | 背景 | 决策记录引用格式：`→ decision-log #D00X` | background 字段 |

---

## 6.8 跨类型共享字段定义表

以下字段在多个类型模板中出现，使用统一的定义和内容规则。当在具体类型模板中无特殊说明时，以本表为准。

### 6.8.1 触发与行为

| 字段 | 定义 | 使用类型 | 关键内容规则 |
|------|------|---------|:-----------:|
| trigger | **触发条件**：什么用户操作或系统事件导致该组件激活/展示/刷新 | ALL (T1-T11) | 使用产品语言，完整陈述句；不写代码语法 |
| behavior | **行为描述**：触发后的完整操作序列，含预期结果 | T3, T5, T9, T10 | 标注 F00X 功能需求引用（R009） |
| dismiss | **关闭方式**：用户如何退出该组件，含多途径 | T4, T6, T7, T11 | 至少声明一种：ESC / 遮罩层 / 关闭按钮 |
| interaction | **交互行为**：组件上的非主要交互（如点击卡片、悬停提示） | T1, T2 (rowActions) | 无模糊词，完整描述触发→结果链路 |

### 6.8.2 数据与内容

| 字段 | 定义 | 使用类型 | 关键内容规则 |
|------|------|---------|:-----------:|
| data | **数据指标**：展示的数据及其计算规则，使用自然语言描述 | T1 | 禁止代码语法（R001），完整陈述句（R002） |
| columns | **列定义**：每列的 field 键名 + label 展示名 + 渲染规则 | T2 | 完整列举所有列，不省略 |
| pagination | **分页策略**：每页条数、页码位置、省略号/跳转策略 | T2 | 数字标注 min/max 范围（R005） |
| content | **内容描述**：组件展示的文本/图标/说明内容 | T5, T10, T11 | 完整陈述句，无模糊词 |
| fields | **表单字段**：每个字段的 name/type/校验规则/placeholder | T6 | 每个字段必须包含 desc（R012） |
| items | **菜单项**：每个菜单项的 label + 行为 + 条件 | T4 | 完整列举所有项，不写"等"（R004） |
| selection | **选择模式**：none / single / multi，跨页保持策略 | T2, T7 | 明确跨页是否保持选择 |
| search | **搜索行为**：搜索字段、触发方式（input/debounce/button） | T7, T8 | 含搜索字段列表和触发时机 |

### 6.8.3 接口与上下文

| 字段 | 归属 | 定义 | 使用类型 | 关键内容规则 |
|------|------|------|---------|:-----------:|
| api | Block B | **后端接口定义**：endpoint/params/request/response/error | T2, T6, T7, T8 | 标注接口来源（R010），含完整 endpoint 路径 |
| context | Block A | **弹窗上下文**：placement/timing/dismiss/z-index | T2, T6, T7 (子组件) | 子组件隐式使用父级，不重复声明（R015） |
| context | Block C | **权限约束**：view/operate 角色可见性 | ALL | view 必填，无约束填"所有人" |

### 6.8.4 状态

| 字段 | 定义 | 使用类型 | 关键内容规则 |
|------|------|---------|:-----------:|
| state | **状态机**：组件在不同状态下的展示和行为 | ALL (T1-T11) | 覆盖模板要求的最低状态集（R013），使用标准化状态名（R014） |

**衍生状态（Derived State）：**

衍生状态是指组件状态不由用户直接操作产生，而是依赖上游组件值或外部条件自动推导的状态。典型场景：

- 选择器 A 的值变化 → 组件 B 的选项列表自动过滤（filtered state）
- 选择器 A 的值 + 选择器 B 的值 → 业务线自动识别（derived value）
- 业务线 = DM + 联盟 = SHEIN → sub_id 字段自动生成（auto-generated state）

衍生状态声明格式（在 state 定义中标记 `_derived: true` 和依赖条件）：

```javascript
state: {
  normal: { _derived: false, desc: "用户可操作" },
  filtered: { _derived: true, dependsOn: "AllianceSelector.value", desc: "选项已按联盟过滤" },
  autoGenerated: { _derived: true, dependsOn: "businessLine + alliance", desc: "sub_id 已自动生成" }
}
```

衍生状态不参与用户操作测试，但需验证依赖链正确性。

### 6.8.5 视觉与布局

| 字段 | 定义 | 使用类型 | 关键内容规则 |
|------|------|---------|:-----------:|
| style | **视觉样式**：布局/色彩/尺寸/动效 | T1-T8 | 不写占位符（R006），不写"N/A"（R007） |
| placement | **位置**：组件出现在视口中的位置 | T9, T11 | 含定位坐标或参照物 |
| timing | **时序**：入场/出场动效及时长 | T9 | 含时长和动效名称 |

### 6.8.6 元数据

| 字段 | 归属 | 定义 | 使用类型 | 关键内容规则 |
|------|------|------|---------|:-----------:|
| background | Block D | **业务背景**：rationale + decisionRef + flowchartRef + proposalRef | ALL (可选) | rationale 含"为什么"语义（R019），引用格式正确（R020） |
| refs | Block E | **跨引用元数据**：flowcharts + designDoc + decisionLog + proposalRefs | ALL (可选) | 引用 ID 与提案/设计文档一致 |

### 6.8.7 使用方式

1. 为组件选择类型模板后，按本表填充各字段内容
2. 字段定义以具体类型模板中的说明为准（有特殊约束时），本表提供通用定义
3. 内容规则冲突时，具体类型模板 > 本表 > 内容规则 ID 映射表

---

## 6.9 注释与设计文档双向同步

注释与设计文档（proposal.md / design.md）之间存在双向引用关系。当一方变更时，另一方应同步更新。

### 6.9.1 前向同步（注释 → 设计文档）

当 ANNOTATIONS 中的字段变更时，影响的设计文档章节：

| 变更字段 | 影响的设计文档章节 | 同步内容 |
|---------|------------------|---------|
| trigger / behavior / dismiss | 交互流程说明 | 更新触发条件和操作序列 |
| state | 状态定义 | 更新状态机定义和状态流转图 |
| api | 接口定义 | 更新 endpoint / params / response |
| columns / fields / data | 数据结构 | 更新字段定义和渲染规则 |
| context (Block C) | 权限说明 | 更新角色权限矩阵 |
| background | 需求背景 | 更新 rationale 和决策记录引用 |
| style | 视觉规范 | 更新样式定义 |

### 6.9.2 后向同步（设计文档 → 注释）

当设计文档中的以下内容变更时，ANNOTATIONS 应同步更新：

| 设计文档变更 | 影响注释字段 | 检查方式 |
|------------|------------|---------|
| 接口 endpoint 变更 | api 块 | 人工核对 + 评审 |
| 字段新增/删除 | columns / fields / data | 人工核对 |
| 状态新增/合并 | state | 人工核对 |
| 权限变更 | context (Block C) | 评审标记 |
| 需求变更 | background / trigger / behavior | 需求变更通知 |

### 6.9.3 同步工作流

```text
Step 1 — 变更检测
  ┌─ 注释变更 → 标记影响范围（对照 §6.9.1）
  └─ 设计文档变更 → 标记影响范围（对照 §6.9.2）

Step 2 — 差异评估
  ┌─ 简单差异（字段值修改） → 直接同步
  └─ 复杂差异（结构变更）  → 标记需人工评审

Step 3 — 同步执行
  ┌─ 直接同步 → 应用变更，更新引用版本号
  └─ 人工评审 → 创建评审任务，附带差异摘要

Step 4 — 验证
  ┌─ 运行 validate-annotations.js 确认结构完整
  └─ 人工确认设计文档与注释一致
```

### 6.9.4 同步标记

在 ANNOTATIONS 中使用 `_sync` 元数据字段记录同步状态：

```javascript
window.ANNOTATIONS = {
  "C00": {
    type: "T4",
    // ... 其他字段
    _sync: {
      designDoc: "design.md",        // 关联的设计文档
      designVersion: "v2.3",         // 上次同步时设计文档版本
      lastSync: "2026-07-16",        // 上次同步日期
      pendingChanges: []             // 待同步的变更列表
    }
  }
};
```

---

## 6.10 组件依赖声明

组件之间存在父子/嵌套关系时，需要显式声明依赖，确保共享块继承和状态联动正确。

### 6.10.1 依赖类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **parent** | 子组件声明其父组件 ID | FormFill 内的 SearchSelect 声明 parent: "C03" |
| **contains** | 父组件声明其包含的子组件列表 | FormFill 声明 contains: ["C03_SearchSelect"] |
| **peer** | 同级组件之间的依赖关系 | 两个按钮分别打开不同弹窗 |
| **refers** | 跨组件引用，非父子关系 | 列表中的操作按钮引用弹窗 ID |

### 6.10.2 声明格式

在组件 ANNOTATIONS 中使用 `dependencies` 字段：

```javascript
window.ANNOTATIONS = {
  "C03_Dialog": {
    type: "T6",           // FormFill
    label: "新建透明度报备",
    dependencies: {
      contains: ["C03_AllianceSelect", "C03_MediaUrlInput"],  // 子组件列表
      peers: []                                                 // 同级依赖
    }
  },
  "C03_AllianceSelect": {
    type: "T7",           // ItemSelect
    label: "联盟选择器",
    dependencies: {
      parent: "C03_Dialog",           // 父组件 ID
      peers: ["C03_MediaUrlInput"]    // 同级组件
    }
  }
};
```

### 6.10.3 继承规则

当子组件声明 `parent` 后，以下字段自动继承父组件：

| 继承字段 | 继承规则 |
|---------|---------|
| context (Block A) | 子组件不声明 → 直接使用父级的 DialogContext（R015） |
| context (Block C) | 子组件不声明 → 继承父级；子组件声明部分字段 → 仅覆盖声明的字段，未声明继承（R016） |
| background | 不继承，子组件独立声明 |
| refs | 不继承，子组件独立声明 |

### 6.10.4 依赖图验证

- 不允许循环依赖（A → B → A）
- 不允许跨级引用（子组件引用非直接父级的共享块）
- 不允许悬空引用（parent 指向不存在的组件 ID）
- 验证方式：`scripts/validate-annotations.js` 的依赖图检查

---

## 7. 与 L1/L2/L3 框架的映射

类型化模板不替代 L1/L2/L3——它们解决不同的问题：

| 维度 | L1/L2/L3 | 类型化模板 |
|------|----------|-----------|
| 解决的问题 | 注释深度（该写多详细） | 注释内容（该写什么字段） |
| 选择依据 | 组件复杂度 | 组件交互模式 |
| 覆盖范围 | 全局通用 | 类型特有 |
| 内容质量控制 | 无 | 有（内容规则） |

**使用方式：** 两种框架叠加使用：

1. 先识别组件交互模式 → 选择类型模板（T1-T11）
2. 根据复杂度选择注释等级（L1/L2/L3）
3. 类型模板决定字段结构，注释等级决定字段深度

| 等级 | 对类型模板的叠加要求 |
|------|-------------------|
| L1 | 仅填充 trigger / behavior / dismiss + 必填字段；state 覆盖 2 种即可 |
| L2 | 填充全部必填字段 + 可选字段的大部分；state 覆盖全 |
| L3 | L2 + responsive + accessibility + i18n |

### 7.1 注释等级标签可配置（Level Label Configurability）

L1/L2/L3 是内部等级标识，在输出时可用更具可读性的标签替代。在 SKILL.md 的 Session State 中声明 `levelLabels` 映射：

```javascript
// 默认标签
levelLabels: { L1: "基础", L2: "详细", L3: "完整" }

// 示例：按项目阶段定制
levelLabels: { L1: "MVP", L2: "本次需求", L3: "完整" }

// 示例：按团队角色定制
levelLabels: { L1: "前端注释", L2: "全量注释", L3: "含无障碍" }
```

使用方式：
1. 在 SKILL.md 的 `sessionState.levelLabels` 中声明
2. 输出时，所有界面显示使用配置标签替代 L1/L2/L3
3. 内部验证和 schema 仍使用 L1/L2/L3 标识
4. 缺省回退：L1 → "基础", L2 → "详细", L3 → "完整"

---

## 8. 质量验证方法

### 8.1 逐类型验证表

生成 HTML 注释后，逐条验证：

```
[ ] 每个实例的 metadata.type 指向已定义的类型（T1-T11）
[ ] 必填字段全部填充（markdown 无空白）
[ ] 必填字段的内容遵守对应内容规则（无代码语言、无模糊词、无"N/A"）
[ ] state 覆盖 >= 模板要求的最低覆盖量
[ ] 嵌套组件的 context 链路完整（子→父可追溯）
[ ] 修改父组件时标记了影响范围
```

### 8.2 跨组件一致性验证

```
[ ] 同类型的不同实例，字段填充深度一致（没有 A 写了 5 个 state、B 只写了 2 个）
[ ] 同页面或同系统在同样交互模式使用同样类型模板
[ ] 同一字段在不同注释中表述一致（例："媒介主管"不在 A 叫"主管"、B 叫"管理员"）
```

### 8.3 HTML trigger 放置验证

```
[ ] 每个组件实例有至少一个 trigger 按钮
[ ] trigger 按钮在组件的可视边界内，间隔 ≤ 8px（视觉上"贴紧"）
[ ] trigger 按钮的 data-annot 值与 ANNOTATIONS key 一致

### 内联锚点验证（双模式新增）

```
[ ] 内联注释容器紧跟在组件内容下方（视觉上"贴紧"），间隔 ≤ 4px
[ ] 内联注释使用虚线分隔 + 左侧色块 + 背景色区分，与组件区域视觉可区分
[ ] 内联注释折叠态使用 `▶` 图标，展开态使用 `▼` 图标
[ ] 内联注释展开时，组件级 📋 按钮标记为 active 状态
[ ] 内联注释和侧边面板的 active 状态同步（一方展开另一方也标记 active）
```

### 字段级触发验证（v2 新增）

```
[ ] 字段级 ℹ️ 按钮在字段值/标签的可视边界内，间距 ≤ 4px
[ ] 字段级 ℹ️ 按钮使用半透明样式，hover 时变为不透明
[ ] 字段级 ℹ️ 按钮的 data-annot-field 值与 ANNOTATIONS 的 fields/columns key 一致
[ ] 字段级注释弹窗不包含组件级完整内容，仅包含该字段专用内容
```

---

## 9. 使用流程集成

类型化模板在 spec-analyze Full 路径中的位置：

```
Step 5F 设计呈现（逐节批准）
  ↓ 批准 → S3
Step 6F 组件枚举 —— 列出页面所有交互组件及其类型（T1-T11）
  ↓ 检查：是否有遗漏组件？类型选择是否合理？→ S3a
Step 7F 类型模板填充 —— 按类型模板逐组件填充注释
  ↓ 检查：必填字段是否完整？内容规则是否遵守？
Step 8F 输出生成（proposal + design + tasks + HTML 注释）
  ↓ → S3b
Step 9F HTML 注释验证（条件性，仅用户同意内建时）
  ↓ → S3c
Step 10F 质量验证 —— 运行 §8 验证表
  ↓
用户审阅
```

> **关键门禁（S3a）：** Step 6F 的组件枚举未完成并通过检查 → 禁止进入 Step 7F。
> 组件枚举是质量的基础——遗漏组件在此门禁是最后一道线。

### 9.1 Back-propagation 同步机制

当注释在输出生成或验证阶段（Step 8F-9F）被发现与设计不一致而做了修正时，变更必须**反向同步**回 design.md。

**触发条件：** HTML 注释生成或质量验证阶段（Step 8F-9F）发现以下任一情况：

- 发现某组件缺失（设计阶段遗漏）→ 补充到 design.md §2 + tasks.md
- 发现 behavior/state/permission 描述不准确 → 修正 design.md 对应 Annotation Block
- 发现字段校验规则不完整 → 补充到 design.md 对应注释块 + Field Specification Table
- 发现弹窗样式/动效与设计不一致 → 修正 design.md 的 style/timing 字段

**执行方式：**

1. 在 HTML 注释中做的每个修正，同步检查 design.md 中是否存在同一信息的描述
2. 如果存在 → 用同样的修正更新 design.md
3. 如果不存在 → 在 design.md 中补充
4. 标记变更范围：`[BP] 源自 HTML 注释修正 — {日期}`，便于追溯

**禁止规则：**

- 不允许只修正 HTML 注释而不更新 design.md（导致引用链断裂）
- 不允许只更新 design.md 而不通知 tasks.md 的引用变更（如果有）
- 不允许绕过 back-propagation 直接进入用户审阅

---

## 10. 实例：R001 组件枚举

```
页面：内部流量主管理

1. 统计卡片区（T1 DisplayMetric）
   - 内部流量主数卡片
   - 总流量主数卡片
   - 活跃流量主数卡片

2. 操作工具栏（T3 ActionButton + T4 ActionMenu）
   - "添加已有流量主" 按钮 → 打开 T7 ItemSelect（复用 T8 SearchSelect）
   - "分配内部流量主" 按钮 → 打开 T6 FormFill（嵌套 T8 SearchSelect）
   - "添加媒体" 按钮 → 打开 T6 FormFill
   - "批量操作" 下拉菜单（T4 ActionMenu）→ 触发 T5 ConfirmAction

3. 流量主列表（T2 DataList + T5 ConfirmAction）
   - 主表格（含选择、分页、行内操作）
   - 行内"删除" → 触发 T5 ConfirmAction

4. 页面标题（T11 PageInfo）
   - ⓘ 说明气泡

5. Detail 页
   - 详情头部信息（T1 DisplayMetric + T3 ActionButton）
   - 编辑表单（T6 FormFill）
   - 媒体管理列表（T2 DataList）
   - 备注编辑器（T6 FormFill — 单字段版）
   - 操作日志（T2 DataList — 只读）
   - 转让按钮（T3 ActionButton → 打开 T6 FormFill）

6. Toast 通知（T9 Toast）— 全局 1 次定义
7. 状态占位（T10 StatusPlaceholder）— 全局 1 次定义
```

---

## 附录 A：类型定义总表

| ID | 名称 | 共享块引用 | 最低 state 覆盖 | 最小注释等级 |
|----|------|-----------|:-------------:|:----------:|
| T1 | DisplayMetric | Block C（可选）+ Block D（可选） | normal, loading, error | L1 |
| T2 | DataList | Block B + Block C + Block A（可选）+ Block D（可选） | normal, loading, empty, error | L2 |
| T3 | ActionButton | Block C + Block B（可选）+ Block D（可选） | normal, disabled, loading | L1 |
| T4 | ActionMenu | Block C + Block D（可选） | normal, open, disabled | L2 |
| T5 | ConfirmAction | Block A + Block C + Block D（可选） | normal, submitting, error | L2 |
| T6 | FormFill | Block A（可选）+ Block B + Block C + Block D（可选） | normal, fieldError, submitting, success, apiError | L2 |
| T7 | ItemSelect | Block A（可选）+ Block B + Block C + Block D（可选） | normal, loading, empty, searchEmpty, selected, confirming, error | L2 |
| T8 | SearchSelect | Block B + Block D（可选） | idle, focus, searching, selected, empty, error | L2 |
| T9 | Toast | Block D（可选） | show, hidden | L1 |
| T10 | StatusPlaceholder | Block D（可选） | empty, loading, error | L1 |
| T11 | PageInfo | Block D（可选） | hidden, visible | L1 |

---

## 附录 B：JSON Schema 定义（v2.3）

> 本附录定义类型模板的 JSON Schema，用于程序化验证 ANNOTATIONS 数据结构。适用于 pre-commit hook、CI 门禁、编辑器插件等场景。

### 共享块 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "BlockA_DialogContext": {
      "type": "object",
      "description": "弹窗上下文",
      "properties": {
        "placement": { "type": "string", "description": "居中定位 + 宽度（px 或百分比）" },
        "timing": { "type": "string", "description": "入场/出场动效及时长，默认 200ms slideUp" },
        "dismiss": { "type": "string", "description": "ESC / 遮罩层 / 关闭按钮" },
        "z-index": { "type": "integer", "description": "层叠层级，默认 1000" }
      },
      "required": ["placement", "dismiss"]
    },
    "BlockB_APICall": {
      "type": "object",
      "description": "后端交互",
      "properties": {
        "endpoint": { "type": "string", "description": "HTTP 方法 + 完整路径" },
        "params": { "type": "object", "description": "查询参数 key: 说明", "additionalProperties": { "type": "string" } },
        "request": { "type": "string", "description": "请求体字段映射" },
        "response": { "type": "string", "description": "成功响应结构 + 关键字段说明" },
        "error": { "type": "string", "description": "可预见的业务错误码 + 对应前端行为" }
      },
      "required": ["endpoint", "request", "response"]
    },
    "BlockC_Permission": {
      "type": "object",
      "description": "权限约束",
      "properties": {
        "view": { "type": "string", "description": "谁可以看到这个组件" },
        "operate": { "type": "string", "description": "谁可以操作" }
      },
      "required": ["view"]
    },
    "BlockD_Background": {
      "type": "object",
      "description": "业务背景与决策原因",
      "properties": {
        "rationale": { "type": "string", "description": "业务原因——该组件为什么存在" },
        "decisionRef": { "type": "string", "description": "决策记录引用" },
        "flowchartRef": { "type": "string", "description": "流程图引用" },
        "proposalRef": { "type": "string", "description": "功能需求引用" }
      },
      "required": ["rationale"]
    },
    "BlockE_Refs": {
      "type": "object",
      "description": "跨引用元数据",
      "properties": {
        "flowcharts": { "type": "array", "items": { "type": "string" }, "description": "流程图 ID 列表" },
        "designDoc": { "type": "string", "description": "设计文档章节" },
        "decisionLog": { "type": "array", "items": { "type": "string" }, "description": "决策记录 ID 列表" },
        "proposalRefs": { "type": "array", "items": { "type": "string" }, "description": "功能需求 ID 列表" }
      }
    },
    "BlockF_Dependency": {
      "type": "object",
      "description": "跨组件依赖声明（v2.3 增强：支持简单依赖和依赖链）",
      "properties": {
        "依赖链路": { "type": "string", "description": "多级依赖链描述，箭头分隔" },
        "依赖类型": { "type": "string", "description": "selector/filter/derived/render/autoGenerate/validate" },
        "联动规则": { "type": "string", "description": "联动行为描述" },
        "控制目标": { "type": "string", "description": "被控制的组件名" },
        "依赖来源": { "type": "string", "description": "依赖的组件名" }
      }
    },
    "BlockG_BusinessRules": {
      "type": "array",
      "description": "业务规则声明（v2.3 新增）",
      "items": {
        "type": "object",
        "properties": {
          "ruleId": { "type": "string", "description": "规则唯一标识，如 BR001" },
          "scope": { "type": "string", "description": "规则适用范围" },
          "condition": { "type": "string", "description": "触发条件" },
          "rule": { "type": "string", "description": "规则描述" },
          "validation": { "type": "string", "description": "校验方式" }
        },
        "required": ["ruleId", "scope", "condition", "rule"]
      }
    },
    "BlockH_DataFlow": {
      "oneOf": [
        {
          "type": "array",
          "description": "跨组件数据流声明（v2.3 新增）",
          "items": {
            "oneOf": [
              { "type": "string", "description": "数据流路径描述，箭头分隔" },
              {
                "type": "object",
                "properties": {
                  "from": { "type": "string", "description": "数据来源" },
                  "to": { "type": "string", "description": "数据目标" },
                  "transform": { "type": "string", "description": "转换规则" }
                }
              }
            ]
          }
        },
        {
          "type": "object",
          "description": "数据流对象格式"
        }
      ]
    },
    "DerivedState": {
      "type": "object",
      "description": "衍生状态（v2.3 新增）",
      "properties": {
        "_derived": { "const": true, "description": "标记为衍生状态" },
        "dependsOn": { "type": "string", "description": "依赖的上游组件/值" },
        "desc": { "type": "string", "description": "状态描述" }
      },
      "required": ["_derived", "desc"]
    },
    "StateValue": {
      "oneOf": [
        { "type": "string", "description": "状态描述字符串" },
        { "$ref": "#/definitions/DerivedState" }
      ]
    }
  }
}
```

### Annotation Block Schema

```json
{
  "definitions": {
    "AnnotationBlock": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "块标题" },
        "lines": { "type": "array", "items": { "type": "string" }, "description": "块内容行" }
      },
      "required": ["title", "lines"]
    },
    "FieldAnnotation": {
      "type": "object",
      "properties": {
        "label": { "type": "string", "description": "字段标签" },
        "desc": { "type": "string", "description": "字段含义和用途" },
        "blocks": { "type": "array", "items": { "$ref": "#/definitions/AnnotationBlock" } },
        "autoGenerate": { "type": "string", "description": "v2.3 自动生成规则：生成公式 + 触发条件" },
        "readonly": { "type": ["boolean", "string"], "description": "v2.3 是否只读，支持条件性字符串" },
        "uniqueness": { "type": ["boolean", "string"], "description": "v2.3 排重要求及校验范围" },
        "condition": { "type": "string", "description": "v2.3 字段可见/可编辑的触发条件" }
      },
      "required": ["label", "desc"]
    }
  }
}
```

### 类型模板 Schema

> 所有类型模板的 `level` 字段接受字符串类型，支持自定义标签（如"基础/本次需求/完整"）。
> 所有类型模板的 `state` 字段支持字符串和衍生状态（`_derived` + `dependsOn`）两种格式。
> 新增 `businessRules`（Block G）和 `dataFlow`（Block H）可选字段。

#### T1 DisplayMetric

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T1" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "fields": { "type": "object", "additionalProperties": { "$ref": "#/definitions/FieldAnnotation" } },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "loading": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "loading", "error"]
    },
    "context": { "$ref": "#/definitions/BlockC_Permission" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state"]
}
```

#### T2 DataList

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T2" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "fields": { "type": "object", "additionalProperties": { "$ref": "#/definitions/FieldAnnotation" } },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "loading": { "$ref": "#/definitions/StateValue" },
        "empty": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "loading", "empty", "error"]
    },
    "api": { "$ref": "#/definitions/BlockB_APICall" },
    "context": { "oneOf": [
      { "$ref": "#/definitions/BlockA_DialogContext" },
      { "$ref": "#/definitions/BlockC_Permission" }
    ] },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "dependency": { "$ref": "#/definitions/BlockF_Dependency" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "api"]
}
```

#### T3 ActionButton

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T3" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "disabled": { "$ref": "#/definitions/StateValue" },
        "loading": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal"]
    },
    "context": { "$ref": "#/definitions/BlockC_Permission" },
    "api": { "$ref": "#/definitions/BlockB_APICall" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "context"]
}
```

#### T4 ActionMenu

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T4" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "open": { "$ref": "#/definitions/StateValue" },
        "disabled": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "open", "disabled"]
    },
    "context": { "$ref": "#/definitions/BlockC_Permission" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "dependency": { "$ref": "#/definitions/BlockF_Dependency" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "context"]
}
```

#### T5 ConfirmAction

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T5" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "submitting": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "submitting", "error"]
    },
    "context": { "allOf": [
      { "$ref": "#/definitions/BlockA_DialogContext" },
      { "$ref": "#/definitions/BlockC_Permission" }
    ] },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "context"]
}
```

#### T6 FormFill

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T6" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "fields": { "type": "object", "additionalProperties": { "$ref": "#/definitions/FieldAnnotation" } },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "fieldError": { "$ref": "#/definitions/StateValue" },
        "submitting": { "$ref": "#/definitions/StateValue" },
        "success": { "$ref": "#/definitions/StateValue" },
        "apiError": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "fieldError", "submitting", "success", "apiError"]
    },
    "api": { "$ref": "#/definitions/BlockB_APICall" },
    "context": { "$ref": "#/definitions/BlockC_Permission" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "dependency": { "$ref": "#/definitions/BlockF_Dependency" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "api", "context"]
}
```

#### T7 ItemSelect

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T7" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "normal": { "$ref": "#/definitions/StateValue" },
        "loading": { "$ref": "#/definitions/StateValue" },
        "empty": { "$ref": "#/definitions/StateValue" },
        "searchEmpty": { "$ref": "#/definitions/StateValue" },
        "selected": { "$ref": "#/definitions/StateValue" },
        "confirming": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["normal", "loading", "empty", "searchEmpty", "selected", "confirming", "error"]
    },
    "api": { "$ref": "#/definitions/BlockB_APICall" },
    "context": { "$ref": "#/definitions/BlockC_Permission" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "api", "context"]
}
```

#### T8 SearchSelect

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T8" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "idle": { "$ref": "#/definitions/StateValue" },
        "focus": { "$ref": "#/definitions/StateValue" },
        "searching": { "$ref": "#/definitions/StateValue" },
        "selected": { "$ref": "#/definitions/StateValue" },
        "empty": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["idle", "focus", "searching", "selected", "empty", "error"]
    },
    "api": { "$ref": "#/definitions/BlockB_APICall" },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state", "api"]
}
```

#### T9 Toast

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T9" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "show": { "$ref": "#/definitions/StateValue" },
        "hidden": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["show", "hidden"]
    },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state"]
}
```

#### T10 StatusPlaceholder

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T10" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "empty": { "$ref": "#/definitions/StateValue" },
        "loading": { "$ref": "#/definitions/StateValue" },
        "error": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["empty", "loading", "error"]
    },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state"]
}
```

#### T11 PageInfo

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "T11" },
    "level": { "type": "string", "enum": ["L1", "L2", "L3"] },
    "label": { "type": "string" },
    "blocks": {
      "type": "array",
      "items": { "$ref": "#/definitions/AnnotationBlock" },
      "contains": { "properties": { "title": { "pattern": "触发条件|trigger" } } }
    },
    "state": {
      "type": "object",
      "properties": {
        "hidden": { "$ref": "#/definitions/StateValue" },
        "visible": { "$ref": "#/definitions/StateValue" }
      },
      "required": ["hidden", "visible"]
    },
    "background": { "$ref": "#/definitions/BlockD_Background" },
    "businessRules": { "$ref": "#/definitions/BlockG_BusinessRules" },
    "dataFlow": { "$ref": "#/definitions/BlockH_DataFlow" }
  },
  "required": ["type", "level", "label", "blocks", "state"]
}
```

### 组合验证 Schema

用于验证整个 ANNOTATIONS 数据对象：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "description": "ANNOTATIONS 数据根对象（v2.3）",
  "properties": {
    "_businessRules": { "$ref": "#/definitions/BlockG_BusinessRules", "description": "顶层共享业务规则" },
    "_dataFlow": { "$ref": "#/definitions/BlockH_DataFlow", "description": "顶层共享数据流声明" }
  },
  "additionalProperties": {
    "type": "object",
    "oneOf": [
      { "$ref": "#/definitions/T1_DisplayMetric" },
      { "$ref": "#/definitions/T2_DataList" },
      { "$ref": "#/definitions/T3_ActionButton" },
      { "$ref": "#/definitions/T4_ActionMenu" },
      { "$ref": "#/definitions/T5_ConfirmAction" },
      { "$ref": "#/definitions/T6_FormFill" },
      { "$ref": "#/definitions/T7_ItemSelect" },
      { "$ref": "#/definitions/T8_SearchSelect" },
      { "$ref": "#/definitions/T9_Toast" },
      { "$ref": "#/definitions/T10_StatusPlaceholder" },
      { "$ref": "#/definitions/T11_PageInfo" }
    ]
  }
}
```

### 使用方式

1. 将以上 schema 保存为 `schemas/annotation-types.json`
2. 在 `scripts/validate-annotations.js` 中引用（需安装 ajv）：
   ```javascript
   const Ajv = require('ajv');
   const schema = require('./schemas/annotation-types.json');
   const ajv = new Ajv();
   const validate = ajv.compile(schema);
   const valid = validate(annotationsData);
   ```
3. 支持 pre-commit 钩子、CI 门禁、编辑器插件（VS Code 等）
4. 注意：v2.3 schema 向后兼容 v2.2 数据格式（state 支持字符串和衍生状态两种格式，level 支持字符串类型）

---

## 8. 状态 → 测试用例映射规则

每个类型模板的 state 定义可直接映射为标准测试用例。Tester 可直接使用此规则从 ANNOTATIONS 数据生成测试用例。

### 8.1 通用映射规则

| 状态 | 测试类型 | 测试用例模板 |
|------|---------|------------|
| normal | 正向用例 | 正常操作 → 验证组件正常展示/响应 |
| loading | 加载态 | 触发操作 → 验证 loading 指示器展示 |
| empty | 空数据 | 无数据返回 → 验证空状态展示 |
| error | 异常处理 | 接口返回错误 → 验证错误提示 |
| disabled | 禁用态 | 条件不满足 → 验证操作按钮禁用 |
| submitting | 提交中 | 提交操作 → 验证按钮 loading 和防重复提交 |

### 8.2 类型特定映射

| 类型 | 状态 | 测试用例 | 验证点 |
|------|------|---------|--------|
| T1 DisplayMetric | normal | 页面加载后展示指标 | 指标值正确、格式正确 |
| T1 DisplayMetric | loading | 数据加载中 | 骨架屏/loading 指示器 |
| T1 DisplayMetric | error | 接口返回错误码 | 错误提示文案 + 重试操作 |
| T2 DataList | normal | 列表数据正常展示 | 分页正确、列数据格式正确 |
| T2 DataList | loading | 列表加载中 | 骨架屏/loading 行 |
| T2 DataList | empty | 无数据返回 | 空状态插图 + 提示文案 |
| T2 DataList | error | 列表接口异常 | 错误提示 + 重试按钮 |
| T3 ActionButton | normal | 按钮可点击 | 点击后触发对应行为 |
| T3 ActionButton | disabled | 条件不满足 | 按钮置灰，hover 提示原因 |
| T3 ActionButton | loading | 操作执行中 | 按钮 loading，防重复点击 |
| T4 ActionMenu | normal | 菜单可展开 | 点击后展示所有菜单项 |
| T4 ActionMenu | open | 菜单已展开 | 菜单项完整、点击后关闭 |
| T4 ActionMenu | disabled | 无可用操作 | 菜单置灰或项置灰 |
| T5 ConfirmAction | normal | 确认弹窗展示 | 弹窗内容完整 |
| T5 ConfirmAction | submitting | 确认提交中 | 提交按钮 loading |
| T5 ConfirmAction | error | 提交失败 | 错误提示 + 可重试 |
| T6 FormFill | normal | 表单可填写 | 字段完整、标签正确 |
| T6 FormFill | fieldError | 字段校验不通过 | 错误提示在对应字段 |
| T6 FormFill | submitting | 表单提交中 | 提交按钮 loading |
| T6 FormFill | success | 提交成功 | 成功提示 + 关闭弹窗 |
| T6 FormFill | apiError | 接口返回业务错误 | 错误提示（非字段级）|
| T7 ItemSelect | normal | 选择器可搜索 | 搜索框可用 |
| T7 ItemSelect | loading | 搜索结果加载中 | 搜索 loading |
| T7 ItemSelect | empty | 无搜索结果 | "无结果"提示 |
| T7 ItemSelect | searchEmpty | 搜索无匹配 | "未找到匹配项" |
| T7 ItemSelect | selected | 已选择项 | 选中状态展示正确 |
| T7 ItemSelect | confirming | 确认选择中 | 确认按钮 loading |
| T7 ItemSelect | error | 搜索/确认接口异常 | 错误提示 |
| T8 SearchSelect | idle | 搜索框空闲 | 占位文案正确 |
| T8 SearchSelect | focus | 搜索框聚焦 | 下拉展开 |
| T8 SearchSelect | searching | 搜索中 | loading 指示器 |
| T8 SearchSelect | selected | 已选择 | 选中项展示、可清除 |
| T8 SearchSelect | empty | 无匹配结果 | "无结果"提示 |
| T8 SearchSelect | error | 搜索接口异常 | 错误提示 |
| T9 Toast | show | Toast 展示 | 文案正确、自动消失 |
| T9 Toast | hidden | Toast 隐藏 | 消失后不影响页面 |
| T10 StatusPlaceholder | empty | 空状态占位 | 占位图 + 文案 + 操作按钮 |
| T10 StatusPlaceholder | loading | 加载中占位 | 骨架屏展示 |
| T10 StatusPlaceholder | error | 错误状态占位 | 错误图 + 文案 + 重试 |
| T11 PageInfo | hidden | 提示默认隐藏 | 不占用页面空间 |
| T11 PageInfo | visible | 提示气泡展示 | 内容正确、可关闭 |

### 8.3 测试用例自动生成规则

从 ANNOTATIONS 数据自动生成测试用例的映射规则：

```
ANNOTATIONS.type → 确定状态集（§8.2）
ANNOTATIONS.state → 每个状态生成一个测试用例
ANNOTATIONS.blocks[behavior] → 测试用例的"预期行为"
ANNOTATIONS.blocks[trigger] → 测试用例的"前置条件"
ANNOTATIONS.api → 测试用例的"接口 mock 数据"
```

生成示例（T2 DataList）：

```markdown
### TC-DL-001: 列表正常展示
- **前置条件:** 页面加载完成，接口返回正常数据
- **操作步骤:** 无（自动加载）
- **预期结果:** 列表展示 20 条数据，分页显示第 1 页
- **验证点:** 列数据格式正确、分页组件正常

### TC-DL-002: 列表加载中
- **前置条件:** 页面加载中，接口未返回
- **操作步骤:** 进入页面
- **预期结果:** 展示骨架屏/loading 行
- **验证点:** loading 状态在接口返回后自动消失

### TC-DL-003: 列表空数据
- **前置条件:** 接口返回空数组
- **操作步骤:** 进入页面
- **预期结果:** 展示空状态插图 + "暂无数据"文案 + 刷新按钮
- **验证点:** 空状态正确展示

### TC-DL-004: 列表接口异常
- **前置条件:** 接口返回 500 或网络超时
- **操作步骤:** 进入页面
- **预期结果:** 展示错误提示 + "重试"按钮
- **验证点:** 点击重试后重新请求接口
```
