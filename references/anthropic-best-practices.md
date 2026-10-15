# history/retired — Anthropic 最佳实践

本文档《Anthropic 最佳实践》为旧 spec-analyze/analyze 引擎遗留，已退役，不是 pm-spark 五模式现行权威，不在当前引用链。当前权威以 SKILL.md 与 references 中现行契约文件为准。正文保留作为历史参考，不参与五模式流程。
# Skill 编写最佳实践

**加载时机：** 创建、编辑或评审 skill，且准备部署之前。本文把公开的 skill 编写指导整理成可执行的操作规则。

概念背景可参考官方 [Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)。

## 核心原则

### 简洁为王

上下文窗口是公共资源：你的 skill 与系统提示、对话历史、其他 skill 元数据、用户请求共享它。

**默认假设：** 代理本身已经足够聪明。只补充它不知道的内容。逐段自问：
- 这段解释代理真的需要吗？
- 可以假设代理已知吗？
- 这段内容配得上它的 token 成本吗？

**简洁示例：**
```markdown
## Extract PDF text

Use pdfplumber:

```python
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

**冗长示例：** 任何解释 PDF 是什么、罗列可用库、或论证为什么选 pdfplumber 的段落。

### 按任务脆弱度设定自由度

| 自由度 | 适用场景 | 形式 |
|---|---|---|
| 高 | 多方案皆可、依赖上下文、启发式 | 文本指令 |
| 中 | 存在首选模式、允许变体、配置驱动 | 伪代码或参数化脚本 |
| 低 | 脆弱操作、一致性关键、顺序精确 | 具体脚本，不带参数 |

类比：机器人过悬崖窄桥需要精确指令（如数据库迁移）；在开阔地只需方向（如代码评审）。

### 用目标模型分别测试

skill 叠加在模型能力之上，不同模型需要不同细节：

| 模型 | 要回答的问题 |
|---|---|
| Haiku（快、经济） | skill 提供的指导足够吗？ |
| Sonnet（均衡） | skill 是否清晰高效？ |
| Opus（强推理） | skill 是否过度解释？ |

对 Opus 合适的写法可能需要为 Haiku 补充细节。目标是所有目标模型上都有用。

## Skill 结构

### frontmatter（必需）

两个 YAML 字段，合计不超过 1024 字符：
- `name`：仅字母、数字、连字符（最多 64 字符）
- `description`：第三人称，只描述何时使用（不描述做什么）

### 命名

主动语态、动词开头、动名词优先：
- ✅ `creating-skills`、`processing-pdfs`、`analyzing-spreadsheets`
- ✅ 可接受：名词短语（`PDF Processing`）、行动导向（`Process PDFs`）
- ❌ 避免：`Helper`、`Utils`、`Tools`、`Documents`、`Data`、`Files`

### description 驱动发现

description 被注入系统提示并参与 skill 选择；代理可能仅凭它从 100+ 个 skill 中取舍。

规则：
- 只使用第三人称（系统提示注入要求一致）
- 使用具体术语与触发词
- 同时说明做什么与何时用
- 绝不总结工作流

```yaml
# ❌ 总结了工作流——代理照此执行而不读 skill
description: Use when executing plans — dispatches subagent per task with code review between tasks

# ✅ 只写触发条件
description: Use when executing implementation plans with independent tasks in the current session
```

**实测教训：** 总结工作流的 description 会让代理只做一次评审，即使流程图明确要求两次；改成纯触发条件后行为恢复正确。

### 渐进披露

SKILL.md 是概览，细节按需加载：
- SKILL.md 正文控制在 500 行以内
- 接近上限时拆分内容
- 三种组织模式：

**模式 1：高层指南 + 引用**
```markdown
## Quick start
[code in SKILL.md]

## Advanced features
**Form filling**: See FORMS.md
**API reference**: See REFERENCE.md
```

**模式 2：按领域组织**
```
skill/
├── SKILL.md (navigation)
└── reference/
    ├── finance.md
    ├── sales.md
    └── product.md
```
用户问营收时只加载 `reference/finance.md`。

