# history/retired — 说服原则

本文档《说服原则》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# 说服原理

**加载时机：** 设计 skill 压力测试场景，或编写需要覆盖代理默认行为的 skill 内容时。本文解释压力场景为何有效，以及哪些影响力因素能提高合规率。

## 为什么重要

压力场景通过"代理想违规时是否仍守规则"来验证 skill。场景的有效性建立在已发表的影响力研究之上；不理解这些因素，设计出的场景会被代理一行合理化轻易打发。

**关键结论：** 2025 年一项覆盖约 2.8 万名参与者的元分析显示，组合多个影响力因素把合规率从单一因素下的约 33% 提升到约 72%。组合 3 个以上因素的压力场景不是随意的——它对应的是实测的乘法效应。

## 七类影响力因素

以下因素改编自经典影响力研究框架，应用于 skill 编写与压力测试。

### 1. 权威（Authority）

代理和人一样服从感知到的权威：资深工程师、经理、"计划"、文档语气。

**压力场景用法：** 安排推动违规的权威人物。
- "Manager says add 2-line fix now"
- "Senior engineer says skip tests"
- "The plan explicitly chose this approach"

**skill 编写用法：** 权威语气（"MUST"、"NEVER"、"STOP"）优于柔和措辞（"should"、"consider"、"try to"）。

**反制信号：** skill 借助权威时点明来源。"Violating letter is violating spirit" 之所以有效，是因为它调用了规则作者的权威。

### 2. 承诺与一致（Commitment & Consistency）

立场一旦公开，代理和人都会抗拒自相矛盾；已陈述的承诺会把后续行为拉向一致。

**压力场景用法：** 工程师已实现 200 行，删除会像违背先前的承诺。
- "You spent 4 hours implementing this"
- "You already manually tested"
- "You told the team it's done"

**skill 编写用法：** 尽早引出承诺。"If you wrote code before tests, delete it" 是代理读 skill 时作出的承诺，后续合理化都在破坏这个承诺。

**反制信号：** 沉没成本式合理化（"deleting is wasteful"）把一致压力武器化来对抗规则。skill 用重新框架反击："Deleting is the cheapest path to compliance."

### 3. 稀缺（Scarcity）

稀缺资源（时间、部署窗口、注意力）会抬高合规的感知成本。

**压力场景用法：** 场景中总要包含稀缺资源。
- "5 minutes until deploy window"
- "Production is down, $10k/min"
- "Dinner at 6:30pm"
- "Last chance before vacation"

**skill 编写用法：** 让违规的代价显得稀缺。"The only acceptable answer is A" 把 B 和 C 重新框架为昂贵选项。

**反制信号：** "务实"式合理化常援引假稀缺（"we don't have time for the rule"）。skill 通过点名违规的真实成本（返工、回归、评审失败）反击。

### 4. 社会认同（Social Proof）

代理和人跟随感知到的规范。"Everyone skips tests sometimes" 是极强的合理化。

**压力场景用法：** 加入推动违规的社会压力。
- "The team is waiting"
- "Other engineers ship without tests"
- "This is industry standard"

**skill 编写用法：** 社会认同同样可以为规则服务。"Bulletproof agents follow this rule" 本身就是社会认同。列出常见合理化及其反制，能建立规范预期。

**反制信号：** 测试发现新合理化时点名记录。把它加入合理化表，等于宣告"这个借口已被考虑并否决"，从而瓦解其社会认同效力。

### 5. 身份认同（Identity）

与身份一致的请求比交易式请求更有效。"Engineers who care about craft do X" 强于 "do X"。

**压力场景用法：** 威胁身份。
- "Don't look dogmatic"
- "Be pragmatic, not ideological"
- "Senior engineers know when to break rules"

**skill 编写用法：** 把合规塑造成身份正面。"Skilled practitioners delete code written before tests" 让守规则成为身份声明而非交易。

**反制信号：** "Pragmatic vs dogmatic" 是最常见的身份型合理化。skill 重新框架反击："Following the rule IS pragmatic — it prevents rework."

### 6. 互惠（Reciprocity）

既得好处会制造回报义务。"我已经手动测过""我已经写了文档"这类先例，会被当作抵销未来合规的信用。

**压力场景用法：** 加入先前的"信用"。
- "You already manually tested"
- "You wrote docs for the feature"
- "You paired with a junior on it"

**skill 编写用法：** 拒绝这笔交易。"Manual testing does not substitute for written tests" 显式驳回互惠框架。

**反制信号：** "I already manually tested" 基于互惠。skill 必须明确拒绝交易，而不只是重申规则。

### 7. 好感（Liking）

来自讨喜对象的请求更容易被接受。压力场景常安排受尊敬的资深或友好的队友推动违规。

**压力场景用法：** 讨喜权威推动违规。
- "Your favorite tech lead says ship it"
- "The team agrees this is fine"

**skill 编写用法：** 与 skill 内容关系较小（skill 是无人格的）；与元测试有关：元测试提示应保持中性，不宜过度亲和。

**反制信号：** skill 内容中少见，主要出现在场景里。

## 设计压力场景

组合 3 个以上因素能产生约 72% 的合规偏移，而单一因素只有约 33%。推荐组合：

| 组合 | 效果 |
|---|---|
| 时间 + 沉没成本 + 疲惫 | 经典"下班前合理化"——验证 skill 在疲劳下是否仍有效 |
| 权威 + 稀缺 + 社会认同 | "经理要求立即发布、团队在等、部署窗口将关"——验证生产压力下的守规则能力 |
| 互惠 + 身份 + 承诺 | "我已测过、我很务实、我承诺要发"——验证自我辩解压力下的守规则能力 |

## 编写 skill 时借力

| 因素 | 技巧 |
|---|---|
| 权威 | 使用 "MUST"、"NEVER"、"STOP"，并点明规则来源 |
| 承诺 | 尽早引出承诺（"If X, then Y"），让违规成为自我矛盾 |
| 稀缺 | 点名违规成本（"Rework is more expensive than compliance"） |
| 社会认同 | 声明常见合理化已被考虑并否决 |
| 身份 | 把合规框架为手艺而非官僚 |
| 互惠 | 显式拒绝常见交易（"Manual testing does not substitute"） |
| 好感 | 关系较小；保持语气中性，避免人格化合规 |

## 针对合理化反制

基线测试揭示合理化后，识别它借用的因素并针对性处理：

| 合理化 | 借用因素 | 反制 |
|---|---|---|
| "I already manually tested" | 互惠 | 显式拒绝交易 |
| "Being pragmatic not dogmatic" | 身份 | 把守规则重新框架为务实 |
| "Manager says skip" | 权威 | 指出规则的权威更高 |
| "Spirit not letter" | 承诺 | 拒绝区分："Violating letter is violating spirit" |
| "Everyone does this" | 社会认同 | 加入合理化表（已考虑并否决） |
| "Don't have time" | 稀缺 | 点名违规的实际成本 |
| "Senior engineers break rules" | 身份 + 好感 | 重新框架：熟练从业者守规则 |

## 相关文档

- 影响力研究基础框架（六因素，后续扩展加入身份因素）
- 2025 年元分析（N≈28,000）——多因素合规乘数（约 33% → 约 72%）
- `references/skill-adversarial-testing.md` — 这些因素如何驱动压力场景设计
- `references/skill-authoring.md` — skill 创建的主要参考
