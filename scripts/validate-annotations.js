#!/usr/bin/env node
/**
 * validate-annotations.js
 * spec-analyze 注释质量验证脚本 v3.6
 *
 * 用法:
 *   node scripts/validate-annotations.js <path/to/annotations.html>          # 验证 HTML 中的 ANNOTATIONS
 *   node scripts/validate-annotations.js <path/to/view-descs.html>           # 验证 HTML 中的 VIEW_DESCS（右侧研发注释面板卡片）
 *   node scripts/validate-annotations.js <path> --migrate                    # 迁移 + 验证
 *   node scripts/validate-annotations.js <path> --json                       # 输出 JSON 格式结果
 *   node scripts/validate-annotations.js <path> --testcases                  # 生成测试用例
 *   node scripts/validate-annotations.js <path> --level-labels "基础/详细/完整"  # 自定义等级标签
 *
 * 依赖: 无 (纯 Node.js)
 */

const fs = require('fs');
const path = require('path');
const {
  loadContract
} = require('./delivery-contract.cjs');

const DELIVERY_CONTRACT = loadContract(
  path.join(__dirname, '..', 'references', 'delivery-contract.json')
);

// ============================================================
// 类型模板定义
// ============================================================

const TYPE_SCHEMAS = {
  T1: {
    name: 'DisplayMetric',
    requiredBlocks: ['trigger', 'data'],
    optionalBlocks: ['interaction', 'style'],
    stateRequired: ['normal', 'loading', 'error'],
    sharedBlocks: { context: 'C' },
    minLevel: 'L1'
  },
  T2: {
    name: 'DataList',
    requiredBlocks: ['trigger', 'columns', 'pagination'],
    optionalBlocks: ['selection', 'rowActions', 'style'],
    stateRequired: ['normal', 'loading', 'empty', 'error'],
    sharedBlocks: { context: 'A', permission: 'C' },
    minLevel: 'L2'
  },
  T3: {
    name: 'ActionButton',
    requiredBlocks: ['trigger', 'behavior'],
    optionalBlocks: ['style'],
    stateRequired: ['normal'],
    stateOptional: ['disabled', 'loading'],
    sharedBlocks: { context: 'C', api: 'B' },
    minLevel: 'L1'
  },
  T4: {
    name: 'ActionMenu',
    requiredBlocks: ['trigger', 'items', 'dismiss'],
    optionalBlocks: ['style'],
    stateRequired: ['normal', 'open', 'disabled'],
    sharedBlocks: { context: 'C' },
    minLevel: 'L2'
  },
  T5: {
    name: 'ConfirmAction',
    requiredBlocks: ['trigger', 'behavior', 'content'],
    optionalBlocks: ['style'],
    stateRequired: ['normal', 'submitting', 'error'],
    sharedBlocks: { context: 'A', permission: 'C' },
    minLevel: 'L2'
  },
  T6: {
    name: 'FormFill',
    requiredBlocks: ['trigger', 'fields', 'behavior', 'dismiss'],
    optionalBlocks: ['style'],
    stateRequired: ['normal', 'fieldError', 'submitting', 'success', 'apiError'],
    sharedBlocks: { context: 'C', dialog: 'A' },
    minLevel: 'L2',
    // T6 字段级字段支持
    fieldSchemas: {
      autoGenerate: { type: 'string', desc: '自动生成规则' },
      readonly: { type: 'boolean|string', desc: '只读标记' },
      uniqueness: { type: 'boolean|string', desc: '排重要求' },
      condition: { type: 'string', desc: '条件表达式' }
    }
  },
  T7: {
    name: 'ItemSelect',
    requiredBlocks: ['trigger', 'search', 'selection', 'confirm', 'dismiss'],
    optionalBlocks: ['filter', 'preCheck', 'style'],
    stateRequired: ['normal', 'loading', 'empty', 'searchEmpty', 'selected', 'confirming', 'error'],
    sharedBlocks: { context: 'C', dialog: 'A' },
    minLevel: 'L2'
  },
  T8: {
    name: 'SearchSelect',
    requiredBlocks: ['trigger', 'match', 'display', 'callback', 'dismiss'],
    optionalBlocks: ['style'],
    stateRequired: ['idle', 'focus', 'searching', 'selected', 'empty', 'error'],
    sharedBlocks: {},
    minLevel: 'L2'
  },
  T9: {
    name: 'Toast',
    requiredBlocks: ['trigger', 'behavior', 'types', 'timing', 'placement'],
    stateRequired: ['show', 'hidden'],
    minLevel: 'L1'
  },
  T10: {
    name: 'StatusPlaceholder',
    requiredBlocks: ['trigger', 'behavior', 'content'],
    optionalBlocks: ['dismiss'],
    stateRequired: ['empty', 'loading', 'error'],
    minLevel: 'L1'
  },
  T11: {
    name: 'PageInfo',
    requiredBlocks: ['trigger', 'content', 'placement', 'dismiss'],
    optionalBlocks: ['responsive'],
    stateRequired: ['hidden', 'visible'],
    minLevel: 'L1'
  }
};

