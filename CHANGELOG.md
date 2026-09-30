# Changelog

## 5.0.0 (2026-09-30)

### Changed — 架构重构（Breaking Change）
- **架构重构：复杂度三路径 → PM 处境五模式** — 废弃 Lightweight/Standard/Full 路径分级，改用贴合 PM 实际工作处境的五模式架构；入口从"判断复杂度"改为"识别处境"
- **路由机制升级：关键词匹配 → 意图识别** — 识别规则改为按 PM 处境（意图）描述，示例词为非完整列表；AI 按意图路由而不是词语匹配；新增常见歧义询问表
- **intake-audit 定位调整** — 六维度从强制前置门禁改为模式一（理解问题）中按需调用的工具；不再要求"先审计再分析"

### Added
- **模式二：挑战需求** — 新增最重要的 PM 判断力场景：识别需求假设、找出漏洞、准备推回去的论据；输出假设地图 + 挑战问题清单 + 三选一裁定（推进/先验证X/推回去）
- **模式五：做决策** — 新增决策支持模式：按场景推荐 RICE/ICE/Kano/MoSCoW/Decision Matrix，引导 PM 评分，给出推荐 + 最影响结论的变量 + 推翻条件
- **模式衔接规则** — 每个模式结束时主动提示自然下一步，形成工作流链（理解→挑战→设计→规格化→决策）
- **常见歧义询问表** — 「分析这个需求」「看看这个方案」等歧义输入有明确的询问规则

### Changed
- **模式一（理解问题）** — 原 Intake 六维度全问改为只问最关键的 1-2 个；输出清晰版问题陈述 + 关键未知项 + 建议下一步
- **模式三（设计方案）** — 原 Full 路径的发散/收敛提炼为精简版：按意图选框架 → 2-3 方向对比 → 推荐 + 推翻条件
- **模式四（规格化与交付）** — 拆分为三子模式：4A 原型注释 / 4B PRD 撰写 / 4C Spec 三文档；4C 新增 Spec Freeze 确认门禁
- **角色激活方式** — 从"路径决定数量（Full=全5个）"改为"模式意图驱动选择"；每个模式明确指定激活哪些角色
- SKILL.md 版本 4.0.0 → 5.0.0

---

## 4.0.0 (2026-09-30)

### Changed — 注释系统重构（Breaking Change）
- **移除 SVG 连线，改用编号徽标锚定 + 滚动联动** — 删除 `#connections` SVG 元素和 `drawConnections()` 函数；每个被注释组件右上角注入蓝色圆形徽标（`.anno-badge`），徽标数字 = 条目序号；悬停左侧组件 → 右侧对应注释滚动进视口并高亮；点击右侧注释 → 左侧原型滚动到对应组件
- **注释 schema 重构：L1/L2/L3 → PM 6 字段** — `items[]` 旧字段（`text` + `L2` + `L3`）替换为产品层专用 schema：`summary`（目录扫读摘要）/ `feature`（功能定位）/ `logic`（交互逻辑）/ `states`（状态说明）/ `boundary`（边界条件）/ `copy`（UI 文案，可选）
- **doc-panel 文档感增强** — 左边框从 `2px dashed #93c5fd` 改为 `3px solid #3b82f6`；新增固定标题栏「PRD 注释」
- **delivery-contract.json 字段层级修正** — `L2`/`L3` 从 `product` 层移入 `implementation` 层；新增 PM 6 字段归 `product` 层

### Added
- **PM 注释内容硬约束** — 禁止出现 API 路径、HTTP 状态码、CSS 像素值、timing 参数、aria 属性、i18n key；注释只包含产品层内容
- **annotation-templates.md PM 路径约束章节** — T1-T11 类型模板前新增 PM 输出路径禁用字段清单

### Changed
- **SKILL.md 从 1375 行压缩至 ~250 行** — 删除内联的完整分析流程；PM 注释快速路径提升为顶部自包含章节；完整分析路径改为参考文件指针 + 懒加载规则
- `references/annotation-example.md` 完整替换为 PM-only 示例（feature/logic/states/boundary/copy 六字段格式，含禁止内容清单）
- `references/html-annotation-system.md` §2.8 更新为两层架构（Product + Annotation，删除 SVG Relationship 层）
- SKILL.md 版本 3.8.1 → 4.0.0


## 3.8.1 (2026-09-21)

### Changed
- **`demo/review-mode.html` 重命名为 `demo/demo.html`** — 文件用途更自描述，AI 引用更精准，prompt 书写更省力；全库引用同步（SKILL.md × 9 处、demo/README.md × 3 处、README.md × 1 处）
- SKILL.md 版本 3.8.0 → 3.8.1；README.md 版本号同步

## 3.8.0 (2026-09-21)

