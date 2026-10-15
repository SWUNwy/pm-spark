# history/retired — 计划执行

本文档《计划执行》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 执行实施计划（analyze 内部能力）

## 概述

加载计划、批判性评审、执行全部任务、完成后报告。

## 流程

### 第 1 步：加载并评审计划
1. 读计划文件
2. 批判性评审——识别对计划的疑问或顾虑
3. 有顾虑：开始前向人类伙伴提出
4. 无顾虑：为计划项创建 todos 并继续

### 第 2 步：执行任务

每个任务：
1. 标记为 in_progress
2. 严格按每步执行（计划是小块步骤）
3. 按计划运行验证
4. 标记为 completed

### 第 3 步：完成开发

全部任务完成并验证后：
- 用 workflow 控制器登记执行结果
- 任何完成声明前运行 `workflow-state.cjs validate --state <workflow-state>`
- 按 completion-verification 协议做全新验证

## 何时停止并求助

**出现以下情况立即停止执行：**
- 遇到阻塞（缺依赖、测试失败、指令不清）
- 计划有阻止开始的严重缺口
- 不理解某条指令
- 验证反复失败

**澄清而不是猜测。**

## 何时回到更早步骤

**以下情况回到评审（第 1 步）：**
- 伙伴根据你的反馈更新了计划
- 根本方法需要重新思考

**不要硬闯阻塞**——停下并询问。

## 记住
- 先批判性评审计划
- 严格按计划步骤执行
- 不跳过验证
- 阻塞（blocked）就停，不猜测
- 未经用户明确同意，绝不在 main/master 分支上开始实施

## 执行结果 Schema

完成全部任务后，用 `assets/execution-result.template.json` 保存执行结果：

```json
{
  "schema_version": "analyze-execution-result/1.0",
  "status": "ready_for_verification",
  "plan_sha256": "<sha256 of the plan file>",
  "changes": [
    { "path": "src/model.js", "summary": "Implemented domain model" }
  ],
  "checks": [
    { "command": "node test.js", "exit_code": 0, "evidence": "1 test passed" }
  ],
  "unresolved_blockers": []
}
```

用 workflow 控制器登记：

```bash
node <skill-dir>/scripts/workflow-state.cjs complete \
  --state <workflow-state> --stage execute --artifact <execution-result.json>
```
