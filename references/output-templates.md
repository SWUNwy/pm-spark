# 输出模板（Output Templates）

## 目录

- Output Selection（输出选择）
- Stage Summary（阶段小结）
- Brainstorming Outputs（头脑风暴输出）
- Analysis Reports（分析报告）
- Decision-grade Report（决策级报告）
- Degraded Outputs（降级输出）
- Short Answer Format（短答格式）

## 输出选择

| 用户需求 | 模式 | 输出 |
|---|---|---|
| 探索可能性 | Brainstorming | Idea Map |
| 比较涌现方向 | Brainstorming | Direction Brief |
| 做选择 | Analysis | Decision Analysis Report |
| 澄清需求 | Analysis | Requirement Analysis Report |
| 比较方案 | Analysis | Solution Analysis Report |
| 决定战略 | Analysis | Strategy Analysis Report |
| 高利害决策 | Analysis | Decision-grade Report |
| Spec 请求过早 | Spec | Spec Readiness Check |
| 事实不足 | Any | Preliminary Judgment / Assumption Map |

## 输出文件路径

PM Spark 输出路径以 `SKILL.md` 为权威，下表仅为旧路径参考。用户指定路径或已有确认直接继承；需要确认时，将范围、验收、非目标与路径合并为一次确认，避免重复。

模式切换继承已确认事实与约束。轻量输出仍保留关键边界和推荐反转条件。模式五缺少评分依据时用定性比较、条件化推荐和待验证变量，不虚构评分、权重、收益或用户量；只有用户提供或查证的数据足够时才量化。Spec 有阻塞未决项时可交付标注缺口与影响的草稿，不得称已就绪；非阻塞未知项标为待验证。PRD 局部变更只核对受影响章节与旧 AC，保留未变化确认项；每个未决项都单独标为**阻塞**（会改变当前交付或验收，不得称已就绪）或**待验证**（非阻塞未知项），不在回复正文展开非关键清单。

| 输出类型 | 默认路径 | 说明 |
|---|---|---|
| Idea Map / Direction Brief | `docs/analyze/explore/YYYY-MM-DD-<topic>-insight.md` | 头脑风暴输出 |
| Analysis Report | `docs/analyze/explore/YYYY-MM-DD-<topic>-report.md` | Decision/Requirement/Solution/Strategy 报告 |
| Decision-grade Report | `docs/analyze/explore/YYYY-MM-DD-<topic>-decision.md` | 高利害决策记录 |
| Spec 工件 | `docs/analyze/specs/YYYY-MM-DD-<topic>/` | 固定 proposal/design/tasks；附录须适用且明确请求 |
| Stage Summary | 仅对话 | 除非用户要求，不写文件 |
| 降级输出 | 仅对话 | 除非用户要求，不写文件 |

用户偏好覆盖默认路径；指定路径或已确认路径不再问，必要确认与范围确认合并。Spec 目录固定 proposal/design/tasks，附录依适用性和明确请求决定。

### Constitution 路径覆盖

项目 constitution 存在并定义 `output_paths` 时，应用 constitution 的覆盖表：

| 输出类型 | 覆盖路径模式 |
|---|---|
| Idea Map / Direction Brief | `requirements/active/{CONVENTION}/YYYY-MM-DD-<topic>-insight.md` |
| Analysis Report | `requirements/active/{CONVENTION}/YYYY-MM-DD-<topic>-report.md` |
| Decision-grade Report | `requirements/active/{CONVENTION}/YYYY-MM-DD-<topic>-decision.md` |
| Spec 工件 | `requirements/active/{CONVENTION}/` |

`{CONVENTION}` 是占位符。**写文件前提示用户提供 convention 值**（如 "R003-nav-and-layout"）。用提供的值替换所有路径中的 `{CONVENTION}`。

精确覆盖路径在 constitution 的 Output Paths 章节定义。上表展示 Loop Engineering 模式作为示例。

## Stage Summary

```markdown
## Stage Summary

**Current mode:** Brainstorming / Analysis / Spec / Execution
**User goal:** ...
**Context Basis:** ...

### Confirmed
- ...

### Still Missing
- ...

### Branches / Options
| Option | Meaning | Current status |
|---|---|---|
| A | ... | ... |

### Gate Status
| Gate | Status | Missing |
|---|---|---|
| Brainstorming / Analysis / Spec / Execution | Satisfied / Partial / Missing | ... |

### Recommended Next Step
...
```

## 头脑风暴输出

### Idea Map

用户想要可能性、重新框架或早期探索时使用。

```markdown
## Idea Map: [Topic]

**Context Basis:** ...
**Main framework:** [e.g. First Principles]

### Core Question
...

### First Principles / Key Variables
- ...

### Possible Directions
| Direction | Value | Assumption | Risk |
|---|---|---|---|
| A | ... | ... | ... |

### Hidden Assumptions
- ...

### Next Exploration Question
...
```

### Direction Brief

对话需要轻度收敛时使用。