### Added
- **新分流规则「直接注释生成」** — 匹配「规范输出注释」「交互注释规范」「严谨参照 + 注释」「按 demo 格式」等指令；覆盖其他路由信号，跳过全部分析步骤，直接进入 HTML 评审面板生成
- **DAG 流程（DAG-1→DAG-5）** — 上下文提取 → 组件识别 + 类型映射 → ANNOTATIONS 数据填充 → HTML 评审面板生成（以 `demo/review-mode.html` 为形态锚点）→ 验证；无需 opt-in 确认，默认直接产出

### Changed
- **HTML 评审面板从 opt-in 改为默认输出** — Step 8F、Step A5、Full 路径表格、S3b 门禁 4 处统一改为「默认生成，用户明确拒绝时跳过」；Step 9F / S3b 条件从「用户同意内建时执行」改为「用户未明确拒绝时执行」
- **`demo/review-mode.html` 纳入规范锚点** — 原型注释产出、已有方案注释产出、Step 8F 行为描述、Step A5 输出列表 4 处明确引用，作为 HTML 评审面板目标形态权威
- **S4 DoD 语义拆分** — 「注释默认评审视图且为中文」拆为两条独立检查项：注释内容展示模式（评审视图 / 中文角色标签）与注释输出格式（默认 HTML 评审面板；用户明确拒绝时降级为 markdown Annotation Block）
- SKILL.md 版本 3.7.7 → 3.8.0

### Background
- 根本原因：无「直接注释生成」路由 + HTML 面板为 opt-in + demo 文件未纳入规范锚点 + S4 DoD 语义歧义；导致直接发送「严谨参照 spec-analyze 交互注释规范输出注释」类指令时无法得到预期的 HTML 评审面板输出

## 3.7.7 (2026-09-17)

### Removed
- **demo 收敛为 review-mode 唯一演示** — 删除 `demo/index.html`（v3.2 评审/实施双视图演示页，1033 行）；`demo/review-mode.html`（v3.7 评审模式连线演示）成为唯一演示页

### Changed
- README 快速开始与演示说明改指向 `demo/review-mode.html`，两张截图由「评审视图/实施视图」重标注为「优惠券创建/优惠券核销场景」；架构树 demo 注释同步
- `demo/README.md` 整体重写为 review-mode 单页说明（功能表 / 文件表 / 数据与脚本 / 人工验证清单）
- SKILL.md 变更摘要示例（`📄 HTML index.html`）与「规范更新流程」第 4 步的 demo 引用同步改为 review-mode.html
- SKILL.md 版本 3.7.6 → 3.7.7

### 说明
- 「评审视图 / 实施视图」双显示模型仍为核心能力（定义于 `references/annotation-output-templates.md` 等文件与 `annotation_view` 状态字段），本次仅移除其演示页，能力本身未删

## 3.7.6 (2026-09-17)

### Changed
- **README 刷新至 v3.7 全貌** — 版本号 v3.6.2 → v3.7.5 起的滞后全部补齐：核心能力新增需求质量双门禁（Intake Audit / S-AR）、评审就绪 PRD 输出、PMFrame 思维模型库三节；回归测试计数 93 → 101；架构树补入 intake-audit / adversarial-review / prd-output-template / review-readiness-checklist / pmframe 等新文件；快速开始新增评审模式示例页入口；版本历史表压缩补齐 v3.6 / v3.7 行
- `demo/README.md` 评审模式验证清单修正：连线高亮描述从琥珀色更新为 v3.7.2 后的蓝色系（常态淡蓝 55% 透明度 → 高亮全显）

### 说明
- 本版本为纯文档同步，无代码变更；此前 v3.6.0–v3.7.5 迭代期间 README 未随版本刷新，开源仓库推送后暴露滞后

## 3.7.5 (2026-09-16)

### Fixed
- **开源隐私清洗** — 移除全部本地用户路径（绝对家目录路径）：`references/pmframe-index.md` 来源行改为「PMFrame 本地思维模型库（私有源，未随本仓库分发）」；100 个 pmframe SKILL.md frontmatter `source` 字段从绝对本地路径改为 `PMFrame/<模型名>` 相对标识。清洗前全库 101 处泄漏，清洗后 0

### Added
- phase9-008-privacy-scrub 回归测试：全库跟踪文件扫描（跳过 .gitignore 同款目录，>250 文件覆盖度断言），家目录与下载目录路径模式恒为 0；突变验证（注入即捕获）通过。测试套件 100 → 101 项

### Changed
- SKILL.md 版本 3.7.4 → 3.7.5

## 3.7.4 (2026-09-16)

