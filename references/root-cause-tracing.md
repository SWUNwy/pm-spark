# history/retired — 根因追踪

本文档《根因追踪》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 根因追踪（Root Cause Tracing）

## 概述

bug 常深藏在调用栈里（在错误目录 git init、文件创建在错误位置、数据库用错误路径打开）。本能是在错误出现处修复，但那是在治标。

**核心原则：沿调用链向后追踪，直到找到原始触发点，然后在源头修复。**

## 何时使用

**使用：**
- 错误发生在执行深处（不在入口点）
- 堆栈显示长调用链
- 不清楚无效数据从哪来
- 需要找出哪个测试/代码触发问题

## 追踪流程

### 1. 观察症状
```
Error: git init failed in ~/project/packages/core
```

### 2. 找直接原因
**什么代码直接导致？**
```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

### 3. 问：谁调用了它？
```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → called by Session.initializeWorkspace()
  → called by Session.create()
  → called by test at Project.create()
```

### 4. 继续向上追踪
**传入了什么值？**
- `projectDir = ''`（空字符串！）
- 空字符串作为 `cwd` 解析为 `process.cwd()`
- 那就是源码目录！

### 5. 找原始触发点
**空字符串从哪来？**
```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed before beforeEach!
```

## 添加堆栈追踪

无法手工追踪时加插桩：

```typescript
// Before the problematic operation
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    stack,
  });

  await execFileAsync('git', ['init'], { cwd: directory });
}
```

**关键：** 测试里用 `console.error()`（不要用 logger——可能不显示）

**运行并捕获：**
```bash
npm test 2>&1 | grep 'DEBUG git init'
```

**分析堆栈：**
- 找测试文件名
- 找触发调用的行号
- 识别模式（同一测试？同一参数？）

## 找出哪个测试造成污染

测试期间出现某物但不知是哪个测试：

用本目录的二分脚本 `find-polluter.sh`：

```bash
./find-polluter.sh '.git' 'src/**/*.test.ts'
```

逐个运行测试，停在第一个污染者。用法见脚本。

## 真实示例：空 projectDir

**症状：** `.git` 创建在 `packages/core/`（源码）

**追踪链：**
1. `git init` 在 `process.cwd()` 运行 ← 空 cwd 参数
2. WorktreeManager 收到空 projectDir
3. Session.create() 传了空字符串
4. 测试在 beforeEach 前访问 `context.tempDir`
5. setupCoreTest() 初始返回 `{ tempDir: '' }`

**根因：** 顶层变量初始化访问空值

**修复：** 把 tempDir 改为在 beforeEach 前访问就抛错的 getter

**同时加了纵深防御（defense-in-depth）：**
- Layer 1: Project.create() 校验目录
- Layer 2: WorkspaceManager 校验非空
- Layer 3: NODE_ENV 护栏拒绝在 tmpdir 外 git init
- Layer 4: git init 前堆栈日志

## 关键原则

**绝不在错误出现处修。** 追踪回去找原始触发点。

## 堆栈追踪提示

**测试里：** 用 `console.error()` 不用 logger——logger 可能被抑制
**操作前：** 危险操作前记录，不要等失败后
**包含上下文：** 目录、cwd、环境变量、时间戳
**捕获堆栈：** `new Error().stack` 显示完整调用链

## 真实世界影响

来自调试会话（2025-10-03）：
- 通过 5 层追踪找到根因
- 在源头修复（getter 校验）
- 加 4 层防御
- 1847 个测试通过，零污染
