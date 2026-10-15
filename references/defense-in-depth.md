# history/retired — 纵深防御

本文档《纵深防御》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 纵深防御验证（Defense-in-Depth Validation）

## 概述

修复无效数据导致的 bug 时，在一处加验证感觉就够了。但那个单点检查可能被不同代码路径、重构或 mock 绕过。

**核心原则：在数据经过的每一层验证。让 bug 在结构上不可能。**

## 为什么多层

单层验证："我们修了 bug"
多层验证："我们让 bug 不可能"

不同层捕获不同情况：
- 入口验证捕获大多数 bug
- 业务逻辑捕获边界情况
- 环境护栏防止特定上下文的危险
- 调试日志在其他层失败时帮忙

## 四层

### 层 1：入口点验证
**目的：** 在 API 边界拒绝明显无效输入

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### 层 2：业务逻辑验证
**目的：** 确保数据对此操作有意义

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### 层 3：环境护栏
**目的：** 防止特定上下文的危险操作

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### 层 4：调试插桩
**目的：** 为取证捕获上下文

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## 应用模式

发现 bug 时：

1. **追踪数据流** - 坏值从哪来？用在哪？
2. **映射全部检查点** - 列出数据经过的每个点
3. **每层加验证** - 入口、业务、环境、调试
4. **逐层测试** - 尝试绕过层 1，验证层 2 能抓住

## 会话示例

Bug：空 `projectDir` 导致在源码里 `git init`

**数据流：**
1. 测试 setup → 空字符串
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 在 `process.cwd()` 运行

**加的四层：**
- Layer 1: `Project.create()` 校验非空/存在/可写
- Layer 2: `WorkspaceManager` 校验 projectDir 非空
- Layer 3: `WorktreeManager` 在测试中拒绝 tmpdir 外 git init
- Layer 4: git init 前堆栈日志

**结果：** 全部 1847 个测试通过，bug 无法复现

## 关键洞见

四层都必要。测试期间每层都抓住了其他层漏掉的 bug：
- 不同代码路径绕过了入口验证
- mock 绕过了业务逻辑检查
- 不同平台的边界情况需要环境护栏
- 调试日志识别了结构性误用

**不要停在一个验证点。** 每层都加检查。
