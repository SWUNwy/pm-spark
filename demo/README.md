# PM Spark Demo

交互式评审注释演示：左侧优惠券原型，右侧常驻「PRD 注释」面板，编号徽标将条目与组件关联。

```bash
open demo/demo.html
node scripts/validate-annotations.js demo/demo.html
node scripts/test-relationship-layer.cjs
```

| 功能 | 说明 |
|---|---|
| 编号徽标 | 组件右上角编号与右栏条目序号对应 |
| PM 六字段 | 摘要、功能定位、交互逻辑、状态说明、边界条件、可选 UI 文案 |
| 组件类型 | 条目 type 用于核对行为与状态完整性 |
| 双向高亮与滚动 | 悬停组件滚动右栏，点击条目定位左侧原型 |
| 场景切换 | 优惠券创建 / 核销，右栏与徽标同步更新 |
| 范围标记 | 已有 / 新增 / 调整 |
| 口径建议 | 可选场景级 decision |
| 拖宽与记忆 | 18%–30%，刷新保留 |
| 窄屏堆叠 | 视口不超过 760px 时纵向排列 |

`demo.html` 是当前示例；`screenshot-1.png` / `screenshot-2.png` 为演示截图。review-docs JSON 是内容唯一来源；CSS/JS 与 `annotation-output-templates.md` 权威模板保持一致。

人工验证：编号配对、悬停双方高亮、点击定位、场景切换、拖宽后刷新记忆、窄屏堆叠、无条目空态，以及六字段文案与原型一致。旧注释格式只在测试夹具中通过显式兼容入口读取，当前 demo 不提供注释深度选择。
