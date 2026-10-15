# history/retired — 基于条件的等待

本文档《基于条件的等待》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 条件式等待（Condition-Based Waiting）

## 概述

脆弱的测试常靠任意延迟猜测时机。这会制造竞态：测试在快机器上通过，在负载下或 CI 里失败。

**核心原则：等待你真正关心的条件，而不是猜测需要多久。**

## 何时使用

**使用：**
- 测试有任意延迟（`setTimeout`、`sleep`、`time.sleep()`）
- 测试脆弱（时过时败、负载下失败）
- 测试并行运行时超时
- 等待异步操作完成

**不使用：**
- 测试真实时序行为（debounce、throttle 间隔）
- 使用任意超时时总是记录 WHY

## 核心模式

```typescript
// ❌ BEFORE: Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: Waiting for condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
expect(result).toBeDefined();
```

## 快速模式

| 场景 | 模式 |
|---|---|
| 等事件 | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| 等状态 | `waitFor(() => machine.state === 'ready')` |
| 等数量 | `waitFor(() => items.length >= 5)` |
| 等文件 | `waitFor(() => fs.existsSync(path))` |
| 复杂条件 | `waitFor(() => obj.ready && obj.value > 10)` |

## 实现

通用轮询函数：
```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

## 常见错误

**❌ 轮询太快：** `setTimeout(check, 1)` - 浪费 CPU
**✅ 修复：** 每 10ms 轮询

**❌ 无超时：** 条件永不满足会死循环
**✅ 修复：** 总是带清晰错误的超时

**❌ 过期数据：** 循环前缓存状态
**✅ 修复：** 循环内调用 getter 获取新数据

## 任意超时何时正确

```typescript
// Tool ticks every 100ms - need 2 ticks to verify partial output
await waitForEvent(manager, 'TOOL_STARTED'); // First: wait for condition
await new Promise(r => setTimeout(r, 200));   // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals - documented and justified
```

**要求：**
1. 先等触发条件
2. 基于已知时序（不是猜测）
3. 注释解释 WHY

## 真实世界影响

来自调试会话（2025-10-03）：
- 修复 3 个文件中的 15 个脆弱测试
- 通过率：60% → 100%
- 执行时间：快 40%
- 不再有竞态