### Changed
- **PMFrame 单文件化（SKILL.md + README.md 合并）** — 双文件结构（核心内容在 README.md，SKILL.md 仅 26 行方法步骤）导致每次使用需两跳引用，引用效率低。README 深度内容清洗后并入同目录 SKILL.md（frontmatter + Steps/Output Format + 深度参考章节），删除全部 100 个 README.md，一次读取即获全量
- **网站残留清洗（100/100 README 全部污染）** — 剥离 8 类 pmframe.works 网页残留：头部导航（`[← 返回框架列表]`、`#NN · 分类`、`Framework Deep Dive`、两行式假标题）、`[下载 Skill]` 按钮、meta 徽章（来源/适合阶段/使用时长）、内联 CSS、尾部「配合使用」死链推荐段（整段删除，含 framework-*.html 链接）、`继续阅读下一个 →`、`pmframe.works · © 2026`、IIFE 脚本（hero-svg/收藏按钮，含 markdown 转义乱码）
- **排版规整** — 网页版式转标准 Markdown：编号章节行（`01 它解决什么问题`，白名单匹配防误转普通数字文本）→ `##` 标题、setext 下划线小节 → `###` 标题、空行收敛
- `references/pmframe-index.md` 读取约定同步更新（单文件结构，README.md 不复存在）；v3.7.2 的 SKILL.md 末尾指针行随合并移除
- SKILL.md 版本 3.7.3 → 3.7.4

### Added
- phase9-007-pmframe-clean 回归测试：断言 100 模型仅存 SKILL.md、frontmatter 完整、全库零网站残留（9 类垃圾模式恒为 0）；突变验证确认注入即可精确捕获。测试套件 99 → 100 项

### 说明
- 清洗采用白名单规则而非无差别转换：正文以数字开头的普通文本行（飞轮碎片、案例叙述、时长徽章）保持原样，仅转换经全库章节普查确认的标准章节名（611 处）

### Added
- **phase9-006-template-sync 同源守护** — 模板对评审模式 CSS/JS 块声明「原样嵌入，禁止手改」，但此前无任何自动化守护，主题/契约变更全靠手工三处同步（补丁叠补丁根因）。新增测试：以 `/* ===== */` 分节注释为界提取 demo 与权威模板的 CSS/JS 块，断言字节级相等；突变验证确认 0.05 透明度漂移即可精确捕获。「同源」从人工纪律升级为机器恒等式

### Fixed
- **#connections 契约正则子串误判** — `/width:\s*100%/` 会把 `min-width:100%` 误判为 `width:100%`（子串匹配），修复为声明级锚定 `/(?:^|;)\s*width:100%/`；phase9-005 新增 min-width/min-height 反例（红→绿）

### Changed
- phase9-005 突变方式从精确字符串替换改为正则替换（格式漂移时不再依赖 CSS 精确文本）
- SKILL.md 版本 3.7.2 → 3.7.3；测试套件 98 → 99 项

## 3.7.2 (2026-09-16)

### Added
- **PMFrame README 激活（方案①）** — 100 个 `references/pmframe/*/*/SKILL.md` 末尾统一追加深度展开指向行（SKILL.md 为快速路由入口，README.md 为完整参考：详细步骤、示例与适用边界），消除 README 内容不可达的 P1 断层；`references/pmframe-index.md` 说明行同步更新读取顺序约定

### Changed
- **评审模式主色调琥珀 → 淡蓝** — demo/review-mode.html、annotation-output-templates.md 权威模板、html-annotation-system.md 布局契约同步：连线常态 `#3b82f6`/2px/55%，高亮态 `#2563eb`/3px/100%，右栏 `#eff6ff` + `#93c5fd` 虚线边，徽标/标签/口径建议盒全套蓝色系，中性色 stone → slate；scopeMark 语义色保留（新增=绿、调整=橙）

### Removed
- 删除 `references/parallel-agent-dispatch.md`（全仓 0 引用的真孤儿文件）

### 说明
- 孤儿文件审计修正：初判 6 个候选孤儿中，5 个（constitution / framework-combinations / stage-contracts / visual-companion / visualization）为承重文件——被 `run-state.cjs` 阶段契约绑定与测试夹具 `required_references` 存在性校验（`evaluate-tests.cjs:68`）依赖，予以保留，仅删除 1 个真孤儿

## 3.7.1 (2026-09-16)

### Fixed
- **评审模式连线不可见（P0）** — `#connections` SVG 缺显式 `width:100%/height:100%`：SVG 是替换元素，`inset:0` 不会拉伸，回退内在尺寸 300×150 导致全部贝塞尔连线被裁剪（对照用户参考原型确认）。同源修复 demo / annotation-output-templates.md 权威模板 / html-annotation-system.md 布局契约
- **连线常态不可辨识** — stroke `#d6d3d1`（浅灰）在 `#f5f5f4` 背景上近不可见，改为琥珀色低透明度常态（`#d97706`/2px/55%），高亮态全显（`#f59e0b`/3px/100%），透明度过渡 0.18s
- `scripts/validate-annotations.js` 新增 #connections 尺寸契约校验（缺 width/height 或缺整个规则即 error，含根因说明）；`scripts/test-automated.cjs` 新增 phase9-005 回归测试（红→绿）