// ============================================================
// 内容规则检查器
// ============================================================

const CONTENT_RULES = {
  R001: { desc: '使用产品语言，不使用代码语法', test: (v) => !/==|!=|<=|>=|\bcount\s*\(|\bfilter\s*\(/i.test(v) },
  R002: { desc: '使用完整陈述句', test: (v) => v.length > 5 && /[，。；：？！]/.test(v) },
  R003: { desc: '不使用模糊词', test: (v) => !/可能|应该|酌情|大概|也许/i.test(v) },
  R004: { desc: '枚举值全列举', test: (v) => !/[等\.]{2,}$|\.\.\.$/.test(v) },
  R005: { desc: '数字标注 min/max', test: (v) => !/^\d+$/.test(v) || /min|max|范围|限制/.test(v) },
  R006: { desc: '不留占位符', test: (v) => !/\{.*占位符.*\}|\{.*示例.*\}/.test(v) },
  R007: { desc: '不写 N/A', test: (v) => !/^N\/A$|^不适用$|^无$/.test(v.trim()) },
  R009: { desc: 'behavior 标注 F00X 引用', test: (v) => /F\d{3}/.test(v) },
  R010: { desc: 'API 标注接口来源', test: (v) => /→|api|接口|文档|swagger|openapi/i.test(v) },
  R019: { desc: 'rationale 包含"为什么"语义', test: (v) => /因为|为了|避免|解决|防止|需要|原因|为什么|用户/.test(v) },
  R021: { desc: 'autoGenerate 包含生成公式和触发条件', test: (v) => /公式|生成|条件|格式|触发/i.test(v) },
  R022: { desc: 'derived state 包含 dependsOn', test: (v) => /dependsOn|依赖|取决于/i.test(v) }
};

// ============================================================
// 等级标签映射
// ============================================================

const DEFAULT_LEVEL_LABELS = { L1: '基础', L2: '详细', L3: '完整' };

function parseLevelLabels(arg) {
  if (!arg) return DEFAULT_LEVEL_LABELS;
  const parts = arg.split('/');
  return {
    L1: parts[0] || '基础',
    L2: parts[1] || '详细',
    L3: parts[2] || '完整'
  };
}

// ============================================================
// 解析器 — 括号计数解析 JS 对象字面量
// ============================================================

function extractAnnotationsObject(content) {
  const patterns = ['window.ANNOTATIONS =', 'var ANNOTATIONS =', 'const ANNOTATIONS =', 'let ANNOTATIONS ='];
  let startIdx = -1;
  for (const pattern of patterns) {
    startIdx = content.indexOf(pattern);
    if (startIdx !== -1) {
      startIdx += pattern.length;
      break;
    }
  }
  if (startIdx === -1) return null;

  // 跳过空白
  while (startIdx < content.length && content[startIdx] === ' ') startIdx++;
  if (content[startIdx] !== '{') return null;

  // 括号计数解析，跟踪字符串边界
  let braceCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let endIdx = startIdx;

  for (let i = startIdx; i < content.length; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';

    if (!inDoubleQuote && !inTemplate && ch === "'" && prev !== '\\') inSingleQuote = !inSingleQuote;
    else if (!inSingleQuote && !inTemplate && ch === '"' && prev !== '\\') inDoubleQuote = !inDoubleQuote;
    else if (!inSingleQuote && !inDoubleQuote && ch === '`' && prev !== '\\') inTemplate = !inTemplate;

    if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
      if (ch === '{') braceCount++;
      else if (ch === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (braceCount !== 0) return null;
  return content.substring(startIdx, endIdx);
}

function parseHTMLAnnotations(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const objStr = extractAnnotationsObject(content);
  if (!objStr) return null;

  // 使用 Function constructor 安全解析 JS 对象字面量
  try {
    const fn = new Function(`return ${objStr}`);
    return fn();
  } catch (e) {
    // 回退: sanitize 后 JSON 解析
    try {
      const sanitized = objStr
        .replace(/\/\/.*$/gm, '')
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*([}\]]])/g, '$1')
        .replace(/\s+/g, ' ');
      return JSON.parse(sanitized);
    } catch (e2) {
      return null;
    }
  }
}

// ============================================================
// VIEW_DESCS 兼容解析（右侧研发注释面板卡片格式）
// ============================================================

const VIEW_DESC_LABEL_MAP = {
  '触发': 'trigger',
  '行为': 'behavior',
  '状态': 'state',
  '样式': 'style',
  '接口': 'api',
  '权限': 'context',
  '验收': 'acceptance',
  '复用': 'reuse',
  '字段': 'fields',
  '说明': 'desc',
  '四段': 'flow',
  '状态机': 'state',
  '数据模型': 'data',
  '循环': 'loop',
  '产出': 'output'
};

