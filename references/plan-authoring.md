# history/retired — 计划编写

本文档《计划编写》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 编写实施计划（analyze 内部能力）

## 概述

编写完整实施计划，假设工程师对我们的代码库零上下文、品味可疑。记录他们需要知道的一切：每个任务要改哪些文件、代码、测试、可能需要查看的文档、如何测试。把整个计划拆成小块任务。DRY。YAGNI。TDD。频繁提交。

假设他们是熟练开发者，但几乎不了解我们的工具集或问题域。假设他们不擅长测试设计。

**保存位置：** `.analyze/plans/YYYY-MM-DD-<feature-name>.md`
（用户的计划位置偏好覆盖此默认）

## 范围检查

若 Spec 覆盖多个独立子系统，分析阶段就应已拆成子项目 Spec。若没有，建议拆成独立计划——每个子系统一份。每份计划应产出可独立工作、可测试的软件。

## 文件结构

定义任务前，先映射哪些文件将被创建或修改、各自职责。这是拆解决策落地的位置。

- 设计边界清晰、接口定义良好的单元。每个文件一个明确职责。
- 一次能装进上下文的代码你推理得最好；文件聚焦时编辑更可靠。优先小而聚焦的文件，而不是过大而杂的文件。
- 一起变化的文件应放一起。按职责拆分，不要按技术层拆分。
- 既有代码库遵循既有模式。不要单方面重构；但如果正在修改的文件已臃肿，把拆分纳入计划是合理的。

该结构决定任务拆解。每个任务应产出可独立成立的自包含改动。

## 任务粒度

任务是承载自身测试周期、值得新评审者把关的最小单元。划定任务边界时：把配置、脚手架与文档步骤并入其交付物所需的任务；只有在评审者可能拒绝一个任务而批准其相邻任务时才拆分。每个任务以可独立测试的交付物结束。

## 小块任务粒度

**每步是一个动作（2-5 分钟）：**
- "写失败的测试" - 步骤
- "运行确认它失败" - 步骤
- "写让测试通过的最小实现" - 步骤
- "运行测试确认通过" - 步骤
- "提交" - 步骤

## 计划文档 Header

**每份计划必须以该 header 开头：**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

---
```

## 任务结构

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## 无占位符

每步必须包含工程师真正需要的实际内容。以下是**计划失败**，绝不写：
- "TBD"、"TODO"、"implement later"、"fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above"（没有实际测试代码）
- "Similar to Task N"（重复代码——工程师可能不按顺序读任务）
- 只描述做什么、不展示怎么做的步骤（代码步骤必须带代码块）
- 引用任何任务中未定义的类型、函数或方法

## 记住
- 精确文件路径
- 每步完整代码——步骤改代码就展示代码
- 精确命令与预期输出
- DRY、YAGNI、TDD、频繁提交

## 自审

写完完整计划后，用新眼光看 Spec，对照检查计划。这是你自己跑的检查清单，不是子代理派发。

**1. Spec 覆盖：** 扫读 Spec 的每个区块/需求。能否指出实现它的任务？列出缺口。

**2. 占位符扫描：** 搜索计划的红旗——上文"无占位符"章节的任何模式。修复它们。

**3. 类型一致性：** 后置任务使用的类型、方法签名与属性名是否与前置任务定义的一致？任务 3 里叫 `clearLayers()`、任务 7 里叫 `clearFullLayers()` 是 bug。

发现问题就原地修复，无需重新评审——修完继续。发现 Spec 需求没有对应任务，就补任务。

## 执行交接

保存计划后用 workflow 控制器登记：

```bash
node <skill-dir>/scripts/workflow-state.cjs complete \
  --state <workflow-state> --stage plan --artifact <plan-file>
```

控制器随后把 status 设为 `awaiting_execution_approval`。展示计划并请求明确的人工批准，之后才进入执行（execution）。