### Removed
- 删除 `.claude/skills/spec-analyze/` 过期整库副本（v3.5.0 重命名前意外提交，149 文件，干扰 skill 解析）

## 3.7.0 (2026-09-15)

### Added
- **评审模式 HTML 原型（B1-B10）** — `demo/review-mode.html`：右侧注释面板与原型区以带编号连线关联（SVG overlay，滚动/缩放重绘，悬停双向高亮）；面板可拖宽（18%–30%，localStorage 记忆）；场景切换、空态、L2/L3 折叠、≤760px 移动端降级；`scripts/validate-annotations.js` 新增 review-docs 结构校验（场景/条目/protoId 配对/scopeMark 枚举）
- **Intake Audit 需求摄入审计门禁（A1/A2/A5）** — `references/intake-audit.md`：六维度计分卡（背景与问题/目标与价值/用户与场景/功能边界/成功指标/约束与依赖），任一缺失分步追问（每轮一个），全维度 Ok/Waived 才进入分析；Lightweight 降级为单条提示；吸收 M0-M3 内容清点（标签仅用于路径选择）
- **S-AR 对抗性审查门禁（A3/A4）** — `references/adversarial-review.md`：S3 通过后、8F 之前触发；Risk Challenger 主导（`references/personas.md` 新增 S-AR 主导职责）+ 按分析类型选 1-2 个辅助角色；发现分 blocking/advisory 两级，未解决的 blocking 阻断产出（run 转 awaiting_user）；审查结果落盘 `review-log.md` 独立工件；`references/quality-checklists.md` 新增双门禁通过条件
- **PMFrame 思维模型库（C1/C2）** — `references/pmframe/`：100 个思维模型按 10 领域入库（战略与市场/商业模式/增长与指标/用户研究/需求与优先级/创意与发散/决策与评估/流程与交付/系统与问题思维/验证与叙事），frontmatter 规范化（name/description/source/imported）；`references/pmframe-index.md` 全量映射 + 12 场景路由表；SKILL.md 参考地图新增入口行

### Changed
- SKILL.md 版本 3.6.2 → 3.7.0；Step 0 新增 Intake Audit 触发段；门禁区新增 S-AR 触发段；CI/CD 集成章节下沉至 `references/cicd-integration.md`（-44 行）
- 参考**去重审计**：四组名称相近文件（annotation 三件套 / root-cause 三件套 / spec-frameworks vs spec-templates / router vs router-rules）评估后全部保留，理由记录于 `references/advanced-capabilities.md`

### 验收对照
18 条验收标准（B1-B10 / A1-A5 / C1-C2 / D1-D2）全部通过：测试 97 passed, 0 failed；review-mode 结构校验 0 错 0 警；PRD 夹具 exit 0/1 符合预期；SKILL.md 1364 行 ≤ 1398 预算。

## 3.6.2 (2026-08-14)

### Changed
- **注释规范落地（全中文 + 注释不含 API）** — 目标：展示完整的产品原型评审，尽可能减少不必要信息的误导与摩擦
  - validate-annotations.js 新增中文块名归一化（CHINESE_BLOCK_MAP + normalizeBlockTitle）：中文标题（触发条件/行为描述/列定义/分页 等）可正确匹配必填块，不再误报「缺少必填块」
  - API 从 T2/T6/T7/T8 的必填块与共享块中移除：注释体系不再要求 api 块，API 仅存于评审就绪 PRD §7 接口需求
  - VIEW_DESCS 卡片覆盖行移除 API（接口行不再作为覆盖项）
- prd-output-template.md 头部补充「注释规范」说明（全中文展示；注释不含 API）

### Added
- tests/annotations/chinese-titles.html — 中文块标题回归（全中文标题验证通过）
- tests/annotations/no-api.html — 无 API 块回归（api 不再必填）
- scripts/test-annotations.cjs 扩展至 4 项断言

### Fixed
- SKILL.md 版本 3.6.1 → 3.6.2

## 3.6.1 (2026-08-14)

