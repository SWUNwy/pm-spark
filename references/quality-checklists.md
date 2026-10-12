# 注释质量检查与评审

所有 PM 注释以六字段和组件类型检查完整性。工程交接独立说明技术要求，不在 PM 评审页面中折叠存放实施字段。

## 作者自检

- [ ] 每个交互组件有唯一 ID/锚点，并映射到 T1–T11 类型。
- [ ] `summary` / `feature` / `logic` / `states` / `boundary` 均有非空产品描述。
- [ ] 关键可见文案全部列入 `copy`；无文案时省略，不能填空值。
- [ ] 行为说明包含触发、界面响应、成功/失败结果、关闭和取消（如适用）。
- [ ] 状态按照 `annotation-templates.md §3` 覆盖；条件不适用时说明理由。
- [ ] 输入范围、必填、枚举、权限、重复提交、空数据和异常恢复描述完整。
- [ ] 使用产品语言，无代码语法、模糊词、占位文本；同一术语跨组件一致。
- [ ] 数据中没有旧注释深度字段、标签映射或实现明细。
- [ ] 运行 `validate-annotations.js`，无错误；警告已评估。

## 文档与 HTML 一致性

- [ ] 结构化六字段是唯一来源，HTML 与 design.md 使用相同内容。
- [ ] proposal 的需求 ID 与组件 `logic` 引用一致；tasks 的注释引用章节存在。
- [ ] Component Manifest 的 ID、名称、类型、位置和字段完整性对应实际组件。
- [ ] 每个 review-docs 条目有非空 `summary`、`type` 和 annotation 必填字段。
- [ ] `scopeMark` 为 existing/new/adjusted，`protoId` 对应原型锚点。
- [ ] `decision` 仅在场景级，空场景正确展示空态。
- [ ] 左右悬停高亮、点击定位、场景切换、徽标重新注入正常。
- [ ] 右栏拖宽与记忆、窄屏堆叠正常。
- [ ] 内联、侧栏或编辑功能存在时，修改六字段后全部展示同步更新。
- [ ] HTML 修正已反向同步 design.md；受影响的 proposal/tasks 引用已更新。

## 角色评审

| 角色 | 关注 PM 字段 | 核对内容 |
|---|---|---|
| PM | summary、feature、logic、boundary | 用途、范围、规则、权限与需求一致 |
| 开发 | logic、states、boundary | 操作序列、可见反馈、恢复路径和字段约束足以实现 |
| 测试 | logic、states、boundary、copy | 正常、错误、空态、边界和文案可验证 |
| UI | states、copy、logic | 状态视觉语义、提示位置、文案与交互一致 |

接口契约、内部状态机、CSS参数、无障碍和响应式技术要求仅在明确选择的 implementation 交接中评审；不能要求 PM 为这些技术字段选择注释标签。

## 审核与修改

1. 作者完成自检并运行脚本。
2. 各角色输出 approve / change-requested / not-applicable。
3. 汇总阻断项，修正六字段并同步文档，再运行验证。
4. 审核通过后在独立评审记录中登记状态、时间、审核人和变更原因；产品注释保持六字段契约。

脚本检查字段结构、类型和锚点，不自动裁定自然语言是否覆盖全部业务语义。旧文件检查显式使用 `--legacy`，不能代替当前输出验证；迁移草稿缺字段时必须补充后交付。

## 与 v6.1 验收的边界

- 本清单只判定 PM 注释的产品内容质量；`approve`、`change-requested` 和 `not-applicable` 是评审结果，不是新的等级、轨道或权限选择。
- Intake Audit 按 `references/intake-audit.md` 的影响范围执行：只追问会改变当前结论、范围、风险或交付类型的缺口，信息足够时停止，不要求六个维度全部有答案。
- 真实对话验收按 `references/pm-behavior-acceptance.md` 与 `tests/pm-behavior/results.json` 单独记录。静态检查、注释校验或本清单通过，均不得推断真实对话已通过。
- 本清单通过只表示注释内容完成相应检查，不代表 Spec 就绪、实施授权或发布完成。