const VIEW_DESC_REQUIRED = ['trigger', 'behavior', 'state'];

function extractViewDescsObject(content) {
  const patterns = ['const VIEW_DESCS =', 'const VIEW_DESCS=', 'let VIEW_DESCS =', 'let VIEW_DESCS=', 'var VIEW_DESCS =', 'var VIEW_DESCS=', 'window.VIEW_DESCS ='];
  let startIdx = -1;
  for (const pattern of patterns) {
    startIdx = content.indexOf(pattern);
    if (startIdx !== -1) {
      startIdx += pattern.length;
      break;
    }
  }
  if (startIdx === -1) return null;
  while (startIdx < content.length && content[startIdx] === ' ') startIdx++;
  if (content[startIdx] !== '{') return null;

  let braceCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let endIdx = startIdx;
  for (let i = startIdx; i < content.length; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';
    if (!inDoubleQuote && !inTemplate && ch === "'" && prev !== '\\') inSingleQuote = !inSingleQuote;
    else if (!inSingleQuote && !inTemplate && ch === '"' && prev !== '\\') inDoubleQuote = !inDoubleQuote;
    else if (!inSingleQuote && !inDoubleQuote && ch === '`' && prev !== '\\') inTemplate = !inTemplate;
    if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
      if (ch === '{') braceCount++;
      else if (ch === '}') {
        braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
    }
  }
  if (braceCount !== 0) return null;
  return content.substring(startIdx, endIdx);
}

