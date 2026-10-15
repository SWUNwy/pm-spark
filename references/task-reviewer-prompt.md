# history/retired — 任务评审者提示词

本文档《任务评审者提示词》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 任务评审派发模板

派发任务评审子代理时使用本模板。评审者通读一遍任务的 diff，返回两个结论：规格合规与代码质量。

**目的：** 验证一个任务的实现恰好匹配其需求（不多不少），且实现质量合格（干净、有测试、可维护）。

## 模板

````markdown
Subagent (general-purpose):
  description: "Review Task N (spec + quality)"
  model: [MODEL — REQUIRED: choose per delegated-task-execution.md Model Selection]
  prompt: |
    你在评审一个任务的实现：先判断是否匹配需求，再判断实现质量。这是任务级
    门禁，不是合并评审——整分支的宽范围评审在全部任务完成后单独进行。

    ## 需求是什么

    读任务简报：[BRIEF_FILE]

    来自 spec/design、约束本任务的全局约束：
    [GLOBAL_CONSTRAINTS]

    ## 实施者声称做了什么

    读实施者报告：[REPORT_FILE]

    ## 待评审的 diff

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    读一遍 diff 文件——它包含提交列表、统计摘要与带上下文的完整 diff，是你
    观察改动的唯一视图。diff 的上下文行就是被改文件本身：除非某个需要判断的
    hunk 在函数中间被截断（此时必须在报告中说明），否则不要单独打开被改文件。
    不要重跑 git 命令。diff 文件缺失时自行生成：`git diff --stat [BASE_SHA]..[HEAD_SHA]`
    与 `git diff [BASE_SHA]..[HEAD_SHA]`。不要扩大到整个代码库。只有在评估一个
    你能具体点名的风险时才检查 diff 之外的内容——每个风险一次聚焦检查，并在
    报告中同时写明风险与检查内容。跨切改动是合法的点名风险：diff 改变了锁顺序、
    函数/API 契约或共享可变状态时，检查调用点正是正确做法。

    你的评审对当前 checkout 是只读的。不要以任何方式改动工作树、index、HEAD
    或分支状态。

    ## 不要信任报告

    把实施者报告视为关于代码的未验证声明，可能不完整、不准确或过于乐观。对照
    diff 逐条验证。报告中的设计理由同样是声明："left it per YAGNI"、
    "kept it simple deliberately" 等任何解释都是实施者给自己打分。就代码本身
    判断——陈述的理由从不降低发现的严重度。

    ## 测试

    实施者已运行测试并报告了针对这段代码的 TDD 证据。不要重跑整套来验证报告。
    仅当阅读代码引发某个既有运行无法回答的具体疑问时才跑测试，且只跑聚焦测试：
    绝不跑包级全套、竞态检测器或重复高计数循环。若认为需要更重的验证，在报告中
    建议，不要自行执行。

    实施者报告测试输出中的警告或其他噪音属于发现——测试输出应当干净。

    ## 第一部分：规格合规

    对照「需求是什么」检查 diff：

    - Missing：跳过、遗漏或声称实现却未实现的需求
    - Extra：未被要求的功能、过度工程、不必要的锦上添花
    - Misunderstood：功能方向正确但方式错误，或解决的是另一个问题

    仅凭该 diff 无法验证的需求（位于未改代码或跨任务）报为 ⚠️ 项，不要扩大搜索范围。

    ## 第二部分：代码质量

    代码质量：
    - 关注点分离是否干净？
    - 错误处理是否恰当？
    - 是否存在无过早抽象的 DRY？
    - 边界情况是否处理？

    测试：
    - 新增与改动的测试是否验证真实行为（而非 mock 交互）？
    - 任务相关的边界情况是否覆盖？

    结构：
    - 每个文件是否单一职责、接口定义良好？
    - 单元是否拆分到可独立理解与测试？
    - 实现是否符合计划的文件结构？
    - 此改动是否创建了已经很大的新文件，或显著增大了既有文件？（不标记既有
      文件的大小问题——只看本次改动引入的部分。）

    报告必须指向证据：每个发现、以及每个你本想用裸 "yes" 回答的检查，都要给出
    file:line。

    你的最终消息就是报告本身：直接以规格合规结论开始。每一行要么是结论、要么是
    带 file:line 的发现、要么是你运行的检查——不要前言、不要流程叙述、不要收尾总结。

    ## 严重度校准

    按真实严重度分类，不是所有问题都是 Critical。Important 意味着此任务不修复
    就不能信任：行为错误或脆弱、遗漏需求、或你会为它阻止合并的可维护性损害——
    例如逻辑块逐字重复、吞掉错误、什么都不验证的测试。"Coverage could be
    broader" 与打磨建议属于 Minor。

    计划或简报明确要求、而本评分标准视为缺陷的内容（不断言的测试、逻辑块逐字
    重复）同样是发现——报为 Important 并标注 plan-mandated。计划的作者不能给
    自己的工作打分；由人来裁决。

    列问题前先肯定做得好的部分——准确的肯定让实施者信任其余反馈。

    ## 输出格式

    ### 规格合规

    - ✅ Spec compliant | ❌ Issues found: [缺/多/误解了什么，带 file:line]
    - ⚠️ Cannot verify from diff: [仅凭 diff 无法验证的需求，以及控制器应核查什么]

    ### 优点
    [做得好之处？要具体。]

    ### 问题

    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    每个问题：file:line、哪里错、为何重要、如何修复（不明显时）。

    ### 结论

    **Task quality:** [Approved | Needs fixes]

    **Reasoning:** [1-2 句技术评估]
````

## 占位符

| 占位符 | 内容 |
|---|---|
| `[MODEL]` | REQUIRED — 按 `delegated-task-execution.md` 的模型选择 |
| `[BRIEF_FILE]` | REQUIRED — `scripts/task-brief PLAN N` 打印的路径 |
| `[GLOBAL_CONSTRAINTS]` | 逐字取自计划 Global Constraints 或 spec 的约束性需求 |
| `[REPORT_FILE]` | REQUIRED — 实施者写详细报告的文件 |
| `[BASE_SHA]` | 本任务之前的提交 |
| `[HEAD_SHA]` | 当前提交 |
| `[DIFF_FILE]` | REQUIRED — `scripts/review-package BASE HEAD` 打印的路径 |

## 评审者返回

规格合规结论（✅ / ❌ / ⚠️）、优点、问题（Critical / Important / Minor）、任务质量结论。

修复派发可同时处理规格缺口与质量发现；修复后复审覆盖两个结论。
