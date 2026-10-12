#!/bin/bash
# 用法: ./scripts/check-annotations.sh <HTML/Markdown/JSON 文件或目录>
set -euo pipefail

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

check() {
  if node "$SCRIPT_DIR/validate-annotations.js" "$1"; then
    PASS=$((PASS+1))
  else
    FAIL=$((FAIL+1))
  fi
}

if [ -f "$TARGET" ]; then
  check "$TARGET"
elif [ -d "$TARGET" ]; then
  while IFS= read -r -d '' file; do
    check "$file"
  done < <(find "$TARGET" -type f \( -name '*.html' -o -name '*.md' -o -name '*.json' \) -print0)
else
  echo "目标不存在: $TARGET" >&2
  exit 1
fi

echo "通过: $PASS  失败: $FAIL"
if [ "$PASS" -eq 0 ] && [ "$FAIL" -eq 0 ]; then
  echo "未找到注释文件" >&2
  exit 1
fi
[ "$FAIL" -eq 0 ]
