# 输出模板（Output Templates）

本文件提供 PM Spark 模式四 4A 的注释输出模板；Spec 三文档以 `spec-templates.md` 为权威。轻量 / 标准 / 深度只影响内容详略，不决定交付文件、权限或注释结构。当前请求够用即停，不自动扩大到 PRD、Spec 或实现。角色名、组件类型与 schema 键仅用于内部核对或机器工件；对话与评审正文使用 PM 工作语言。

## Product-only 交付边界

所有入口共享 `references/delivery-contract.json`。在写入 HTML、Markdown 或其他序列化输出前，必须调用 `filterDelivery(sourceDocument, "product", contract)`；不得直接序列化含工程实现或验证命令的源文档。产品层保留 `acceptance_criteria` / `observable_acceptance` 中的用户可观察验收，工程内容混入产品字段时阻断并拆分。

入口 `full`、`standard`、`lightweight`、`direct_annotation`、`html_review_docs` 默认映射到 `product` 层。工程实现或工程验证内容只能通过显式提升 delivery layer 输出。


| 模式 | 输出 | 默认位置 |
|---|---|---|
| 模式一、二 | 问题陈述 / 挑战结果 | 仅对话（不写文件） |
| 模式三 | 方案简报（可选） | `docs/requirements/briefs/YYYY-MM-DD-<topic>.md` |
| 模式四 4A | HTML 评审注释面板 | `docs/requirements/specs/active/R0XX-<topic>/prototype-annotated.html` |
| 模式四 4B | PRD（见 `prd-output-template.md`） | `docs/requirements/specs/active/R0XX-<topic>/prd.md` |
| 模式四 4C | 固定 proposal.md + design.md + tasks.md（见 `spec-templates.md`） | `docs/requirements/specs/active/R0XX-<topic>/` |
| 模式五 | 决策建议（可选） | `docs/requirements/decisions/YYYY-MM-DD-<topic>-decision.md` |

用户偏好覆盖默认值。4A 默认直接生成评审面板，无需额外模式确认；写文件前展示路径并确认，用户已有明确授权时沿用。注释请求不自动生成三文档或修改输入文件。只有用户请求或确认 Spec 工作且完成范围确认后，才固定生成三文档；工程附录须同时满足需求类型适用与用户明确请求，工作包不暗示执行授权。

---

## 对话结果的可选组织方式

按当前请求组织核心判断、依据、风险与假设；内容足够支持下一步即可停止，不为填满模板追加角色视角或追问。轻量、标准、深度只调整详略。仅在有帮助且用户未要求结束时，给一个可选下一步。方案简报与决策记录分别遵循模式三、五的输出约定。

---

## 模式四 4A → PM 注释

所有组件统一填写 PM 六字段：`summary`（摘要）、`feature`（功能定位）、`logic`（交互逻辑）、`states`（状态说明）、`boundary`（边界条件）、`copy`（UI 文案，可选）。代理根据交互模式选取 T1-T11 类型，并依据 `annotation-templates.md §3` 核对适用行为与状态的完整性。

先枚举组件，内部记录类型，再填写五个必填字段；没有关键文案时省略 `copy`。输出默认中文，使用产品语言描述用户触发、可见反馈、成功/失败结果和恢复路径。内联、侧栏与评审模式使用相同六字段；不得因折叠而把技术字段混入 PM 数据。

旧 blocks/VIEW_DESCS 通过 `--legacy` 显式兼容读取，迁移说明见 `annotation-templates.md §7`。需要 Spec 时使用 `spec-templates.md` 的范围确认、三文档与可追踪工作包模板；不得用简化注释模板替代 Spec 契约。

---

## 评审模式输出模板（v4.0）

> 评审模式是与 inline/侧栏并列的第三种呈现模式（布局契约与徽标系统见 `html-annotation-system.md §2.2`），用于产品方案评审会交付（内审/业务/研发评审）。模式四 4A 默认生成评审面板，无需额外模式路由确认。

### 生成说明（数据同源，强制）

1. **先产出结构化注释数据**（review-docs JSON，结构见下）——它是单一数据源。
2. **再按请求渲染**：同一份数据 → HTML 右栏条目；仅在用户请求或确认 Spec 工作后，同步三文档（proposal/design/tasks）的关联内容。禁止两处独立手写，避免评审视图与产品文档不一致。
3. **交互脚本同源**：下方权威 JS 代码块是唯一实现，生成的 HTML **原样嵌入，禁止每次交付重新手写**——数据同源原则同样适用于代码。

### 呈现密度规则（PM 注释路径）

