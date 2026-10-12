# 网络研究指南（Web Research Guide）

结论依赖外部事实时使用本文件。

## 默认规则

先核对用户请求和已有授权。用户已请求只读研究且宿主允许时直接执行，无需重复请求许可；仅在新增具体动作超出授权或宿主明确要求时补充确认。用户未请求研究时，不为可能有帮助而自动扩大范围。先区分：

- 本地/用户提供的信息。
- 外部事实。
- 外部易变事实。

易变或高利害外部事实重要时，按已有请求与授权验证；未请求且会扩展任务时才建议验证并确认。以下 Probe 仅用于尚未请求研究的场景，已请求时直接定向搜索。

## 何时建议验证

为以下内容建议验证：

- 当前价格、市场数据、法规、产品规格、模型/API 行为、公司角色、排名、日程、法律/医疗/财务事实。
- 任何有实质变化可能的事实。
- 任何可能导致显著时间或金钱投入的建议。

### 按触发类型的搜索模式

用户已请求研究或必要确认完成后，使用定向搜索模式：

| 触发 | 搜索模式 |
|---|---|
| 竞争基准 | `best practices for [feature] in [industry]` |
| 竞争对比 | `[competitor A] vs [competitor B] [feature] comparison` |
| 市场趋势 | `[industry] market size trends [year]` |
| 用户行为 | `[behavior] statistics [demographic] [year]` |
| 技术评估 | `[library A] vs [library B] performance comparison [year]` |
| 技术风险 | `[technology] known issues limitations` |
| 合规 | `[regulation] requirements for [product type] [year]` |
| 标准 | `[standard] compliance checklist` |

何时不搜索：业务逻辑、本地文件内容、概念/观点话题、用户提供的权威信息。

## spec-analyze 场景补充（原型 / 交互研究）

产品需求分析与原型标注场景中，以下触发也建议提出验证：

### 组件与交互模式

需要用既有行业模式验证交互设计决策时：

**Probe:** "The [interaction] pattern being discussed has precedent in the industry. Want me to check common approaches and anti-patterns?"

**搜索模式：**
- `[component] UX pattern best practices [current year]`
- `[interaction] UX anti-patterns`
- `[UI pattern] accessibility considerations`
- `[component library] [component] API reference`

### 竞争基准（原型语境）

需要理解竞品如何解决同一问题时：

**Probe:** "This relates to [feature] which competitors likely already handle. Should I check current industry approaches?"

**搜索模式：**
- `[competitor] [feature] implementation UX`
- `[industry] best practices for [feature] [current year]`
- `[product category] comparison [feature]`
- `how does [competitor] handle [scenario]`

## 用户确认验证

使用可靠来源并在最终回答中引用。技术、法律、医疗、财务或公司事实优先一手来源。

## 用户拒绝验证

用此模式：

```markdown
## Preliminary Judgment

**Conclusion:** ...
**Confidence:** ...
**Unconfirmed external facts:** ...

### Conditional Analysis
- If [external fact A] is true, then ...
- If not, then ...

### Minimum Validation
...
```

## 信息整合

把研究结果组织为：

| 章节 | 内容 | 目的 |
|---|---|---|
| **As-is** | 当前行业标准、基准或规范 | 接地 |
| **Gap** | 我们方法落后标准之处 | 风险意识 |
| **Edge** | 我们能差异化或优于标准之处 | 机会 |

### 内联 vs 附录

- **内联**：直接影响特定决策的简短发现（1-3 个事实）→ 在讨论中呈现。
- **附录**：广泛研究（竞争分析、多来源综合）→ 内联总结要点，完整细节放附录。

### 来源质量

- 优先官方文档、成熟行业报告与一手来源。
- 对营销内容、SEO 优化列表文与厂商对比保持怀疑。
- 记录发布日期；快变话题优先近期来源。
- 重要声明尽可能跨多来源交叉验证。
- 总是引用来源，让用户可验证。

## 不要

- 不要编造引用。
- 不要把过期外部事实当已确认。
- 不要因为浏览可能改进，就阻塞低风险本地分析。
