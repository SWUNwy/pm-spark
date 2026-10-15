# history/retired — 分支集成

本文档《分支集成》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 完成开发分支

## 加载时机

实施完成、测试通过、准备决定如何集成工作时加载。工作区清理与 `git-worktree-isolation.md` 配合使用。

## 流程

```
验证测试 → 检测环境 → 确定基分支 → 展示选项 → 执行 → 清理
```

## 第 1 步：验证测试

展示任何选项之前：

```bash
# 按项目选择合适的测试命令
npm test / cargo test / pytest / go test ./...
```

测试失败：停下，展示失败结果。测试通过之前不提供 merge/PR 选项。

## 第 2 步：检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

| 状态 | 菜单 | 清理归属 |
|---|---|---|
| `GIT_DIR == GIT_COMMON`（普通仓库） | 标准 4 选项 | 无 worktree 可清理 |
| `GIT_DIR != GIT_COMMON`，命名分支 | 标准 4 选项 | 按来源判断（第 6 步） |
| `GIT_DIR != GIT_COMMON`，分离 HEAD | 缩减为 3 选项（无 merge） | 无——外部管理 |

## 第 3 步：确定基分支

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

或与用户确认："This branch split from main — is that correct?"

## 第 4 步：展示选项

**普通仓库或命名分支 worktree——正好 4 个：**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**分离 HEAD——正好 3 个：**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
3. Discard this work

Which option?
```

不添加解释或开放式追问，保持选项简洁。

## 第 5 步：执行选择

### 选项 1：本地合并

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>      # 在合并结果上重新验证
```

合并成功：先清理 worktree（第 6 步），再 `git branch -d <feature-branch>`。

### 选项 2：推送并创建 PR

```bash
git push -u origin <feature-branch>
```

不清理 worktree——PR 迭代还需要它。

### 选项 3：保持原样

汇报：`Keeping branch <name>. Worktree preserved at <path>.`

不清理 worktree。

### 选项 4：丢弃

先确认：

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

等待精确的 `discard` 输入。然后 `cd` 到 MAIN_ROOT，执行清理（第 6 步），再 `git branch -D <feature-branch>`。

## 第 6 步：清理工作区

只对选项 1 和 4 执行。选项 2 和 3 始终保留 worktree。

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

- `GIT_DIR == GIT_COMMON`：普通仓库，无需清理，结束。
- worktree 路径位于 `.worktrees/` 或 `worktrees/` 下：本规范负责清理：
  ```bash
  MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
  cd "$MAIN_ROOT"
  git worktree remove "$WORKTREE_PATH"
  git worktree prune
  ```
- 其他情况：工作区归宿主环境管理，不要删除。有平台级退出工具就用，否则留在原地。

## 快速参考

| 选项 | 合并 | 推送 | 保留 worktree | 清理分支 |
|---|---|---|---|---|
| 1. 本地合并 | 是 | — | — | 是 |
| 2. 创建 PR | — | 是 | 是 | — |
| 3. 保持原样 | — | — | 是 | — |
| 4. 丢弃 | — | — | — | 是（force） |

## 常见错误

| 错误 | 修正 |
|---|---|
| 跳过测试验证 | 展示选项前总是先验证测试 |
| 开放式提问 | 精确展示 4 个选项（分离 HEAD 为 3 个） |
| 选项 2 清理 worktree | 只有选项 1 和 4 需要清理 |
| 先删分支再删 worktree | `git branch -d` 会失败——先合并、再删 worktree、再删分支 |
| 在 worktree 内部执行 `git worktree remove` | 先 `cd` 到主仓库根目录 |
| 清理非本规范创建的 worktree | 只清理 `.worktrees/` 或 `worktrees/` 下的 worktree |
| 丢弃无确认 | 要求精确输入 `discard` |

## 红线

绝不：
- 测试失败仍继续
- 不重新验证合并结果的测试就合并
- 无 `discard` 确认就删除工作
- 未经用户明确要求 force-push
- 确认合并成功前移除 worktree
- 清理并非本流程创建的 worktree（来源检查）
- 从待移除的 worktree 内部执行 `git worktree remove`

总是：
- 展示选项前验证测试
- 展示菜单前检测环境
- 精确展示 4 个选项（分离 HEAD 为 3 个）
- 选项 4 要求键入 `discard`
- 只对选项 1 和 4 清理 worktree
- 移除 worktree 前 `cd` 到主仓库根
- 移除后执行 `git worktree prune`

## 相关文档

- `references/git-worktree-isolation.md` — 工作区创建与镜像清理检测
- `references/completion-verification.md` — 完成前的最终验证
- `references/plan-execution.md` — 完成流程在 execute 阶段的接入点