function parseViewDescs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const objStr = extractViewDescsObject(content);
  if (!objStr) return null;

  const cards = [];
  const cardPattern = /\{\s*id:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'[\s\S]*?badge:\s*'([^']*)'[\s\S]*?rows:\s*\[([\s\S]*?)\]\s*\}/g;
  let m;
  while ((m = cardPattern.exec(objStr)) !== null) {
    const rowsText = m[4];
    const labels = [];
    let rowPattern;
    const labelRe = /ROW\(\s*'([^']+)'/g;
    while ((rowPattern = labelRe.exec(rowsText)) !== null) {
      const cn = rowPattern[1];
      labels.push(VIEW_DESC_LABEL_MAP[cn] || cn);
    }
    const liCount = (rowsText.match(/\bLI\(/g) || []).length;
    const acRefs = (rowsText.match(/AC-\d+/gi) || []).length;
    const reuseRefs = (rowsText.match(/REUSE-[A-Z0-9_-]+/gi) || []).length;
    cards.push({
      id: m[1],
      title: m[2],
      badge: m[3],
      labels: Array.from(new Set(labels)),
      liCount,
      acRefs,
      reuseRefs
    });
  }
  return cards.length ? cards : null;
}

function validateViewDescs(cards) {
  return cards.map(card => {
    const missing = VIEW_DESC_REQUIRED.filter(req => !card.labels.includes(req));
    const covered = card.labels.filter(l => ['style', 'context', 'acceptance', 'reuse', 'fields'].includes(l));
    return { card, missing, covered, pass: missing.length === 0 };
  });
}

function generateViewDescsReport(results) {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  const missingCount = results.reduce((s, r) => s + r.missing.length, 0);

  let output = '\n';
  output += 'spec-analyze 注释卡片覆盖验证 v3.6（VIEW_DESCS 兼容模式）\n';
  output += '========================================================\n\n';
  for (const r of results) {
    const status = r.pass ? '✓' : '✗';
    output += `[${status}] ${r.card.id} ${r.card.title}（${r.card.badge}）\n`;
    output += `    必填行: ${VIEW_DESC_REQUIRED.map(k => r.card.labels.includes(k) ? `${k}✓` : `${k}✗`).join(' ')}\n`;
    output += `    覆盖行: ${r.covered.length ? r.covered.join(' ') : '（无）'}\n`;
    if (r.card.acRefs > 0 || r.card.reuseRefs > 0 || r.card.liCount > 0) {
      output += `    引用: AC×${r.card.acRefs} REUSE×${r.card.reuseRefs} LI×${r.card.liCount}\n`;
    }
    if (!r.pass) {
      output += `    缺失: ${r.missing.join(' / ')}\n`;
    }
    output += '\n';
  }
  output += '---\n';
  output += `总计: ${total} 卡片  通过: ${passed}  失败: ${failed}  必填行缺失: ${missingCount}\n`;
  const grade = failed === 0 ? 'A' : missingCount > total ? 'C' : 'B';
  output += `质量评级: ${grade}\n`;
  return { text: output, json: { total, passed, failed, missing: missingCount, grade, cards: results } };
}

// ============================================================
// 中文块名 → 英文块名归一化（注释规范 v3.6.2：注释全中文展示）
// ============================================================
const CHINESE_BLOCK_MAP = {
  '触发条件': 'trigger',
  '业务背景': 'background',
  '行为描述': 'behavior',
  '接口定义': 'api',
  '上下文': 'context',
  '权限': 'permission',
  '关闭/消除': 'dismiss',
  '样式': 'style',
  '数据': 'data',
  '交互': 'interaction',
  '选项': 'items',
  '确认内容': 'content',
  '弹窗上下文': 'dialogcontext',
  '依赖关系': 'dependency',
  '列定义': 'columns',
  '分页': 'pagination',
  '选择': 'selection',
  '行操作': 'rowactions',
  '字段定义': 'fields',
  '默认值': 'default',
  '条件': 'condition',
  '校验规则': 'validation',
  '格式': 'format',
  '动态列': 'dynamiccolumns',
  '自动生成': 'autogeneration',
  '自动生成规则': 'autogeneration',
  '手动输入': 'manualinput',
  '手动输入规则': 'manualinput',
  '数据流': 'dataflow',
  '搜索': 'search',
  '匹配': 'match',
  '展示': 'display',
  '回调': 'callback',
  '确认': 'confirm',
  '类型': 'types',
  '时序': 'timing',
  '位置': 'placement',
};

/** 将块标题归一化为英文标识符（用于匹配 requiredBlocks） */
function normalizeBlockTitle(title) {
  const t = (title || '').toLowerCase().trim();
  for (const [cn, en] of Object.entries(CHINESE_BLOCK_MAP)) {
    if (t.includes(cn)) return en;
  }
  return t;
}

// ============================================================
// 验证器
// ============================================================

function validateAnnotation(key, annotation, levelLabels) {
  const errors = [];
  const warnings = [];

  if (!annotation.type) {
    errors.push({ key, field: 'type', msg: '缺少 type 字段' });
    return { key, type: 'unknown', errors, warnings, pass: false };
  }

  // 标准化 type: 支持 "T1"、"1"、1 三种格式
  let type = annotation.type;
  if (typeof type === 'number') type = 'T' + type;
  else if (typeof type === 'string' && /^\d+$/.test(type)) type = 'T' + type;
  else if (typeof type === 'string') type = type.toUpperCase();

  const schema = TYPE_SCHEMAS[type];
  if (!schema) {
    errors.push({ key, field: 'type', msg: `未知类型: ${type}` });
    return { key, type, errors, warnings, pass: false };
  }

  // 1. 检查必填 blocks
  if (annotation.blocks && Array.isArray(annotation.blocks)) {
    const blockTitles = annotation.blocks.map(b => normalizeBlockTitle(b.title));
    for (const req of schema.requiredBlocks) {
      const found = blockTitles.some(t => t.includes(req));
      if (!found) {
        errors.push({ key, field: 'blocks', msg: `缺少必填块: ${req}` });
      }
    }
  } else {
    errors.push({ key, field: 'blocks', msg: '缺少 blocks 数组' });
  }

  // 2. 检查 state 覆盖
  // 兼容性: 支持 state (对象) 和 states (字符串) 两种格式
  if (annotation.state) {
    const stateKeys = Object.keys(annotation.state);
    for (const req of schema.stateRequired) {
      if (!stateKeys.includes(req)) {
        errors.push({ key, field: 'state', msg: `缺少必填状态: ${req}` });
      }
    }
    if (schema.stateOptional) {
      for (const opt of schema.stateOptional) {
        if (!stateKeys.includes(opt)) {
          warnings.push({ key, field: 'state', msg: `建议覆盖状态: ${opt}` });
        }
      }
    }

    // 检查衍生状态 (derived state)
    for (const [stateKey, stateValue] of Object.entries(annotation.state)) {
      if (stateValue && typeof stateValue === 'object' && stateValue._derived) {
        if (!stateValue.dependsOn && !stateValue.依赖) {
          warnings.push({ key, field: `state.${stateKey}`, msg: 'R022: 衍生状态建议标注 dependsOn/依赖来源' });
        }
      }
    }
  } else if (annotation.states) {
    // states 字符串格式兼容: 仅记录警告，不阻断
    warnings.push({ key, field: 'states', msg: '使用 states 字符串格式，建议迁移为 state 对象格式' });
  } else {
    errors.push({ key, field: 'state', msg: '缺少 state 对象' });
  }

  // 3. 检查 shared blocks
  if (schema.sharedBlocks) {
    if (schema.sharedBlocks.api && !annotation.api) {
      errors.push({ key, field: 'api', msg: '缺少 api (Block B) 定义' });
    }
    if (schema.sharedBlocks.context && !annotation.context) {
      // 检查嵌套组件的 context 继承
      if (!annotation._parentContext) {
        errors.push({ key, field: 'context', msg: '缺少 context 定义' });
      }
    }
    if (schema.sharedBlocks.permission && !annotation.context) {
      errors.push({ key, field: 'context', msg: '缺少 permission (Block C) 定义' });
    }
  }

  // 4. 检查 level
  if (annotation.level) {
    const levelNum = parseInt(annotation.level.replace('L', ''));
    const minNum = parseInt(schema.minLevel.replace('L', ''));
    if (levelNum < minNum) {
      const label = levelLabels[annotation.level] || annotation.level;
      const minLabel = levelLabels[schema.minLevel] || schema.minLevel;
      warnings.push({ key, field: 'level', msg: `最小注释等级为 ${schema.minLevel} (${minLabel})，当前为 ${annotation.level} (${label})` });
    }
  } else {
    warnings.push({ key, field: 'level', msg: '缺少 level 字段' });
  }

  // 5. 检查 content rules
  if (annotation.blocks && Array.isArray(annotation.blocks)) {
    for (const block of annotation.blocks) {
      for (const line of (block.lines || [])) {
        if (CONTENT_RULES.R003.test && !CONTENT_RULES.R003.test(line)) {
          warnings.push({ key, field: `blocks.${block.title}`, msg: `R003: 含模糊词` });
        }
        if (CONTENT_RULES.R006.test && !CONTENT_RULES.R006.test(line)) {
          errors.push({ key, field: `blocks.${block.title}`, msg: `R006: 含未替换占位符` });
        }
        if (CONTENT_RULES.R007.test && !CONTENT_RULES.R007.test(line)) {
          warnings.push({ key, field: `blocks.${block.title}`, msg: `R007: 含 "N/A" 或"不适用"` });
        }
        // behavior 块检查 R009
        if (normalizeBlockTitle(block.title).includes('behavior') && CONTENT_RULES.R009.test && !CONTENT_RULES.R009.test(line)) {
          warnings.push({ key, field: `blocks.${block.title}`, msg: 'R009: behavior 建议标注 F00X 引用' });
        }
      }
    }
  }

  // 6. 检查 background (Block D)
  if (annotation.background) {
    if (!annotation.background.rationale) {
      errors.push({ key, field: 'background', msg: 'Block D: 缺少 rationale 字段' });
    } else if (!CONTENT_RULES.R019.test(annotation.background.rationale)) {
      warnings.push({ key, field: 'background.rationale', msg: 'R019: rationale 缺少"为什么"语义' });
    }
  }

  // 7. 检查 fields 级注释 (T6 FormFill)
  if (annotation.fields) {
    for (const [fieldKey, field] of Object.entries(annotation.fields)) {
      if (!field.desc) {
        warnings.push({ key, field: `fields.${fieldKey}`, msg: 'R012: 缺少 desc 字段' });
      }
      // 检查 autoGenerate 字段
      if (field.autoGenerate) {
        if (!CONTENT_RULES.R021.test(field.autoGenerate)) {
          warnings.push({ key, field: `fields.${fieldKey}.autoGenerate`, msg: 'R021: autoGenerate 建议包含生成公式和触发条件' });
        }
      }
      // 检查 readonly 字段
      if (field.readonly !== undefined && typeof field.readonly !== 'boolean' && typeof field.readonly !== 'string') {
        warnings.push({ key, field: `fields.${fieldKey}.readonly`, msg: 'readonly 应为 boolean 或 string' });
      }
      // 检查 uniqueness 字段
      if (field.uniqueness !== undefined && typeof field.uniqueness !== 'boolean' && typeof field.uniqueness !== 'string') {
        warnings.push({ key, field: `fields.${fieldKey}.uniqueness`, msg: 'uniqueness 应为 boolean 或 string' });
      }
    }
  }

  // 8. 检查 Block G (BusinessRules)
  if (annotation.businessRules) {
    if (!Array.isArray(annotation.businessRules)) {
      errors.push({ key, field: 'businessRules', msg: 'Block G: businessRules 应为数组' });
    } else {
      for (let i = 0; i < annotation.businessRules.length; i++) {
        const br = annotation.businessRules[i];
        if (!br.ruleId) errors.push({ key, field: `businessRules[${i}]`, msg: 'Block G: 缺少 ruleId' });
        if (!br.scope) errors.push({ key, field: `businessRules[${i}]`, msg: 'Block G: 缺少 scope' });
        if (!br.condition) errors.push({ key, field: `businessRules[${i}]`, msg: 'Block G: 缺少 condition' });
        if (!br.rule) errors.push({ key, field: `businessRules[${i}]`, msg: 'Block G: 缺少 rule' });
      }
    }
  }

  // 9. 检查 Block H (DataFlow)
  if (annotation.dataFlow) {
    if (Array.isArray(annotation.dataFlow)) {
      for (let i = 0; i < annotation.dataFlow.length; i++) {
        const df = annotation.dataFlow[i];
        if (typeof df === 'string') continue; // 字符串格式允许
        if (!df.from && !df.source) {
          warnings.push({ key, field: `dataFlow[${i}]`, msg: 'Block H: 建议标注数据来源 (from/source)' });
        }
        if (!df.to && !df.target) {
          warnings.push({ key, field: `dataFlow[${i}]`, msg: 'Block H: 建议标注数据目标 (to/target)' });
        }
      }
    } else if (typeof annotation.dataFlow === 'object') {
      // 对象格式允许
    } else {
      warnings.push({ key, field: 'dataFlow', msg: 'Block H: dataFlow 建议为数组或对象格式' });
    }
  }

  return {
    key,
    type: type,
    name: schema.name,
    errors,
    warnings,
    pass: errors.length === 0
  };
}

// ============================================================
// 报告生成
// ============================================================

function generateReport(results, levelLabels) {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings.length, 0);

  let output = '\n';
  output += 'spec-analyze 注释质量验证 v2.3\n';
  output += '==============================\n\n';

  for (const r of results) {
    const status = r.pass ? '✓' : '✗';
    const levelStr = r.level ? ` ${levelLabels[r.level] || r.level}` : '';
    output += `[${status}] ${r.key} (${r.type} ${r.name || ''}${levelStr})\n`;
    for (const e of r.errors) {
      output += `    错误: [${e.field}] ${e.msg}\n`;
    }
    for (const w of r.warnings) {
      output += `    警告: [${w.field}] ${w.msg}\n`;
    }
    if (r.errors.length === 0 && r.warnings.length === 0) {
      output += '    全部通过\n';
    }
    output += '\n';
  }

  output += '---\n';
  output += `总计: ${total}  通过: ${passed}  失败: ${failed}  错误: ${totalErrors}  警告: ${totalWarnings}\n`;

  let grade = 'A';
  if (failed > 0) grade = 'C';
  else if (totalWarnings > total) grade = 'B';
  output += `质量评级: ${grade}\n`;

  return { text: output, json: { total, passed, failed, errors: totalErrors, warnings: totalWarnings, grade, results } };
}