```markdown
## Direction Brief: [Topic]

**Context Basis:** ...

### Candidate Directions
| Direction | Upside | Cost | Possibility | Best Use Case |
|---|---|---|---|---|
| A | ... | ... | High/Med/Low | ... |
| B | ... | ... | High/Med/Low | ... |
| C | ... | ... | High/Med/Low | ... |

### Recommendation
...

### Minimum Validation
...
```

## 分析报告

### Decision Analysis Report

```markdown
## Decision Analysis Report: [Decision]

**Context Basis:** ...
**Decision question:** ...
**Confidence:** High / Medium / Low

### Options
| Option | Description | Keep / Reject / Conditional |
|---|---|---|

### Criteria
| Criterion | Why it matters | Weight |
|---|---|---|

### Trade-off Matrix
| Option | Value | Cost | Risk | Reversibility | Fit |
|---|---:|---:|---:|---:|---:|

### Recommendation
...

### Minimum Validation Action
...
```

### Requirement Analysis Report

```markdown
## Requirement Analysis Report: [Topic]

**Context Basis:** ...
**User / scenario:** ...

### Goals
- ...

### Non-goals
- ...

### Scope
| In Scope | Out of Scope |
|---|---|

### Requirements
| Requirement | Priority | Acceptance Signal |
|---|---|---|

### Open Questions
- ...

### Spec Readiness
Ready / Partial / Not ready, because ...
```

### Solution Analysis Report

```markdown
## Solution Analysis Report: [Topic]

**Context Basis:** ...

### Candidate Solutions
| Solution | Strength | Weakness | Risk |
|---|---|---|---|

### Architecture / Flow
...

### Recommendation
...

### Implementation Caution
...
```

### Strategy Analysis Report

```markdown
## Strategy Analysis Report: [Topic]

**Context Basis:** ...

### Strategic Question
...

### Current Position
- Assets:
- Constraints:
- Unknowns:

### Strategic Options
| Option | Advantage | Constraint | Time Horizon |
|---|---|---|---|

### Recommended Path
...

### Reassessment Trigger
...
```

## Decision-grade Report

```markdown
## Decision-grade Report: [Decision]

**Context Basis:** ...
**Reset or continue:** ...
**Decision question:** ...
**Confidence:** High / Medium / Low

### Anti-anchor Check
- Prior context that may bias this decision:
- Options that remain if prior context is ignored:
- Why the recommendation is not merely continuity:

### Decision Criteria
| Criterion | Weight | Reason |
|---|---:|---|

### Options
| Option | Description | Preconditions |
|---|---|---|

### Trade-off Matrix
| Option | Upside | Downside | Risk | Reversibility | Strategic Fit |
|---|---|---|---|---|---|

### Adversarial Stress Test
- Strongest argument against the recommendation:
- Failure mode:
- Early warning signal:

### Recommendation
...

### Minimum Validation Action
...

### Reassessment Triggers
- ...
```

## 降级输出

### Preliminary Judgment

```markdown
## Preliminary Judgment

**Conclusion:** ...
**Confidence:** Low / Medium
**Why:** ...
**Cannot confirm yet:** ...
**If A is true:** ...
**If A is false:** ...
**Minimum next question/action:** ...
```

### Spec Readiness Check

```markdown
## Spec Readiness Check

**Current status:** Ready / Partial / Not ready

### Already Satisfied
- ...

### Missing
| Missing Item | Why It Matters | Minimum Completion Path |
|---|---|---|

### Product Artifacts
proposal.md + design.md + tasks.md（固定三文档；详略不改变文件数量）

### Requested Appendices
仅列需求类型适用且用户明确请求的附录；没有则写“无”。

### Next Step
...
```

### Spec Readiness Check（需求类型感知）

只列影响当前产品判断的缺口；技术内容仅在类型适用且用户明确请求工程附录时检查，不能用附录缺失阻断默认三文档。

```markdown
## Spec Readiness Check

**当前状态：** 可生成 / 需补充

### 已明确
- ...

### 待补充的产品信息
| 信息 | 对产品判断的影响 | 最小补充方式 |
|---|---|---|
| 目标与指标 | ... | ... |
| 角色、权限与可见状态 | ... | ... |
| 主流程、异常与恢复 | ... | ... |
| 边界、验收标准与非目标 | ... | ... |

### 产品交付物
proposal.md + design.md + tasks.md（固定三文档；详略不改变文件数量）

### 附录适用性
仅列需求类型适用且用户明确请求的附录；没有则写“无”。不适用的技术章节说明具体原因。

### 可选下一步
[只提供一个与当前产品需要相关的下一步]
```

### Open Questions Brief

```markdown
## Open Questions Brief

### Critical
1. ...

### Useful But Not Blocking
1. ...

### My Recommended Minimum
...
```

### Assumption Map

```markdown
## Assumption Map

| Assumption | Confidence | Impact if Wrong | Validation |
|---|---|---|---|
```

## 短答格式

```markdown
结论：...

极短依据：...

提醒：只有结论没有论点容易站不住脚，建议获取完整论点。
```