**模式 3：条件化细节**
```markdown
## Creating documents
Use docx-js. See DOCX-JS.md.

## Editing documents
For simple edits, modify XML directly.
**For tracked changes**: See REDLINING.md
```

### 引用保持一级深

代理只会部分读取引用文件。引用链从 SKILL.md 起不超过一层：

❌ `SKILL.md → advanced.md → details.md → actual content`
✅ `SKILL.md → advanced.md`（以及 `SKILL.md → details.md`）

### 长引用加目录

超过 100 行的引用文件在顶部加目录，让部分读取也能感知范围：
```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods
- Advanced features
- Error handling
```

## 内容指南

### 避免时效敏感表述

```markdown
# ❌ 会过时
If you're doing this before August 2025, use the old API.

# ✅ 当前方法 + 旧模式归档
## Current method
Use v2 API: `api.example.com/v2/messages`

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used `api.example.com/v1/messages` — no longer supported.
</details>
```

### 术语全文一致

选定一个词并全文使用：✅ 始终用 "API endpoint"；❌ 不要混用 "API endpoint"、"URL"、"API route"、"path"。

## 常见模式

### 模板模式

严格度匹配需求：API 响应与数据格式要严格；分析与报告可以灵活。

### 示例模式

输出质量依赖风格的 skill，提供输入/输出对：

```markdown
**Example 1:**
Input: Added user authentication with JWT tokens
Output:
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

三个好示例胜过一段说明。

### 条件工作流

```markdown
1. Determine modification type:
   **Creating?** → Creation workflow
   **Editing?** → Editing workflow
2. Creation workflow: [steps]
3. Editing workflow: [steps]
```

### 带清单的工作流

复杂多步流程给代理可复制的检查清单：

```markdown
Copy and track progress:
- [ ] Step 1: Analyze form
- [ ] Step 2: Create mapping
- [ ] Step 3: Validate
- [ ] Step 4: Execute
- [ ] Step 5: Verify
```

### 反馈循环

验证器 → 修错误 → 重验，对质量关键的任务必须：

```markdown
1. Make edits
2. **Validate immediately**: `python validate.py path/`
3. If fails: fix, validate again
4. Only proceed when validation passes
```

## 评估与迭代

### 先建评估再写文档

写大量内容前先建评估，确保 skill 解决真实问题而非想象的问题。

**评估驱动流程：**
1. 识别缺口：无 skill 在代表性任务上运行，记录失败
2. 创建评估：三个覆盖缺口的场景
3. 建立基线：测量无 skill 时的表现
4. 写最小指令：刚好覆盖缺口
5. 迭代：跑评估、对比基线、精修

**评估结构示例：**
```json
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Reads the PDF using an appropriate library",
    "Extracts text from all pages",
    "Saves output in readable format"
  ]
}
```

### 双代理迭代

最有效的流程使用两个代理实例：

| 角色 | 职责 |
|---|---|
| Agent A（专家） | 用你的领域知识设计与精修 skill |
| Agent B（用户） | 在真实任务上测试，通过行为暴露缺口 |

流程：无 skill 完成一次任务并记录反复提供的上下文 → 识别可复用模式 → 让 Agent A 编写 skill → 简洁性评审（删掉代理已知的内容）→ 把 schema 拆进引用文件 → 用 Agent B 在相似任务上测试 → 按观察迭代。

### 观察代理如何导航

关注：**意外路径**（代理按你没预料的顺序读文件，结构可能不直观）、**错失连接**（代理没跟上引用，链接需要更显式）、**过度依赖**（代理反复读同一文件，内容可能该进 SKILL.md）、**被忽略**（代理从不访问某个文件，它可能多余）。基于观察而非假设做调整。

## 进阶：带可执行代码的 skill

### 脚本解决问题，不踢皮球

脚本内处理错误条件，不要失败后让代理自行摸索：

```python
# ✅ 处理了错误
def process_file(path):
    try:
        with open(path) as f: return f.read()
    except FileNotFoundError:
        print(f"{path} missing, creating default")
        with open(path, 'w') as f: f.write('')
        return ''
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ''

