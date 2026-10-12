#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadContract } = require('./delivery-contract.cjs');
const CONTRACT = loadContract(path.join(__dirname, '..', 'references', 'delivery-contract.json'));
const TYPES = ['DisplayMetric', 'DataList', 'ActionButton', 'ActionMenu', 'ConfirmAction', 'FormFill', 'ItemSelect', 'SearchSelect', 'Toast', 'StatusPlaceholder', 'PageInfo'];
const PM_FIELDS = ['summary', 'feature', 'logic', 'states', 'boundary', 'copy'];
const REQUIRED = PM_FIELDS.filter(field => field !== 'copy');
// These keys and comment markers are read only by migration/rejection guards.
const RETIRED = ['level', 'levelLabels', 'level_labels', 'minLevel', 'L1', 'L2', 'L3'];
const LEGACY_BLOCKS = [
  ['trigger', 'data'], ['trigger', 'columns', 'pagination'], ['trigger', 'behavior'],
  ['trigger', 'items', 'dismiss'], ['trigger', 'behavior', 'content'],
  ['trigger', 'fields', 'behavior', 'dismiss'], ['trigger', 'search', 'selection', 'confirm', 'dismiss'],
  ['trigger', 'match', 'display', 'callback', 'dismiss'], ['trigger', 'behavior', 'types', 'timing', 'placement'],
  ['trigger', 'behavior', 'content'], ['trigger', 'content', 'placement', 'dismiss']
];
const LEGACY_LABELS = { '触发条件': 'trigger', '行为描述': 'behavior', '数据': 'data', '列定义': 'columns', '分页': 'pagination', '选项': 'items', '关闭条件': 'dismiss', '关闭/消除': 'dismiss', '字段定义': 'fields', '确认内容': 'content', '搜索': 'search', '选择': 'selection', '确认': 'confirm', '匹配': 'match', '展示': 'display', '回调': 'callback', '类型': 'types', '时序': 'timing', '位置': 'placement' };

function retiredPaths(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const ref = prefix ? `${prefix}.${key}` : key;
    return [...(RETIRED.includes(key) ? [ref] : []), ...retiredPaths(child, ref)];
  });
}