### Added
- **validate-annotations.js VIEW_DESCS 兼容模式** — 支持解析右侧研发注释面板卡片格式（const VIEW_DESCS = {...}）：检查每张卡片必填行（触发/行为/状态）与覆盖行（样式/接口/权限/验收/复用/字段），统计 AC/REUSE 引用；ANNOTATIONS 模式行为不变
- **scripts/test-annotations.cjs + tests/annotations/** — VIEW_DESCS 兼容模式回归测试（完整卡片通过 + 缺状态卡片命中缺失）

### Changed
- SKILL.md 版本 3.6.0 → 3.6.1

## 3.6.0 (2026-08-14)

### Added
- **评审就绪 PRD 输出能力** — references/prd-output-template.md（14 章节研发交付文档模板，覆盖公司 PRD 模板全章节：文档信息/修订记录/背景竞品收益成本/页面结构/状态流转/业务流程/数据字段/接口/验收/注意事项/埋点报表/上线下线/运营/风险/相关文档）
- **研发评审就绪清单 RC-01~52** — references/review-readiness-checklist.md（治理/背景价值/功能流程/数据接口/交付验收/运营风险六组，阻断/建议/提示三级），接入 spec-document-reviewer-prompt.md 作为 PRD 完整性检查面
- **scripts/validate-prd.js** — 评审就绪 PRD 完整性验证脚本（RC 规则化，支持 Markdown/HTML，输出 Ready/Conditional/Not Ready 判定与评级）
- **HTML 原型首屏规则** — 生成 HTML 原型交付物时，评审就绪 PRD 为第一个视图（首屏）
- **scripts/test-prd.cjs + tests/prd/** — validate-prd.js 回归测试（完整样本 Ready + 缺陷样本 Not Ready 命中 RC-22/RC-40）

### Changed
- SKILL.md 版本 3.5.2 → 3.6.0；Step 8F 默认同时生成评审就绪 PRD；输出路径表新增 Full（评审交付）行；文件索引补齐
- 修复 SKILL.md 版本规范正文（`2.0.0` → `3.6.0`）与 README 版本号（3.5.1 → 3.6.0）的漂移

## 3.5.2 (2026-08-10)

### Added
- **Demo 升级为评审/实施双视图模型** — `demo/index.html` 注释面板对齐 v3.2 显示规范：默认中文评审视图（【开发】【开发·测试】【UI】【测试】角色标签 + 触发/行为/视觉要点/用户可见状态 + 字段摘要表），可切换实施视图（state 全分支、API、Permission、timing、accessibility、responsive）；支持深度链接 `?panel=<key>&view=<review|implementation>`
- **README 全面更新至 v3.5.1 全貌** — 补齐双视图显示模型、输出硬约束（lint + CI）、营销术语覆盖、版本历史表；架构树测试数修正为 93 项
- **Demo 截图重拍** — 新增 `demo/screenshot-review.png`、`demo/screenshot-implementation.png`，重拍 `demo/screenshot-full.png`（2x 高清）

### Changed
- SKILL.md 版本 3.5.1 → 3.5.2
- `demo/README.md` 同步更新（移除不存在的 screenshot-panel.png 引用，补充深度链接用法）

## 3.5.1 (2026-08-10)

### Changed
- **小红书海外官方名称** — `xiaohongshu`（拼音）→ `rednote`（官方英文名，全小写；2025-01 起 App Store / Google Play 统一，`RedNote`/`REDnote` 为媒体俗写）；原映射「小红书」仅适合中文语境，海外语境统一改用官方英文名
- SKILL.md 版本 3.5.0 → 3.5.1

### Added
- lint 自测新增 2 项（`xiaohongshu`→`rednote` 正向 + 官方拼写无误报），自测增至 20 项
- 新增 phase8-094 回归用例（`xiaohongshu` → `rednote` 品牌规则）

## 3.5.0 (2026-08-10)

### Added
- **营销术语覆盖扩充（第二轮）** — Affiliate / Social / Influencer Marketing 常用名词补全：
  - 品牌：WeChat/Reddit/Discord/Twitch/Bilibili/Douyin/Kuaishou/小红书/Substack/Dribbble/Behance + 联盟平台（Tradedoubler/Webgains/Admitad/Cityads/Affise/Everflow/Partnerize/Tapfiliate）+ 追踪工具（Voluum/RedTrack/Binom/Keitaro）
  - 缩写：MCN/CPV/eCPM/eCPI/GDPR/CCPA/COPPA/FTC/IVT/SIVT/GIVT/RTB/DSP/SSP/PMP/DMP/CDP/CRM/ERP/OKR/SERP/NPS/IAA/IAP + Tier 1/2/3 分层
  - 达人营销错词：influenzer/microinfluencer/nanoinfluencer/macroinfluencer/megainfluencer/affilite/converison/impresion
- 新增 phase8-093 营销覆盖回归用例；lint 自测增至 18 项

### Changed
- SKILL.md 版本 3.4.0 → 3.5.0
- `chinese-writing-style.md` 营销章节按领域分节（社交/联盟/达人/程序化/合规）

## 3.4.0 (2026-08-09)

### Added
- **营销/增长领域术语覆盖** — 品牌名（tiktok→TikTok、google ads→Google Ads、appsflyer→AppsFlyer 等）与常用缩写（cpa/cpm/ctr/roi/roas/ltv/cac/kol/koc/saas/b2c 等）纳入大小写硬约束；营销错词（affliate/campain/converion 等）纳入错词表
- **误报修复** — 大小写规则改为只匹配非规范小写变体，已正确形式（GitHub/JavaScript/gRPC 等）不再被误报；新增 phase8-092 回归用例

### Changed
- SKILL.md 版本 3.3.0 → 3.4.0
- `lint-output-text.js` 规则表扩展；`chinese-writing-style.md` 术语表新增营销领域章节；自测增至 12 项

## 3.3.0 (2026-08-09)

### Added
- **输出硬约束（默认强制）** — `references/chinese-writing-style.md` 新增「输出硬约束」章节：英文大小写（id→ID、api→API 等）、确定错词、直角引号、数量逻辑、术语一致、机器内容保护为**必须遵守**；语境词/上下文词/空泛词为**必须提示确认**
- **自动校验器** — 新增 `scripts/lint-output-text.js`（零依赖）：三级结果（error/warning/style），自动跳过代码块/行内代码/URL/API 路径；支持 `--strict` 与 `--self-test`；S4 门禁要求 error 清零
- **CI** — 新增 `.github/workflows/spec-lint.yml`：PR/push 时运行测试套件与校验器自测

### Changed
- SKILL.md 版本 3.2.0 → 3.3.0；8F 输出要求通过硬约束校验；S4 新增校验检查项
- `test-automated.cjs` 新增校验器自测用例

## 3.2.0 (2026-08-09)

### Added
- **注释显示模型：评审视图 / 实施视图** — 注释默认**评审视图**（中文角色标签【开发】/【开发·测试】/【UI】/【测试】；展示触发、行为、关闭、用户可见状态、视觉要点、UI 文案、字段摘要表；隐藏 state 全枚举、timing、API、Permission、i18n、accessibility），按需展开为实施视图
- **字段级注释双形态** — 评审视图用字段摘要表（字段/必填/规则/空值文案/来源），实施视图保留 ℹ️ 逐字段弹窗
- **注释约束示例** — 新增 `references/annotation-example.md`，8F 输出时引用
- SKILL.md Session State 新增 `annotation_view` 字段；S4 质量自检新增评审视图检查项

### Changed
- SKILL.md 版本 3.1.0 → 3.2.0
- `annotation-output-templates.md` 增加显示模型定义与评审视图示例
- `html-annotation-system.md` 增加 2.7 评审/实施视图切换

## 3.1.0 (2026-08-09)

### Added
- **中文技术写作规范** — 新增 `references/chinese-writing-style.md`（术语/排版/状态词/界面文案/数字逻辑）与 `references/controlled-operations-writing.md`（操作文档与故障排查受控写作），接入 SKILL.md（参考地图、文件索引、8F 输出生成、S4 质量自检、「闭环」首现定义）
- **零痕迹原创重写** — 15 个参考文档改写为原创表达（功能完整保留），移除全部第三方署名痕迹，实现全仓库零第三方痕迹

### Changed
- SKILL.md 版本 3.0.0 → 3.1.0
- 全仓库第三方署名与作者痕迹审计：0

### Security
- 重写采用「表达原创、功能保留」的合规路径，无逐字复制第三方内容

## 3.0.1 (2026-08-09)

### Added
- **LICENSE** — MIT License（Copyright (c) 2026 SWUNwy）
- **README 中文化** — 全仓库说明文档改为中文（代码块/命令/图表保留英文）

### Fixed（v3.0 审计）
- README 门禁命名与 SKILL.md 统一（G1–G4 → S1–S4），消除与新闭环 G1/G2/G3 的撞名
- `references/personas.md`、`references/annotation-output-templates.md` 从英文全文中文化
- SKILL.md 新增「与标注流程的衔接」（闭环 ↔ 标注流程接线：init 时机、S1–S4 记录、产出交接、恢复规则）
- README 坏链接修复（scenario-stress-test → divergence-frameworks）
- `run-state.cjs` usage 标题品牌统一（spec-analyze run-state v3.0）
- 删除陈旧嵌套文件 `.claude/skills/spec-analyze/references/scenario-stress-test.md`，嵌套副本重建为完整镜像

## 3.0.0 (2026-08-09)

### Added
- **闭环引擎（由 analyze 能力迁移）** — `run-state.cjs` 状态机、证据台账（HMAC 签名链 + `--auto-detect` 矛盾检测）、checkpoint 随流转自动同步、G1/G2/G3 闭环门禁、中断恢复协议、实施交接包（handoff-packet + workflow 控制器）
- **参考文档体系** — 新增 `references/`：router、closed-loop、gates、verification-rubric、failure-handling、output-templates（闭环轨道）、spec-templates、handoff-format、plan-authoring、plan-execution、completion-verification、debugging-discipline、test-first-development、requesting/review-feedback-intake、role-matrix、frameworks-index、advanced-capabilities、glossary、evaluation-guide 等
- **回归测试** — 88 项自动化测试（`test-automated.cjs` / `test-run-state.cjs` / `test-workflow.cjs` / `test-handoff.cjs` / `evaluate-tests.cjs`）
- **输出语言契约** — 默认中文输出（机器契约保留英文）
- `references/annotation-output-templates.md` — 原 output-templates.md（标注三文档模板）更名，避免与闭环输出模板混淆

### Changed
- SKILL.md 版本 2.3.0 → 3.0.0，新增「闭环协议」章节（操作契约 / 输出语言 / 路由 / 状态机 / 门禁 / 证据 / 检查点 / 交接 / 参考地图 / 最终响应契约）
- `references/decision-log-format.md`、`references/web-research-guide.md` 合并闭环版本与标注场景内容
- README 架构说明与文件索引同步 v3.0

### Security
- 迁移内容不含个人信息：无用户路径、凭据或本地配置（`.claude/settings.local.json` 保持 gitignore）

## 2.3.0 (2026-07-16)

### Added
- **Block F 依赖链增强** — §3.6.2 多级依赖链声明格式（依赖链路 + 依赖类型 + 联动规则），支持 selector→filter→derived→render→autoGenerate 链式依赖
- **Block G（BusinessRules）** — §3.7 业务规则共享块，包含 ruleId/scope/condition/rule/validation 字段
- **Block H（DataFlow）** — §3.8 跨组件数据流声明共享块，包含数据流/转换规则/回写规则字段
- **衍生状态（Derived State）** — §6.8.4 状态声明支持 `_derived: true` + `dependsOn` 标记，自动跳过测试用例生成
- **列级条件行为（Column-Level Conditional Behavior）** — §4.2.1.1 T2 DataList 列级条件声明（列/条件/行为/条件else）
- **T6 FormFill 字段级属性扩展** — 字段子表新增 `autoGenerate`/`readonly`/`uniqueness`/`condition` 四个属性
- **注释等级标签可配置（Level Label Configurability）** — §7.1 L1/L2/L3 可配置为自定义标签（如"基础/本次需求明细/完整"），SKILL.md session state 新增 `level_labels`
- **validate-annotations.js v2.3** — 新增衍生状态验证、Block G/H 验证、autoGenerate 字段校验（R021）、derived state 校验（R022）、state/states 双格式兼容、`--level-labels` 参数
- 内容规则 R021-R022 — autoGenerate 公式规则、derived state dependsOn 规则

### Changed
- SKILL.md 版本从 2.2.0 升级至 2.3.0
- 附录 A 类型定义总表：T6 新增字段级属性，T2 新增列级条件引用
- annotation-templates.md §3 共享块扩展：新增 Block F 依赖链（§3.6.2）、Block G（§3.7）、Block H（§3.8）；原 §3.7 重编号为 §3.9
- JSON Schema 附录 B：level 枚举扩展为可配置标签映射

## 2.2.0 (2026-07-16)

### Added
- Block D（Background）— 业务背景与决策原因共享块，包含 rationale、decisionRef、flowchartRef、proposalRef 字段
- Block E（Refs）— 跨引用元数据共享块，包含 flowcharts、designDoc、decisionLog、proposalRefs 字段
- 所有类型模板（T1-T11）新增 `background` 可选字段
- 附录 B：JSON Schema 定义 — 11 种类型模板 + 5 个共享块的完整 JSON Schema 验证体系
- 共享块 Schema 定义（Block A-E）— 支持程序化验证 ANNOTATIONS 数据结构
- **Phase 4 — 注释与设计文档集成**：跨类型共享字段定义表（§6.8）、注释与设计文档双向同步机制（§6.9）、组件依赖声明格式（§6.10）、依赖图验证规则
- **Phase 5 — 逐组件交互式注释编辑器**：自然语言 → 类型映射规则（§2.3 关键词匹配表 + 决策树 + 复合组件映射）、Step 11F 完整工作流（P1-P6 + Add 子流程）、空组件触发流程与注释创建向导
- **Phase 6 — 已有方案注释路径**：新输入分流入口（已有方案注释）、Step A1-A5 完整流程（方案发现/组件识别/注释提取/注释补充/输出）、output-templates.md 新增路径
- **Phase 7 — 注释审核与质量闭环**：PM Perspective Review 审核清单、Review → Approve → Lock 四阶段审核流程（R1-R4）、审核状态流转定义、`_review` 锁定标记格式
- **Phase 8 — 测试用例自动生成**：状态 → 测试用例映射规则（§8）、11 种类型 50+ 标准化测试用例模板、`references/test-cases.md` 参考文件、`scripts/validate-annotations.js --testcases` 标志
- 内容规则 ID 映射表（§6.7）— 20 条规则（R001-R020）按类别/字段映射
- 跨引用格式（§3.6）— `→` 前缀语法与渲染规则
- `scripts/validate-annotations.js` 验证脚本 — 支持类型模板验证、内容规则检查、依赖图验证、测试用例生成、JSON 输出、迁移模式

### Changed
- SKILL.md 版本从 2.1.0 升级至 2.2.0
- 附录 A 类型定义总表：所有类型新增 Block D（可选）引用
- 引导文档更新：新增 JSON Schema 使用方式说明（pre-commit 钩子、CI 门禁、编辑器插件）
- SKILL.md 输入分流：新增"已有方案注释"路径和路由规则
- SKILL.md Full 路径表：新增 Step 11F
- SKILL.md 文件索引：新增 `references/test-cases.md` 引用
- quality-checklists.md：新增 PM Perspective Review 和完整审核流程
- output-templates.md：新增"已有方案注释"输出路径
- html-annotation-system.md：新增空组件触发流程（§4.0.1）

### Fixed
- 嵌套引用规则编号修正（§3.4 → §3.6）

## 2.1.0 (2026-07-15)

### Added
- 输入分流 — 5 路径输入分类（需求分析/原型注释/方案评审/竞品调研/快速问答）
- 元反馈回路 — 归档复盘、模式识别、规范演进、指标基线
- 回滚/中止流程 — 中止/回退/路径切换三大流程与决策记录
- CI/CD 集成 — GitHub Actions 示例、门禁规则、pre-commit 钩子
- 跨项目可移植性 — 引导脚本 `scripts/init.sh`、3 种复用方式
- 角色定义 — 8 角色矩阵、单 AI Agent 模式、多人协作模式
- 质量指标 — 3 维度（注释质量/文档质量/流程效率）指标与未达标处理
- 脚本工具 — `scripts/init.sh` 项目初始化、`scripts/check-annotations.sh` 注释质量检查
- demo README — 功能说明与快速开始

### Changed
- SKILL.md 版本从 2.0.0 升级至 2.1.0
- 扩展 Agent 角色动态为完整角色定义章节
- 删除重复的 demo 截图

## 2.0.0 (2026-07-15)

### Added
- 浮动面板交互模式 — 替换旧版 overlay/modal 为 panel/fab 模式
- 字段级注释描述 — demo 支持字段级别的结构化注释
- 统一状态管理 — `state` 对象替代 5+ 分散变量

### Changed
- `references/html-annotation-system.md` §6 模板全部更新为 panel/fab 模式
- 交互注释编辑适配面板模式

## 1.2.0 (2026-07-14)

### Added
- 交互式注释编辑（Step 9.5F）— 文档发现、组件定位、操作解析、批处理、Undo
- 双模式注释（独立模式 + 内联模式）
- 智能分析 — 多视角分析、压力测试、方案收敛
- 增强编辑模式 — 追加、删除、撤销、变更摘要
- 数据驱动导航 — `label` 字段驱动 `renderNav()`
- 验证模式 — 触发器覆盖、状态覆盖、内容规则检查

### Changed
- demo 从 3 状态扩展为 5 状态模型
- 编辑模式支持撤销/重做

## 1.1.0 (2026-07-10)

### Added
- 热插拔知识系统 — 渐进式知识加载，按路径需求加载对应知识
- Session State 机制 — 6 字段状态跟踪（mode/focus/output/status/contextBranch/phase）
- 多框架分歧系统 — 18 个分析框架，3 类分歧检测
- 组件注册表（Component Manifest）— 组件枚举与验证
- 质量门禁 — S1-S4 四阶段质量检查
- Agent 角色动态 — 3 种角色模式（独立/协作/监督）

### Changed
- 步骤编号对齐 — 所有参考文件使用统一步骤编号
- SKILL.md 与 references/ 分离为独立职责

## 1.0.0 (2026-07-01)

### Added
- 核心三路径分析引擎 — Lightweight / Standard / Full
- 智能路由（Step 0）— 3 条路径自动路由
- 智能节点分析（Step 0.5）— 意图识别、内容成熟度、异常检测
- 三层注释框架 — L1 (trigger-behavior-dismiss) / L2 (+placement-style-state-timing) / L3 (+accessibility-responsive-i18n)
- 11 种组件类型（T1-T11）— 结构化类型系统
- 8 个参考文件 — annotations/personas/quality/divergence/output/decision-log/web-research/html-system
- 交互式 HTML demo — 浮动面板注释展示
- 完整 README — 架构说明与使用指南
