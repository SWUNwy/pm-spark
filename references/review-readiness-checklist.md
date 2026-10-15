# history/retired — 评审就绪检查清单

本文档《评审就绪检查清单》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 产品评审就绪清单

默认 `node scripts/validate-prd.js <path>` 使用 `product-prd`。`--profile engineering-spec` 用于明确要求的独立工程规格；`--profile legacy` 仅保留旧研发 PRD 的 RC 规则。不得根据正文自动提升 profile。

Blocking 对应 error，Advisory 对应 warning，Optional 对应 info。下表与校验器的模式、级别一致；自动校验仅检查结构与关键词，业务准确性和覆盖仍需人工评审。

| ID | 检查项 | product-prd | engineering-spec / legacy | 自动检查与人工核对 |
|----|--------|-------------|---------------------------|--------------------|
| RC-01 | 名称、版本、负责人、关联需求 | Blocking | Blocking | 关键词完整；日期人工核对 |
| RC-02 | 修订记录 | Advisory | Advisory | 存在修订记录；条目人工核对 |
| RC-03 | 编号、密级、归属 | Optional | Optional | 如适用 |
| RC-10 | 背景与现状痛点 | Blocking | Blocking | 背景内容；具体痛点人工核对 |
| RC-11 | 可衡量目标 | Blocking | Blocking | 目标内容；可衡量性人工核对 |
| PRD-USERS | 用户与场景 | Blocking | 不检查 | 包含用户与场景；任务真实性人工核对 |
| PRD-SCOPE | 范围与非目标 | Blocking | 不检查 | 包含范围与非目标 |
| RC-12 | 量化预期收益 | Advisory | Advisory | 收益与数值；来源人工核对 |
| RC-13 | 竞品或现状对比 | Advisory | Advisory | 有对比或不适用说明 |
| RC-14 | 成本测算 | Optional | Optional | 如适用 |
| RC-20 | 功能简述与方案 | Blocking | Blocking | 有功能或方案描述 |
| RC-21 | 页面结构 | Blocking | Blocking | 结构标题与树形信息 |
| RC-22 | 状态流转 | Blocking | Blocking | 状态描述；产品模式为可见状态，迁移条件人工核对 |
| RC-23 | 业务流程 | Blocking | Blocking | Mermaid 流程图；分支完整性人工核对 |
| RC-24 | 交互详述 | Blocking | Blocking | 触发或行为描述；逐功能覆盖人工核对 |
| RC-25 | 权限规则 | Blocking | Blocking | 包含权限；可见范围与操作权限人工核对 |
| RC-26 | 复用声明 | Advisory | Advisory | 有复用描述或不适用说明 |
| RC-30 | 数据字段表 | Blocking | Blocking | 字段、类型、必填及至少一行数据；产品为业务字段，工程为实现字段 |
| RC-31 | 接口需求 | 不检查 | Blocking | 接口、method + path；参数、返回与错误场景人工核对 |
| RC-32 | 埋点需求 | Optional | Optional | 如适用 |
| RC-33 | 报表需求 | Optional | Optional | 如适用 |
| RC-40 | 验收标准 | Blocking | Blocking | 验收与 AC-xx 标识 |
| PRD-AC | 用户可观察验收 | Blocking | 不检查 | 每条 AC 表达可观察预期结果；操作、覆盖及可验证性人工核对 |
| RC-41 | 上线需求 | Optional | Optional | 产品为用户可用范围与时机 |
| RC-42 | 下线需求 | Optional | Optional | 产品为存量数据与行为变化 |
| RC-43 | 开发注意事项 | 不检查 | Advisory | 工程文档按需填写 |
| RC-50 | 运营计划 | Optional | Optional | 如适用 |
| RC-51 | 风险分析 | Advisory | Advisory | 风险、影响与应对人工核对 |
| RC-52 | 相关文档 | Optional | Optional | 有索引 |
| PRD-BOUNDARY | 产品内容边界 | Blocking | 不检查 | 拦截接口路径、代码路径、错误码和验证命令，提示显式 engineering-spec |

## 判定

无 Blocking 缺失且 Advisory 缺失不超过 2 为 Ready；无 Blocking 且 Advisory 缺失超过 2 为 Conditional；任一 Blocking 失败为 Not Ready。Optional 不阻断。

产品 PRD 不要求接口、错误码、代码路径、实现步骤或测试命令。发现工程内容时须拆分，不通过选择 legacy 绕过产品边界。delivery contract 的产品层保留 `acceptance_criteria` / `observable_acceptance`；工程实现和 `verification_commands` 不进入产品交付。