// ============================================================
// 评审模式 review-docs 校验（v3.7）
// ============================================================

function validateReviewDocs(content) {
  const errors = [];
  const warnings = [];
  const m = content.match(/<script id="review-docs" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return { present: false, valid: true, errors, warnings };
  let docs;
  try { docs = JSON.parse(m[1]); }
  catch (e) { return { present: true, valid: false, errors: ['review-docs JSON 解析失败: ' + e.message], warnings }; }
  const SCOPES = ['existing', 'new', 'adjusted'];
  const compIds = new Set(
    [...content.matchAll(/data-proto-id="([^"]+)"/g)].map(x => x[1])
  );

  // Product-only 交付边界（v4.0）：直接检查场景顶层字段的 delivery layer 归属。
  // 场景内的 annotation 子对象是产品描述性内容，不逐字段递归校验；
  // 仅拦截场景顶层出现的 implementation/acceptance 字段，以及合同未登记的未知字段。
  const PRODUCT_IDX = DELIVERY_CONTRACT.layers.indexOf('product');
  for (const [sid, scene] of Object.entries(docs)) {
    for (const field of Object.keys(scene)) {
      const owner = DELIVERY_CONTRACT.field_owners[field];
      if (!owner) {
        errors.push(`场景 ${sid} 违反 Product-only 交付边界: 未知字段 ${field}（UNKNOWN_FIELD）`);
      } else if (DELIVERY_CONTRACT.layers.indexOf(owner) > PRODUCT_IDX) {
        errors.push(`场景 ${sid} 违反 Product-only 交付边界: 字段 ${field} 属于 ${owner} 层（DELIVERY_LAYER_VIOLATION）`);
      }
    }
  }

  Object.keys(docs).forEach(sid => {
    const scene = docs[sid];
    if (!scene.heading) errors.push(`场景 ${sid} 缺少 heading`);
    if (!Array.isArray(scene.items)) { errors.push(`场景 ${sid} 缺少 items 数组`); return; }
    scene.items.forEach((it, i) => {
      const ref = `${sid}#${i + 1}`;
      if (!it.protoId) errors.push(`条目 ${ref} 缺少 protoId`);
      else if (!compIds.has(it.protoId)) errors.push(`条目 ${ref} 的 protoId "${it.protoId}" 无对应 data-proto-id 组件`);
      if (!it.title) errors.push(`条目 ${ref} 缺少 title`);
      if (!SCOPES.includes(it.scopeMark)) errors.push(`条目 ${ref} scopeMark 非法: ${it.scopeMark}（允许 existing/new/adjusted）`);
      if (it.decision !== undefined) warnings.push(`条目 ${ref} 不应携带 decision（decision 属于场景级）`);
    });
    if (scene.decision !== undefined && typeof scene.decision !== 'string') errors.push(`场景 ${sid} decision 必须为字符串`);
  });
  return { present: true, valid: errors.length === 0, errors, warnings };
}

function generateReviewDocsReport(reviewDocs) {
  let output = '\n';
  output += 'spec-analyze 评审模式注释校验 v3.7（review-docs）\n';
  output += '================================================\n\n';
  if (reviewDocs.errors.length === 0) {
    output += '✓ review-docs 结构合法（场景/条目/protoId 配对/scopeMark 枚举全部通过）\n';
  } else {
    for (const e of reviewDocs.errors) output += `✗ ${e}\n`;
  }
  for (const w of reviewDocs.warnings) output += `⚠ ${w}\n`;
  output += '\n---\n';
  output += `错误: ${reviewDocs.errors.length}  警告: ${reviewDocs.warnings.length}\n`;
  const json = {
    mode: 'review-docs',
    valid: reviewDocs.valid,
    errors: reviewDocs.errors.length,
    warnings: reviewDocs.warnings.length,
    reviewDocs
  };
  return { text: output, json };
}

// ============================================================
// 迁移模式
// ============================================================

function migrateAnnotations(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('ANNOTATIONS')) {
    console.log('文件已有 ANNOTATIONS 数据，跳过迁移');
    return false;
  }

  const oldPattern = /<!--\s*(T\d)\s*(L[1-3])?\s*-->/g;
  let match;
  let count = 0;
  let newContent = content;

  while ((match = oldPattern.exec(content)) !== null) {
    const type = match[1];
    const level = match[2] || 'L1';
    const key = `migrated_${count}`;

    const annotationEntry = `\n  "${key}": {
    type: "${type}",
    level: "${level}",
    label: "${type} 组件",
    blocks: [
      { title: "触发条件", lines: ["待补充触发条件"] }
    ]
  },`;

    const scriptEnd = newContent.lastIndexOf('</script>');
    if (scriptEnd !== -1) {
      const annotationsEnd = newContent.lastIndexOf('};', scriptEnd);
      if (annotationsEnd !== -1) {
        newContent = newContent.substring(0, annotationsEnd + 1) + annotationEntry + newContent.substring(annotationsEnd + 1);
      }
    }
    count++;
  }

  if (count > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`迁移完成: ${count} 个组件已添加 ANNOTATIONS 占位`);
    return true;
  }

  console.log('未发现可迁移的旧格式注释');
  return false;
}

