# CI/CD 集成

> v3.7 从 SKILL.md 下沉至此（内容不变），保持 SKILL.md 行数预算。

spec-analyze 的输出文档可以作为 CI 管道的质量门禁：

## 注释质量检查（GitHub Actions 示例）

```yaml
# .github/workflows/annotations-check.yml
name: Check Annotations
on:
  pull_request:
    paths: ['docs/requirements/specs/active/**/*.md']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 运行注释质量检查
        run: |
          chmod +x scripts/check-annotations.sh
          ./scripts/check-annotations.sh docs/requirements/specs/active/
```

## 检查门禁规则

| 门禁 | 通过条件 | CI 阻断级别 |
|------|---------|------------|
| HTML 注释格式 | 0 未闭合注释 | error（阻断合并） |
| PM 必填字段完整性 | 五个必填字段均为非空字符串，copy 可选 | error（阻断合并） |
| 组件类型标注 | T1–T11，逐组件检查 | error（阻断合并） |
| 文档完整性 | 路径指定文档齐全 | error（阻断合并） |

## 预提交钩子

```bash
# .git/hooks/pre-commit
#!/bin/bash
# 在提交前检查注释格式
FILES=$(git diff --cached --name-only --diff-filter=AM | grep '\.md$')
for f in $FILES; do
  UNCLOSED=$(grep -c '<!--' "$f")
  CLOSED=$(grep -c -- '-->' "$f")
  if [ "$UNCLOSED" -ne "$CLOSED" ]; then
    echo "错误: $f 中存在未闭合的 HTML 注释"
    exit 1
  fi
done
```
