# history/retired — Git worktree 隔离

本文档《Git worktree 隔离》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 使用 Git Worktree

## 加载时机

执行需要工作区隔离的实施计划前加载。进入 `execute` 阶段、存在破坏当前分支的风险时必备。清理逻辑与 `branch-integration.md` 配合使用。

## 核心原则

先检测是否已有隔离，其次使用宿主原生工具，最后才回退到 git 命令。不要与宿主工作区机制对抗。

## 决策顺序

| 步骤 | 判断 | 是 | 否 |
|---|---|---|---|
| 0 | 已在链接 worktree 中？ | 跳到项目设置 | 进入步骤 1 |
| 1a | 有原生 worktree 工具？ | 使用它，跳到项目设置 | 进入步骤 1b |
| 1b | 用户同意或有明确偏好？ | 创建 git worktree | 征求同意 |

## 步骤 0：检查既有隔离

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**子模块判断：** `GIT_DIR != GIT_COMMON` 在 git 子模块中同样成立。断定"已在 worktree"前先排除子模块：

```bash
# 有输出表示在子模块中，不是 worktree——按普通仓库处理
git rev-parse --show-superproject-working-tree 2>/dev/null
```

`GIT_DIR != GIT_COMMON` 且不是子模块：已在链接 worktree，跳到项目设置，不再创建。

汇报既有隔离：
- 在分支上："Already in isolated workspace at `<path>` on branch `<name>`."
- 分离 HEAD："Already in isolated workspace at `<path>` (detached HEAD, externally managed)."

## 步骤 1a：优先原生工具

寻找 `EnterWorktree`、`WorktreeCreate`、`/worktree` 命令或 `--worktree` 标志。存在就使用它并跳到项目设置。

原生工具自动处理目录放置、分支创建与清理。已有原生工具还用 `git worktree add`，会制造宿主无法管理的额外状态。

## 步骤 1b：git worktree 回退

仅当步骤 1a 不适用时使用。

用户未表达偏好时，创建前先询问：

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

有明确偏好则直接遵循，不再询问。用户拒绝就在当前目录工作，跳到项目设置。

### 目录优先级

1. 指令中的显式用户偏好——直接使用
2. 项目内既有目录：
   ```bash
   ls -d .worktrees 2>/dev/null     # 首选（隐藏目录）
   ls -d worktrees 2>/dev/null      # 备选
   ```
   两者都存在时 `.worktrees/` 优先。
3. 默认：项目根目录 `.worktrees/`

### 安全检查（仅项目本地目录）

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

未被忽略：先加入 `.gitignore` 并提交，再继续，防止误提交 worktree 内容。

### 创建

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱回退：** `git worktree add` 因权限问题失败时，向用户说明沙箱阻止了 worktree 创建，并在当前目录继续：就地完成项目设置与基线测试。

## 步骤 2：项目设置

自动检测并运行对应 setup：

```bash
[ -f package.json ] && npm install
[ -f Cargo.toml ] && cargo build
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ] && poetry install
[ -f go.mod ] && go mod download
```

## 步骤 3：验证干净基线

运行项目测试命令并汇报：

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

测试失败：如实汇报，询问继续还是先调查。不假设失败是预先存在的。

## 红线

绝不：
- 步骤 0 已检测到隔离还创建 worktree
- 有原生工具还用 `git worktree add`（最常见错误）
- 跳过步骤 1a 直接执行 git 命令
- 未确认 gitignore 就创建项目本地 worktree
- 跳过基线测试验证
- 测试失败不询问就继续

总是：
- 先执行步骤 0 检测
- 原生工具优先于 git 回退
- 目录优先级：显式指令 > 项目内既有 > 默认
- 自动检测并完成项目设置
- 验证干净测试基线

## 相关文档

- `references/branch-integration.md` — 对应的清理流程
- `references/plan-execution.md` — worktree 创建在 execute 阶段的接入点
- `references/completion-verification.md` — 完成前最终测试验证