条目默认展示 `summary`（摘要行）+ `annotation` 对象的 5 个 PM 字段（feature/logic/states/boundary/copy）。`copy` 无内容时省略；渲染必须以字段存在且非空为条件，不能对缺失值调用字符串方法；其余字段必须为非空字符串。组件类型 `type` 位于条目顶层，用于核对行为与状态完整性。新输出不包含注释等级字段或技术明细。

### scope-mark 徽标

| scopeMark | 徽标 | 样式 |
|---|---|---|
| existing | 灰色"已有" | `#e2e8f0` 底 / `#475569` 字 |
| new | 绿色"新增" | `#dcfce7` 底 / `#15803d` 字 |
| adjusted | 橙色"调整" | `#ffedd5` 底 / `#c2410c` 字 |

### HTML 骨架（权威）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{需求名} · 评审注释</title>
<style>
/* ===== 评审模式布局（权威，生成时原样嵌入） ===== */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#f0f6fc;color:#1e293b}
.layout{display:flex;height:100vh;overflow:hidden}
.product-panel{width:82%;position:relative;overflow:auto}
.doc-panel{width:18%;max-width:30%;background:#eff6ff;border-left:3px solid #3b82f6;overflow-y:auto;position:relative;flex-shrink:0}
.resize-handle{position:absolute;left:-3px;top:0;width:6px;height:100%;cursor:col-resize;z-index:30}
.resize-handle:hover{background:rgba(147,197,253,.45)}
.scene-tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #93c5fd;flex-wrap:wrap}
.scene-tab{padding:4px 10px;border:1px solid #cbd5e1;border-radius:14px;font-size:12px;cursor:pointer;background:#fff}
.scene-tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
.scene-heading{font-size:14px;font-weight:700;margin-bottom:2px}
.crumb{font-size:11px;color:#64748b;margin-bottom:8px}
.proto-desc{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:8px;font-size:12px;line-height:1.6}
.proto-desc.active-highlight,.proto-element.active-highlight{outline:2px solid #3b82f6;outline-offset:1px}
.scope-mark{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:6px;vertical-align:1px;white-space:nowrap}
.scope-mark.existing{background:#e2e8f0;color:#475569}
.scope-mark.new{background:#dcfce7;color:#15803d}
.scope-mark.adjusted{background:#ffedd5;color:#c2410c}
.desc-top{display:flex;align-items:baseline;gap:6px}
.desc-top .desc-title{flex:1}
.num{flex-shrink:0;min-width:18px;height:18px;border-radius:50%;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.desc-title{font-weight:600}
.decision-box{background:#dbeafe;border:1px solid #93c5fd;border-radius:6px;padding:8px 10px;font-size:12px;line-height:1.6;margin-top:10px}
.empty-state{padding:24px 12px;text-align:center;color:#94a3b8;font-size:12px}
/* ===== 徽标层 ===== */
.anno-badge{
  position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;
  background:#3b82f6;color:#fff;font-size:11px;font-weight:700;
  display:inline-flex;align-items:center;justify-content:center;
  z-index:10;cursor:pointer;box-shadow:0 1px 4px rgba(59,130,246,.4);
  transition:background .15s,transform .15s;user-select:none;
}
.anno-badge:hover,.anno-badge.active{background:#1d4ed8;transform:scale(1.15);}
/* ===== 注释内容 ===== */
.desc-summary{font-size:11px;color:#64748b;margin-top:4px;margin-bottom:6px;line-height:1.5;}
.desc-annotation{margin-top:6px;}
.ann-block{margin-bottom:8px;}
.ann-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6366f1;margin-bottom:3px;}
.ann-text{font-size:12px;color:#334155;line-height:1.65;}
/* ===== panel-header ===== */
.panel-header{padding:10px 12px 6px;background:#dbeafe;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #bfdbfe;}
.panel-header-title{font-size:13px;font-weight:700;color:#1e40af;letter-spacing:.3px;}
.panel-header-count{font-size:11px;color:#64748b;}
@media (max-width:760px){
  .layout{flex-direction:column;height:auto;overflow:visible}
  .doc-panel{width:100%!important;max-width:100%;border-left:none;border-top:3px solid #3b82f6}
  .resize-handle{display:none}
}
</style>
</head>
<body>
<div class="layout">
  <div class="product-panel" id="canvas">
    <!-- 被注释组件：每个带 data-proto-id -->
    <div class="proto-element" data-proto-id="{sceneId}-{n}">…组件…</div>
  </div>
  <div class="doc-panel">
    <div class="panel-header">
      <div class="panel-header-title">PRD 注释</div>
      <div id="panelSceneCount" class="panel-header-count"></div>
    </div>
    <div class="resize-handle" id="resizeHandle"></div>
    <div class="scene-tabs" id="sceneTabs"></div>
    <div id="docBody"></div>
  </div>
</div>
<script id="review-docs" type="application/json">
{严格 JSON：结构见下}
</script>
<!-- 权威交互脚本：见下节，原样嵌入，禁止手改 -->
</body>
</html>
```

### review-docs JSON 数据结构（严格 JSON，双引号）

以 `<script id="review-docs" type="application/json">` 承载，供校验器提取（`scripts/validate-annotations.js` 对含此 script 的 HTML 自动执行评审模式校验）：

```json
{
  "scene1": {
    "heading": "场景标题",
    "crumb": "面包屑路径",
    "items": [
      {
        "protoId": "component-id",
        "title": "组件标题",
        "type": "T6",
        "scopeMark": "new|existing|adjusted",
        "summary": "1-2句核心摘要（在场景列表中快速扫读用）",
        "annotation": {
          "feature": "功能定位：这个组件是做什么的",
          "logic": "交互逻辑：用户操作 → 界面响应（步骤式描述）",
          "states": "状态说明：用户可见状态 + 视觉设计状态（hover/disabled/loading/error等）",
          "boundary": "边界条件：什么情况下不可用、隐藏、异常分支",
          "copy": "UI文案：关键按钮、Toast、空态文案（无则省略此字段）"
        }
      }
    ],
    "decision": "口径建议文字（可选，无则省略）"
  }
}
```

### 权威交互脚本（唯一实现，生成 HTML 原样嵌入）

```html
<script>
/* ===== 评审模式权威交互脚本 v4.0（无SVG·徽标锚定·滚动联动；唯一实现；生成 HTML 原样嵌入，禁止手改） ===== */
(function(){
  var docs = JSON.parse(document.getElementById('review-docs').textContent);
  var docPanel = document.querySelector('.doc-panel');
  var docBody = document.getElementById('docBody');
  var tabs = document.getElementById('sceneTabs');
  var canvas = document.getElementById('canvas');
  var W_KEY = 'reviewPanelWidth', MIN_W = 18, MAX_W = 30;
  var currentScene = null;
  var MARK = {existing:'已有', new:'新增', adjusted:'调整'};
  var LABEL = {feature:'功能定位', logic:'交互逻辑', states:'状态说明', boundary:'边界条件', copy:'UI 文案'};

  function applyWidth(){
    if (window.innerWidth <= 760) return;
    var w = parseFloat(localStorage.getItem(W_KEY));
    if (isNaN(w)) w = MIN_W;
    docPanel.style.width = Math.min(MAX_W, Math.max(MIN_W, w)) + '%';
  }

  function renderAnnotation(ann){
    if (!ann || typeof ann !== 'object') return '';
    return Object.keys(LABEL).filter(function(k){ return Object.prototype.hasOwnProperty.call(ann,k) && typeof ann[k] === 'string' && ann[k].trim(); }).map(function(k){
      return '<div class="ann-block"><div class="ann-label">' + LABEL[k] + '</div>'
        + '<div class="ann-text">' + String(ann[k]).replace(/\n/g,'<br>') + '</div></div>';
    }).join('');
  }

  function renderDocs(sceneId){
    currentScene = sceneId;
    var d = docs[sceneId];
    var html = '<div class="scene-heading">' + d.heading + '</div>'
      + '<div class="crumb">' + (d.crumb||'') + '</div>';
    if (!d.items || !d.items.length){
      html += '<div class="empty-state">本场景暂无注释条目</div>';
    } else {
      d.items.forEach(function(it,i){
        html += '<div class="proto-desc" data-proto-id="' + it.protoId + '">'
          + '<div class="desc-top"><span class="num">' + (i+1) + '</span>'
          + '<div class="desc-title">' + it.title
          + '<span class="scope-mark ' + it.scopeMark + '">' + (MARK[it.scopeMark]||'') + '</span>'
          + '</div></div>'
          + (it.summary ? '<div class="desc-summary">' + it.summary + '</div>' : '')
          + '<div class="desc-annotation">' + renderAnnotation(it.annotation) + '</div>'
          + '</div>';
      });
      if (d.decision) html += '<div class="decision-box"><b>口径建议</b><br>' + d.decision + '</div>';
    }
    docBody.innerHTML = html;
    injectBadges(sceneId);
    bindHover();
  }

  function injectBadges(sceneId){
    document.querySelectorAll('.anno-badge').forEach(function(b){ b.remove(); });
    var d = docs[sceneId];
    if (!d||!d.items) return;
    d.items.forEach(function(it,i){
      var el = document.querySelector('.product-panel .proto-element[data-proto-id="' + it.protoId + '"]');
      if (!el) return;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var badge = document.createElement('span');
      badge.className = 'anno-badge';
      badge.textContent = String(i+1);
      badge.dataset.protoId = it.protoId;
      badge.title = it.title;
      badge.addEventListener('click', function(e){
        e.stopPropagation();
        var desc = docBody.querySelector('.proto-desc[data-proto-id="' + it.protoId + '"]');
        if (desc) desc.scrollIntoView({behavior:'smooth', block:'nearest'});
      });
      el.appendChild(badge);
    });
  }

  function highlight(protoId, on){
    document.querySelectorAll('.proto-element[data-proto-id="' + protoId + '"]')
      .forEach(function(el){ el.classList.toggle('active-highlight', on); });
    document.querySelectorAll('.proto-desc[data-proto-id="' + protoId + '"]')
      .forEach(function(el){ el.classList.toggle('active-highlight', on); });
    document.querySelectorAll('.anno-badge[data-proto-id="' + protoId + '"]')
      .forEach(function(b){ b.classList.toggle('active', on); });
  }

  function bindHover(){
    document.querySelectorAll('.product-panel .proto-element[data-proto-id]').forEach(function(el){
      el.onmouseenter = function(){
        var pid = el.dataset.protoId;
        highlight(pid, true);
        var desc = docBody.querySelector('.proto-desc[data-proto-id="' + pid + '"]');
        if (desc) desc.scrollIntoView({behavior:'smooth', block:'nearest'});
      };
      el.onmouseleave = function(){ highlight(el.dataset.protoId, false); };
    });
    docBody.querySelectorAll('.proto-desc[data-proto-id]').forEach(function(el){
      el.onmouseenter = function(){ highlight(el.dataset.protoId, true); };
      el.onmouseleave = function(){ highlight(el.dataset.protoId, false); };
      el.onclick = function(){
        var pid = el.dataset.protoId;
        var proto = document.querySelector('.product-panel .proto-element[data-proto-id="' + pid + '"]');
        if (proto){
          var top = canvas.scrollTop + proto.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 40;
          canvas.scrollTo({top: Math.max(0,top), behavior:'smooth'});
        }
      };
    });
  }

  window.setScene = function(sceneId){
    tabs.querySelectorAll('.scene-tab').forEach(function(b){
      b.classList.toggle('active', b.dataset.scene === sceneId);
    });
    renderDocs(sceneId);
    var d = docs[sceneId];
    if (d && d.items && d.items[0]){
      var el = document.querySelector('.product-panel .proto-element[data-proto-id="' + d.items[0].protoId + '"]');
      if (el){
        var top = canvas.scrollTop + el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 40;
        canvas.scrollTo({top: Math.max(0,top), behavior:'smooth'});
      }
    }
  };

  var sceneKeys = Object.keys(docs);
  document.getElementById('panelSceneCount').textContent = '共 ' + sceneKeys.length + ' 个场景';
  sceneKeys.forEach(function(sid,idx){
    var b = document.createElement('button');
    b.className = 'scene-tab'; b.dataset.scene = sid;
    b.textContent = (idx+1) + '. ' + docs[sid].heading;
    b.onclick = function(){ window.setScene(sid); };
    tabs.appendChild(b);
  });

  document.getElementById('resizeHandle').addEventListener('pointerdown', function(e){
    e.preventDefault();
    function move(ev){
      var w = Math.min(MAX_W, Math.max(MIN_W, (window.innerWidth-ev.clientX)/window.innerWidth*100));
      docPanel.style.width = w + '%';
    }
    function up(){
      localStorage.setItem(W_KEY, parseFloat(docPanel.style.width));
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });

  window.addEventListener('resize', applyWidth);
  applyWidth();
  window.setScene(sceneKeys[0]);
})();
</script>
```

## 全链路工作流

1. 复用已有设计信息；只追问会改变当前范围或结果的缺口，每轮最多一个关键问题。
2. 枚举交互组件与锚点让 PM 确认，内部映射 T1–T11。
3. 逐组件填充 PM 六字段，按照 `annotation-templates.md §3` 核对行为和状态覆盖。
4. 用同一结构化数据生成请求的 HTML 评审面板，嵌入权威 CSS / JS；写文件前确认路径并沿用已有授权。
5. 运行字段完整性验证；核对真实页面的徽标、滚动、高亮与场景切换，未运行或受阻如实说明。
6. 修正内容；仅在已请求或确认 Spec 工作时同步 proposal/design/tasks 的关联章节，使用 `spec-templates.md` 的契约。
7. 按风险内部核对完整性、边界与假设证据；工程附录须同时满足需求类型适用与用户明确请求。交付就绪不授予实施权限；当前请求完成即停止，最多给一个可选下一步。