const PRODUCT_ONLY_RULES = [
  ['API_PATH', /(?:https?:\/\/[^\s"'<>]+)?\/(?:api|v\d+|graphql|rpc)(?=[\/\s?#，。；："'<>]|$)|\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/[^\s]+/i],
  ['HTTP_STATUS', /\bHTTP(?:\s+(?:status|code|状态码?))?\s*[:：=]?\s*[1-5]\d{2}\b|(?:状态码|响应码|返回码|status\s*(?:code)?)\s*[:：=]?\s*[1-5]\d{2}\b|\b(?:200\s+OK|201\s+Created|400\s+Bad\s+Request|401\s+Unauthorized|403\s+Forbidden|404\s+Not\s+Found|500\s+Internal\s+Server\s+Error)\b/i],
  ['TIMING', /\b(?:timing|debounce|throttle|setTimeout|setInterval|requestAnimationFrame)\b|\d+(?:\.\d+)?\s*(?:ms|milliseconds?|毫秒)\b|\d+(?:\.\d+)?\s*毫秒/i],
  ['CSS_PIXEL', /\d+(?:\.\d+)?\s*(?:px\b|像素)|\bpixels?\b/i],
  ['ARIA_ATTRIBUTE', /\baria[-_][a-z][a-z_-]*\b/i],
  ['I18N_KEY', /\bi18n\b|\b(?:t|translate)\s*\(\s*["'][\w.-]+["']|\b[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+\b/i],
  ['SNAKE_CASE', /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/i],
  ['RETIRED_LEVEL', /\bL[123]\b|\b(?:levelLabels|level_labels|minLevel)\b|(?:注释|行动|权限)等级\s*[:：=]?\s*(?:低|中|高|[123])|\blevel\s*[:：=]\s*["']?(?:[123]|low|medium|high)\b/i]
];

function validatePM(key, ann) {
  const errors = [], warnings = [];
  const issue = (field, msg) => errors.push({ key, field, msg });
  if (!ann || typeof ann !== 'object' || Array.isArray(ann)) {
    issue('annotation', '注释必须为对象');
    return { key, errors, warnings, pass: false };
  }
  const typeIndex = /^T([1-9]|10|11)$/.exec(ann.type);
  if (!typeIndex) issue('type', '组件 type 必须为 T1-T11');
  for (const field of REQUIRED) {
    if (typeof ann[field] !== 'string' || !ann[field].trim()) issue(field, `缺少非空 PM 字段: ${field}`);
  }
  for (const field of Object.keys(ann)) {
    if (!['type', ...PM_FIELDS].includes(field)) issue(field, `当前 PM 注释不接受字段: ${field}`);
  }
  for (const field of PM_FIELDS) {
    const value = ann[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !value.trim()) {
      if (field === 'copy') issue(field, 'copy 必须为非空字符串，无文案时省略');
      continue;
    }
    for (const [code, pattern] of PRODUCT_ONLY_RULES) {
      const match = pattern.exec(value);
      if (match) issue(field, `Product-only 字符串禁止技术或旧等级内容（${code}）: ${match[0]}`);
    }
    if (/待补充|待填写|\{.*(?:占位符|示例).*\}/.test(value)) issue(field, '含未完成占位内容');
    if (/可能|应该|酌情|大概|也许/.test(value)) warnings.push({ key, field, msg: '含模糊词' });
  }
  return { key, type: ann.type, name: typeIndex ? TYPES[Number(typeIndex[1]) - 1] : undefined, errors, warnings, pass: errors.length === 0 };
}

function parseAnnotations(content) {
  const assignment = /(?:window\.)?ANNOTATIONS\s*=\s*/.exec(content);
  if (!assignment) {
    const block = /```json\s*([\s\S]*?)```/.exec(content);
    if (!block) return null;
    return JSON.parse(block[1]);
  }
  const start = assignment.index + assignment[0].length;
  let depth = 0, quote = null, escape = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = null;
    } else if (['"', "'", '`'].includes(ch)) quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      return vm.runInNewContext(`(${content.slice(start, i + 1)})`, Object.create(null), { timeout: 1000 });
    }
  }
  throw new Error('ANNOTATIONS 对象未闭合');
}

function validateReview(content) {
  const match = /<script\s+id="review-docs"\s+type="application\/json">([\s\S]*?)<\/script>/.exec(content);
  if (!match) return { present: false, valid: true, errors: [], warnings: [] };
  const errors = [], warnings = [];
  let docs;
  try { docs = JSON.parse(match[1]); }
  catch (e) { return { present: true, valid: false, errors: ['review-docs JSON 解析失败: ' + e.message], warnings }; }
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return { present: true, valid: false, errors: ['review-docs 必须为场景对象'], warnings };
  const renderedContent = content.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  const ids = new Set([...renderedContent.matchAll(/data-proto-id="([^"]+)"/g)].map(m => m[1]));
  const idCounts = [...renderedContent.matchAll(/data-proto-id="([^"]+)"/g)].reduce((counts, match) => counts.set(match[1], (counts.get(match[1]) || 0) + 1), new Map());
  for (const [id, count] of idCounts) if (count !== 1) errors.push(`data-proto-id ${id} 必须唯一，实际出现 ${count} 次`);
  for (const ref of retiredPaths(docs)) errors.push(`废弃注释字段: ${ref}`);
  for (const [sid, scene] of Object.entries(docs)) {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) { errors.push(`场景 ${sid} 必须为对象`); continue; }
    for (const field of Object.keys(scene)) {
      const owner = CONTRACT.field_owners[field];
      if (!owner) errors.push(`场景 ${sid} 违反 Product-only 交付边界: 未知字段 ${field}（UNKNOWN_FIELD）`);
      else if (owner !== 'product') errors.push(`场景 ${sid} 违反 Product-only 交付边界: 字段 ${field} 属于 ${owner} 层（DELIVERY_LAYER_VIOLATION）`);
    }
    if (typeof scene.heading !== 'string' || !scene.heading.trim()) errors.push(`场景 ${sid} 缺少 heading`);
    if (!Array.isArray(scene.items)) { errors.push(`场景 ${sid} 缺少 items 数组`); continue; }
    scene.items.forEach((item, i) => {
      const ref = `${sid}#${i + 1}`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) { errors.push(`条目 ${ref} 必须为对象`); return; }
      if (!item.protoId || !ids.has(item.protoId)) errors.push(`条目 ${ref} protoId 无对应 data-proto-id 组件`);
      if (item.protoId && idCounts.get(item.protoId) !== 1) errors.push(`条目 ${ref} protoId 必须唯一`);
      if (typeof item.title !== 'string' || !item.title.trim()) errors.push(`条目 ${ref} 缺少 title`);
      if (!['existing', 'new', 'adjusted'].includes(item.scopeMark)) errors.push(`条目 ${ref} scopeMark 非法: ${item.scopeMark}`);
      for (const field of Object.keys(item)) {
        if (!['protoId', 'title', 'type', 'scopeMark', 'summary', 'annotation'].includes(field)) errors.push(`条目 ${ref} 未知字段: ${field}`);
      }
      const ann = item.annotation;
      if (ann && Object.prototype.hasOwnProperty.call(ann, 'summary')) errors.push(`条目 ${ref} summary 必须位于条目顶层`);
      if (ann && Object.prototype.hasOwnProperty.call(ann, 'type')) errors.push(`条目 ${ref} type 必须位于条目顶层`);
      const result = validatePM(ref, { ...(ann || {}), type: item.type, summary: item.summary });
      errors.push(...result.errors.map(e => `${ref}.${e.field}: ${e.msg}`));
      warnings.push(...result.warnings.map(w => `${ref}.${w.field}: ${w.msg}`));
    });
    if (scene.decision !== undefined && typeof scene.decision !== 'string') errors.push(`场景 ${sid} decision 必须为字符串`);
  }
  return { present: true, valid: errors.length === 0, errors, warnings };
}

function validateLegacy(key, ann) {
  const errors = [], warnings = [{ key, field: 'compatibility', msg: '旧 blocks 格式仅供迁移读取；新输出使用 PM 六字段' }];
  const idx = Number(String(ann.type).replace(/^T/i, '')) - 1;
  if (!LEGACY_BLOCKS[idx]) errors.push({ key, field: 'type', msg: '未知组件类型' });
  const titles = (ann.blocks || []).map(b => LEGACY_LABELS[b.title] || b.title.toLowerCase());
  for (const field of LEGACY_BLOCKS[idx] || []) {
    if (!titles.includes(field)) errors.push({ key, field: 'blocks', msg: `缺少必填块: ${field}` });
  }
  if (!ann.state && !ann.states) errors.push({ key, field: 'state', msg: '缺少状态描述' });
  return { key, type: `T${idx + 1}`, errors, warnings, pass: errors.length === 0 };
}

function migrate(file, content) {
  let annotations = parseAnnotations(content);
  if (!annotations) {
    annotations = Object.fromEntries([...content.matchAll(/<!--\s*(T(?:[1-9]|10|11))\s*(?:L[1-3])?\s*-->/g)].map((m, i) => [`migrated_${i}`, { type: m[1] }]));
  }
  if (!Object.keys(annotations).length) throw new Error('未发现可迁移的旧格式注释');
  const migrated = {};
  for (const [key, ann] of Object.entries(annotations)) {
    const blocks = Array.isArray(ann.blocks) ? ann.blocks : [];
    const lines = pattern => blocks.filter(b => pattern.test(b.title)).flatMap(b => b.lines || []).join('\n');
    const entry = {
      type: /^T/.test(String(ann.type)) ? ann.type : `T${ann.type}`,
      summary: ann.summary || ann.desc || '',
      feature: ann.feature || ann.desc || '',
      logic: ann.logic || lines(/trigger|behavior|dismiss|触发|行为|关闭/i),
      states: typeof ann.states === 'string' ? ann.states : Object.entries(ann.state || {}).map(([s, v]) => `${s}：${typeof v === 'string' ? v : v.desc || ''}`).join('\n'),
      boundary: ann.boundary || lines(/permission|context|boundary|权限|边界/i)
    };
    if (ann.copy) entry.copy = ann.copy;
    migrated[key] = entry;
  }
  const output = file + '.pm.json';
  if (fs.existsSync(output)) throw new Error(`迁移目标已存在: ${output}`);
  fs.writeFileSync(output, JSON.stringify(migrated, null, 2) + '\n');
  return output;
}

function main() {
  const args = process.argv.slice(2);
  if (!args[0] || args.slice(1).some(arg => !['--json', '--legacy', '--migrate'].includes(arg))) {
    throw new Error('用法: node scripts/validate-annotations.js <HTML/Markdown/JSON> [--json] [--legacy] [--migrate]');
  }
  if (args.includes('--legacy') && args.includes('--migrate')) throw new Error('--migrate 新输出必须接受 Product-only 校验，不能同时使用 --legacy');
  let file = args[0], content = fs.readFileSync(file, 'utf8');
  if (args.includes('--migrate')) { file = migrate(file, content); content = fs.readFileSync(file, 'utf8'); }
  const reviewDocs = validateReview(content);
  const annotations = file.endsWith('.json') ? JSON.parse(content) : parseAnnotations(content);
  let results = [];
  if (annotations) {
    if (typeof annotations !== 'object' || Array.isArray(annotations)) throw new Error('ANNOTATIONS 必须为组件对象');
    results = Object.entries(annotations).map(([key, ann]) => args.includes('--legacy') ? validateLegacy(key, ann) : validatePM(key, ann));
    if (!results.length) throw new Error('ANNOTATIONS 不得为空');
  } else if (content.includes('VIEW_DESCS') && args.includes('--legacy')) {
    const pattern = /\{\s*id:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'[\s\S]*?badge:\s*'[^']*'[\s\S]*?rows:\s*\[([\s\S]*?)\]\s*\}/g;
    results = [...content.matchAll(pattern)].map(m => {
      const missing = ['触发', '行为', '状态'].filter(label => !m[3].includes(`ROW('${label}'`));
      return { key: m[1], errors: missing.map(field => ({ field, msg: `缺失: ${field === '状态' ? 'state' : field}` })), warnings: [], pass: missing.length === 0 };
    });
    if (!results.length) throw new Error('无法解析旧 VIEW_DESCS 卡片');
  } else if (!reviewDocs.present) throw new Error('无法解析 PM 注释；旧 blocks/VIEW_DESCS 只支持显式 --legacy 兼容读取');
  const failed = results.filter(r => !r.pass).length;
  const report = { mode: reviewDocs.present ? 'review-docs' : args.includes('--legacy') ? 'legacy' : 'pm', total: results.length, passed: results.length - failed, failed, errors: results.reduce((n, r) => n + r.errors.length, 0) + reviewDocs.errors.length, warnings: results.reduce((n, r) => n + r.warnings.length, 0) + reviewDocs.warnings.length, valid: failed === 0 && reviewDocs.valid, results };
  if (reviewDocs.present) report.reviewDocs = reviewDocs;
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('PM 注释字段完整性验证' + (args.includes('--legacy') ? '（旧格式兼容读取）' : ''));
    for (const result of results) {
      console.log(`[${result.pass ? 'PASS' : 'FAIL'}] ${result.key} ${result.type || ''}`);
      for (const issue of [...result.errors, ...result.warnings]) console.log(`  ${issue.field}: ${issue.msg}`);
    }
    for (const issue of [...reviewDocs.errors, ...reviewDocs.warnings]) console.log(issue);
    console.log(`总计: ${report.total}  通过: ${report.passed}  失败: ${report.failed}  错误: ${report.errors}  警告: ${report.warnings}`);
  }
  if (!report.valid) process.exitCode = 1;
}

try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
