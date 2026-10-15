# history/retired — 测试反模式

本文档《测试反模式》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 测试反模式

**加载时机：** 编写或评审测试、宣称测试"覆盖"了某个行为之前。本文点名五种最常见的"测试通过却什么也没验证"的模式。

## 核心原则

断言了错误内容的通过测试，比没有测试更糟。没有测试至少清楚地表明"未覆盖"；断言 mock 交互的通过测试则会给出"已覆盖"的假象，同时没有证明任何真实行为。评审者和代理看到绿勾就会停止深究。

每种反模式配一个**门禁问题**：用它判断测试是在验证真实行为，还是在演戏。

## 五种反模式

### 反模式 1：断言 mock 的调用而非代码的行为

**症状：** 测试确认 mock 以特定参数被调用，却不检查调用的结果或系统的实际表现。

```typescript
// ❌ 戏剧化——断言 mock 而非代码
it('processes user', () => {
  const mockApi = { fetch: jest.fn().mockReturnValue({ id: 1 }) };
  processUser(mockApi);
  expect(mockApi.fetch).toHaveBeenCalledWith('/users/1');  // 证明的是调用，不是结果
});

// ✅ 真实——断言代码的可观察行为
it('processes user', () => {
  const mockApi = { fetch: jest.fn().mockReturnValue({ id: 1, name: 'Ada' }) };
  const result = processUser(mockApi);
  expect(result.displayName).toBe('Ada (#1)');  // 证明的是转换结果
});
```

**问题：** 只要代码以正确参数调用 mock，测试就通过——即便代码随后忽略、误用或破坏了响应。保持调用形状、破坏行为的重构依然绿。

**门禁问题：** 把被测函数体删掉、换成 `return undefined`，测试还通过吗？通过即戏剧化。

**修正：** 断言输出与状态变化，不断言调用形状。mock 只用于提供测试无法用其他方式构造的输入。

### 反模式 2：生产类上的仅测试接缝

**症状：** 生产代码中出现只有测试文件在调用的方法、构造器重载或 setter；生产调用方走的是另一条路径。

```typescript
// ❌ 仅测试接缝
class PaymentProcessor {
  private gateway: Gateway;

  constructor(gateway?: Gateway) {  // 可选参数只为了让测试通过
    this.gateway = gateway ?? new RealGateway();
  }

  // 测试直接读它
  getInternalState(): State { return this.state; }
}
```

**问题：** 生产与测试路径分叉。测试验证的路径生产从不执行——生产走 `new RealGateway()`，测试走注入的 mock；破坏生产路径的重构检测不到。

**门禁问题：** 仓库中是否有非测试代码调用该方法、该构造器重载或该 setter？没有，就是仅测试接缝。

**修正：** 对全部调用方使用构造器注入，不做可选注入。需要观察内部状态时，通过公开行为（输出、可观察副作用）断言，不为测试开 getter。

### 反模式 3：不理解依赖就 mock

**症状：** mock 返回值图方便，而不是图真实。测试全绿，集成一跑就挂。

```typescript
// ❌ mock 发明了一个形状
const mockDb = { query: jest.fn().mockReturnValue({ rows: [{ id: 1 }] }) };

// ✅ mock 与真实契约一致
// 真实 Postgres 返回 { rows: [...] } — 记录一次、捕获、重放
const capturedResult = readFixture('db-user-query-result.json');
const mockDb = { query: jest.fn().mockReturnValue(capturedResult) };
```

**问题：** 被测代码正在与一个虚构对象对照。真实依赖改变形状（新增字段、错误格式变化、该有值的地方返回 null）时，测试保持绿，生产却崩。

**门禁问题：** mock 值来自真实依赖的文档形状或捕获响应，还是我发明的？发明值等于未验证假设。

**修正：** 使用捕获 fixture（真实依赖记录一次、此后重放）。读依赖的真实契约——类型、错误模式、可空性——并编码进 mock。集成测试至少覆盖一次同一路径。

### 反模式 4：mock 不完整——崩溃代替失败

**症状：** mock 只实现快乐路径用到的方法，其余方法抛错或返回 undefined，导致边界用例根本写不出来。

```typescript
// ❌ mock 只认识 fetch
const mockApi = {
  fetch: jest.fn(),
  // update、delete、subscribe — undefined
};

// "update 失败会怎样"的测试跑不了——update 抛 "not a function"
```

**问题：** 错误路径、重试、回退从未被测，因为 mock 无法表达它们。覆盖率显示快乐路径全绿，错误路径却不可测。

**门禁问题：** 被测代码调用的每个方法，我都能写出它的错误路径测试吗？任一方法无法表达失败，mock 就不完整。

**修正：** mock 实现完整接口，包括错误响应。默认 mock 对意外调用抛错（让缺失的方法大声暴露），而不是静默返回 undefined。

### 反模式 5：集成测试沦为附属品

**症状：** 单元测试隔离验证逻辑；集成测试被跳过、无限延后或每个功能只有一条。重构过了单元测试，运行时崩。

**问题：** mock 只验证内部逻辑，从不验证代码与依赖的组合方式。生产中的大多数 bug 出在边界——序列化、查询形状、错误传播——恰好是 mock 够不到的地方。

**门禁问题：** 每个公开入口点是否至少有一条端到端测试，跑过真实依赖（或捕获契约假实现）？缺集成覆盖的入口点是已知缺口，不是可延后事项。

**修正：** 把集成测试当承重墙。每个公开入口点至少一条；捕获契约假实现（记录自真实依赖的响应）用于填补全集成与纯单元测试之间的空档。

## 横切门禁

写完或评审任何测试后，跑统一门禁：

> 把被测代码体删掉、换成 no-op 或常量，哪些测试会失败？

仍然通过的测试都是戏剧化的。宣称覆盖之前，修复或删除它们。

## 严重度分级

| 级别 | 标准 |
|---|---|
| Critical | 测试只断言 mock 调用形状；删掉被测代码仍绿 |
| Critical | 生产代码中存在生产调用方从不执行的仅测试接缝 |
| Important | mock 使用无法追溯到依赖契约的发明值 |
| Important | mock 无法表达被调用方法的错误路径 |
| Important | 公开入口点无集成覆盖 |
| Minor | mock 风格在代码库中不一致（风格问题，非正确性） |

## 相关文档

- `references/test-first-development.md` — RED-GREEN-REFACTOR 基础循环
- `references/review-feedback-intake.md` — 评审发现引用这些反模式时的处理方式