// ============================================================
// 测试用例生成器
// ============================================================

const STATE_TEST_MAP = {
  normal: { type: 'positive', label: '正常展示' },
  loading: { type: 'loading', label: '加载中' },
  empty: { type: 'empty', label: '空数据' },
  error: { type: 'error', label: '接口异常' },
  disabled: { type: 'negative', label: '禁用态' },
  submitting: { type: 'loading', label: '提交中' },
  success: { type: 'positive', label: '成功' },
  fieldError: { type: 'negative', label: '字段校验失败' },
  apiError: { type: 'error', label: '业务错误' },
  open: { type: 'positive', label: '展开' },
  hidden: { type: 'positive', label: '隐藏' },
  visible: { type: 'positive', label: '展示' },
  show: { type: 'positive', label: '展示' },
  idle: { type: 'positive', label: '空闲' },
  focus: { type: 'positive', label: '聚焦' },
  searching: { type: 'loading', label: '搜索中' },
  selected: { type: 'positive', label: '已选择' },
  searchEmpty: { type: 'empty', label: '搜索无结果' },
  confirming: { type: 'loading', label: '确认中' }
};

function generateTestCases(annotations) {
  const testCases = [];
  for (const [key, ann] of Object.entries(annotations)) {
    let type = ann.type;
    if (typeof type === 'number') type = 'T' + type;
    else if (typeof type === 'string' && /^\d+$/.test(type)) type = 'T' + type;
    else if (typeof type === 'string') type = type.toUpperCase();

    const schema = TYPE_SCHEMAS[type];
    const typeName = schema ? schema.name : type;

    // 兼容: 支持 state (对象) 和 states (字符串) 格式
    const stateObj = ann.state || (ann.states ? {} : null);
    if (!stateObj) continue;

    let seq = 1;
    for (const [stateKey, stateDesc] of Object.entries(stateObj)) {
      // 跳过衍生状态（不生成测试用例）
      if (stateDesc && typeof stateDesc === 'object' && stateDesc._derived) continue;

      const map = STATE_TEST_MAP[stateKey] || { type: 'positive', label: stateKey };
      const tcId = `TC-${key}-${String(seq).padStart(3, '0')}`;

      // 提取 trigger 信息
      let triggerText = '';
      if (ann.blocks && Array.isArray(ann.blocks)) {
        const triggerBlock = ann.blocks.find(b => (b.title || '').includes('trigger') || (b.title || '').includes('触发'));
        if (triggerBlock && triggerBlock.lines) triggerText = triggerBlock.lines[0] || '';
      }

      // 提取 state 描述（支持对象和字符串两种格式）
      let expectedDesc = stateDesc;
      if (stateDesc && typeof stateDesc === 'object') {
        expectedDesc = stateDesc.desc || stateDesc.description || '';
      }

      testCases.push({
        id: tcId,
        component: key,
        componentType: `${type} ${typeName}`,
        scenario: map.label,
        state: stateKey,
        testType: map.type,
        precondition: triggerText || '进入页面',
        steps: map.type === 'positive'
          ? ['执行操作', '观察组件表现']
          : ['触发异常条件', '观察组件表现'],
        expected: expectedDesc || '组件按预期展示',
        verification: `${typeName} ${stateKey} 状态表现正确`
      });
      seq++;
    }
  }
  return testCases;
}