# ❌ 把问题留给代理
def process_file(path):
    return open(path).read()
```

### 配置值要有依据

```python
# ✅ 自解释
REQUEST_TIMEOUT = 30  # typical HTTP completion; allows slow connections
MAX_RETRIES = 3       # most intermittent failures resolve by retry 2

# ❌ 魔数
TIMEOUT = 47   # why 47?
RETRIES = 5    # why 5?
```

### 提供工具脚本

预制脚本比代理临时生成的代码更可靠、更省 token、更一致。

明确告诉代理该**执行**（最常见：`Run analyze_form.py to extract fields`）还是**作为参考阅读**（复杂逻辑：`See analyze_form.py for the extraction algorithm`）。

### 可验证的中间产物

复杂开放式任务用 plan-validate-execute：分析 → 写计划文件 → 验证计划 → 执行 → 验证。适用于批量操作、破坏性改动、复杂校验规则与高利害操作。

让验证脚本输出足够详细：`"Field 'signature_date' not found. Available: customer_name, order_total, signature_date_signed"`——帮助代理定位并修复。

### 视觉分析

输入可渲染为图像时启用代理视觉：
```markdown
1. Convert PDF to images: `python pdf_to_images.py form.pdf`
2. Analyze each page image to identify fields
3. Agent sees field locations and types visually
```

### 依赖与平台差异

| 平台 | 能力 |
|---|---|
| claude.ai | 可从 npm、PyPI、GitHub 安装 |
| API 环境 | 无网络访问；无运行时安装 |

在 SKILL.md 中列出所需包并验证可用性。

### MCP 工具用全限定名

使用 `ServerName:tool_name` 形式：

```markdown
# ✅
Use the BigQuery:bigquery_schema tool to retrieve schemas.
Use the GitHub:create_issue tool.

# ❌ 可能定位失败
Use bigquery_schema.
```

### 不假设工具已安装

```markdown
# ❌
Use the pdf library.

# ✅
Install: `pip install pypdf`
Then:
```python
from pypdf import PdfReader
reader = PdfReader("file.pdf")
```
```

## 反模式速查

| 反模式 | 修正 |
|---|---|
| Windows 风格路径（`scripts\helper.py`） | 一律正斜杠（`scripts/helper.py`） |
| 提供过多选项 | 给默认方案 + 逃生舱 |
| 深层嵌套引用 | 从 SKILL.md 一级深 |
| 主内容含时效信息 | 移入 "old patterns" 章节 |
| 术语不一致 | 选定一词全文使用 |
| 泛化命名（`Helper`、`Utils`） | 主动语态、动词开头 |
| description 总结工作流 | 只写触发条件 |
| 未测试的 skill | 至少三个评估；先测基线 |

## 发布前检查清单

### 核心质量

- [ ] Description 具体，含 what 与 when
- [ ] SKILL.md 正文 500 行以内
- [ ] 无时效敏感信息（或已归档到 "old patterns"）
- [ ] 术语一致
- [ ] 含具体示例
- [ ] 引用一级深
- [ ] 恰当使用渐进披露
- [ ] 工作流步骤清晰

### 代码与脚本

- [ ] 脚本解决问题而非踢皮球
- [ ] 错误处理显式且有帮助
- [ ] 无魔数（配置值均有依据）
- [ ] 所需包已列出并验证
- [ ] 脚本文档清晰
- [ ] 仅正斜杠路径
- [ ] 关键操作有校验
- [ ] 质量关键任务有反馈循环

### 测试

- [ ] 至少创建三个评估
- [ ] 写内容前测过基线
- [ ] 用全部目标模型测试
- [ ] 用真实使用场景测试
- [ ] 纳入团队反馈（适用时）

## 参考

- Skills overview — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- `references/skill-authoring.md` — skill 创建的方法论
- `references/skill-adversarial-testing.md` — 对 skill 做 TDD
- `references/persuasion-principles.md` — 压力场景为何有效
