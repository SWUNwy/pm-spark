# history/retired — 完成验证

本文档《完成验证》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 完成前验证（Verification Before Completion）

## 概述

没有验证就宣称完成是不诚实，不是高效。

**核心原则：先证据，后声明。**

**违反规则的文字形式就是违反规则的精神。**

## 铁律

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

如果你没有在本条消息中运行验证命令，就不能宣称它通过。

## 门禁函数

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## 常见失败

| 声明 | 需要 | 不够 |
|---|---|---|
| Tests pass | 测试命令输出：0 失败 | 上次运行、"should pass" |
| Linter clean | Linter 输出：0 错误 | 部分检查、外推 |
| Build succeeds | 构建命令：exit 0 | Linter 通过、日志看起来正常 |
| Bug fixed | 测试原始症状：通过 | 改了代码、假设已修复 |
| Regression test works | 红绿循环已验证 | 测试通过一次 |
| Agent completed | VCS diff 显示改动 | 代理报告 "success" |
| Requirements met | 逐行检查清单 | 测试通过 |

## 红旗——停止

- 使用 "should"、"probably"、"seems to"
- 验证前表达满意（"Great!"、"Perfect!"、"Done!" 等）
- 未验证就要 commit/push/PR
- 轻信代理成功报告
- 依赖部分验证
- 想着 "just this once"
- 累了、想让工作结束
- **任何未运行验证却暗示成功的措辞**

## 合理化预防

| 借口 | 现实 |
|---|---|
| "Should work now" | 去 RUN 验证 |
| "I'm confident" | 自信 ≠ 证据 |
| "Just this once" | 没有例外 |
| "Linter passed" | Linter ≠ 编译器 |
| "Agent said success" | 独立验证 |
| "I'm tired" | 疲劳不是借口 |
| "Partial check is enough" | 部分证明不了任何事 |
| "Different words so rule doesn't apply" | 精神优先于字面 |

## 关键模式

**测试：**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**回归测试（TDD 红绿）：**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test"（没有红绿验证）
```

**构建：**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed"（linter 不检查编译）
```

**需求：**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**代理派发：**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## 为什么这很重要

来自 24 条失败记忆：
- 伙伴说 "I don't believe you"——信任破裂
- 未定义函数上线——会崩溃
- 缺失需求上线——功能不完整
- 假完成浪费时间 → 返工
- 违反："Honesty is a core value. If you lie, you'll be replaced."

## 何时应用

**以下情况之前永远应用：**
- 任何形式的成功/完成声明
- 任何满意表达
- 任何关于工作状态的正面表述
- 提交、创建 PR、任务完成
- 进入下一个任务
- 派发给代理

**规则适用于：**
- 精确短语
- 转述与同义词
- 成功的暗示
- 任何暗示完成/正确的沟通

## 底线

**验证没有捷径。**

运行命令。读输出。然后才声明结果。