function printTestCases(testCases, format) {
  if (format === 'json') {
    const grouped = {};
    for (const tc of testCases) {
      if (!grouped[tc.component]) grouped[tc.component] = [];
      grouped[tc.component].push(tc);
    }
    return JSON.stringify({ generated: new Date().toISOString(), testCases: grouped }, null, 2);
  }

  let output = '\n';
  output += 'spec-analyze 测试用例生成\n';
  output += '========================\n\n';

  const grouped = {};
  for (const tc of testCases) {
    if (!grouped[tc.component]) grouped[tc.component] = [];
    grouped[tc.component].push(tc);
  }

  for (const [comp, cases] of Object.entries(grouped)) {
    output += `## ${comp} (${cases[0].componentType})\n\n`;
    for (const tc of cases) {
      output += `### ${tc.id}: ${tc.scenario}\n`;
      output += `- **类型:** ${tc.testType}\n`;
      output += `- **前置条件:** ${tc.precondition}\n`;
      output += `- **操作步骤:** ${tc.steps.join(' → ')}\n`;
      output += `- **预期结果:** ${tc.expected}\n`;
      output += `- **验证点:** ${tc.verification}\n\n`;
    }
  }

  output += '---\n';
  output += `总计: ${testCases.length} 个测试用例\n`;
  return output;
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法: node scripts/validate-annotations.js <path> [--migrate] [--json] [--testcases] [--level-labels "基础/详细/完整"]');
    process.exit(1);
  }

  const targetPath = args[0];
  const isMigrate = args.includes('--migrate');
  const isJson = args.includes('--json');
  const isTestCases = args.includes('--testcases');

  // 解析等级标签
  const levelLabelsArg = args.find(a => a.startsWith('--level-labels'));
  const levelLabels = levelLabelsArg ? parseLevelLabels(levelLabelsArg.split('=')[1] || '') : DEFAULT_LEVEL_LABELS;

  if (!fs.existsSync(targetPath)) {
    console.error(`文件不存在: ${targetPath}`);
    process.exit(1);
  }

  if (isMigrate) {
    migrateAnnotations(targetPath);
  }

  // 评审模式（v3.7）：检测内嵌 review-docs JSON，与 ANNOTATIONS/VIEW_DESCS 并列的第三种数据格式
  const htmlContent = fs.readFileSync(targetPath, 'utf-8');
  const reviewDocs = validateReviewDocs(htmlContent);

  let annotations = parseHTMLAnnotations(targetPath);
  if (!annotations) {
    const cards = parseViewDescs(targetPath);
    if (cards && cards.length) {
      const results = validateViewDescs(cards);
      const report = generateViewDescsReport(results);
      if (isJson) {
        console.log(JSON.stringify(report.json, null, 2));
      } else {
        console.log(report.text);
      }
      if (report.json.failed > 0) process.exit(1);
      return;
    }
    if (reviewDocs.present) {
      const report = generateReviewDocsReport(reviewDocs);
      if (isJson) {
        console.log(JSON.stringify(report.json, null, 2));
      } else {
        console.log(report.text);
      }
      if (!reviewDocs.valid) process.exit(1);
      return;
    }
    console.error('无法解析 ANNOTATIONS、VIEW_DESCS 或 review-docs 数据');
    console.error('确保 HTML 文件包含 window.ANNOTATIONS = {...}、const VIEW_DESCS = {...} 或 <script id="review-docs" type="application/json">');
    process.exit(1);
  }

  if (isTestCases) {
    const testCases = generateTestCases(annotations);
    console.log(printTestCases(testCases, isJson ? 'json' : 'markdown'));
    return;
  }

  const results = [];
  for (const [key, annotation] of Object.entries(annotations)) {
    results.push(validateAnnotation(key, annotation, levelLabels));
  }

  const report = generateReport(results, levelLabels);

  // S3c 挂接点：同文件内嵌 review-docs 时，校验结果并入总错误（影响退出码与 --json 输出）
  if (reviewDocs.present) {
    report.json.reviewDocs = reviewDocs;
    if (!reviewDocs.valid) {
      report.text += '\n评审模式 review-docs 校验失败:\n';
      report.text += reviewDocs.errors.map(e => '  ✗ ' + e).join('\n') + '\n';
    }
  }

  if (isJson) {
    console.log(JSON.stringify(report.json, null, 2));
  } else {
    console.log(report.text);
  }

  if (report.json.failed > 0 || (reviewDocs.present && !reviewDocs.valid)) {
    process.exit(1);
  }
}

main();
