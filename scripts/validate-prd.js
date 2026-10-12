#!/usr/bin/env node
/**
 * validate-prd.js
 * 产品 PRD 与显式工程规格完整性验证
 *
 * 默认 profile: product-prd；--profile engineering-spec / legacy 为显式工程或旧文档校验。
 * 用法:
 *   node scripts/validate-prd.js <path/to/prd.md>           # 验证 Markdown PRD
 *   node scripts/validate-prd.js <path/to/prd.html>         # 验证 HTML 内嵌 PRD
 *   node scripts/validate-prd.js <path> --json              # 输出 JSON 格式结果
 *   node scripts/validate-prd.js <path> --list              # 仅列出缺失项
 *
 * 检查规则对应 references/review-readiness-checklist.md（RC-01 ~ RC-52）。
 * 依赖: 无 (纯 Node.js)
 */

const fs = require('fs');
const { findEngineeringContent } = require('./delivery-contract.cjs');
const PROFILES = ['product-prd', 'engineering-spec', 'legacy'];
const ENGINEERING_RULES = new Set(['RC-31', 'RC-43']);

// ============================================================
// RC 规则定义
// ============================================================

const RC_RULES = [
  // A. 文档治理
  { id: 'RC-01', group: 'A', severity: 'error',   name: '文档信息完整（名称/版本/负责人/关联需求）', match: [/版本\s*v?[\d.]+/, /负责人/, /关联需求|需求号|Jira|issue/i, /页面\/功能名称|产品名|功能名称/] },
  { id: 'RC-02', group: 'A', severity: 'warning', name: '修订记录表', match: [/修订记录/] },
  { id: 'RC-03', group: 'A', severity: 'info',    name: '文档编号/密级/归属部门（如适用）', match: [/文档编号/, /密级/, /归属/] },

  // B. 需求背景与价值
  { id: 'RC-10', group: 'B', severity: 'error',   name: '需求背景（现状痛点）', match: [/背景/], minLen: 40 },
  { id: 'RC-11', group: 'B', severity: 'error',   name: '需求目标（可衡量）', match: [/目标/], minLen: 15 },
  { id: 'RC-12', group: 'B', severity: 'warning', name: '预期收益（量化）', match: [/预期收益|收益|价值/, /\d+(%|％|万|亿|倍|个|天|小时|元)?/] },
  { id: 'RC-13', group: 'B', severity: 'warning', name: '竞品/现状对比', match: [/竞品|现状对比|对比/] },
  { id: 'RC-14', group: 'B', severity: 'info',    name: '成本测算（如适用）', match: [/成本|测算/] },

  // C. 功能与流程
  { id: 'RC-20', group: 'C', severity: 'error',   name: '功能简述/功能分布', match: [/功能简述|功能分布|功能清单|功能说明|方案/] },
  { id: 'RC-21', group: 'C', severity: 'error',   name: '页面结构（树形图）', match: [/页面结构/, /├──|└──|树|结构/] },
  { id: 'RC-22', group: 'C', severity: 'error',   name: '状态流转（状态机）', match: [/状态流转|状态机|状态说明|状态迁移/, /→|->|状态/] },
  { id: 'RC-23', group: 'C', severity: 'error',   name: '业务流程（Mermaid 流程图）', match: [/```mermaid|flowchart\s+(TD|LR|TB)|graph\s+[A-Z]+/i] },
  { id: 'RC-24', group: 'C', severity: 'error',   name: '逐功能交互详述（触发/行为/状态/样式）', match: [/交互详述|交互说明|功能说明|触发|行为/] },
  { id: 'RC-25', group: 'C', severity: 'error',   name: '权限规则', match: [/权限/] },
  { id: 'RC-26', group: 'C', severity: 'warning', name: '复用声明（REUSE）', match: [/复用|REUSE/i] },

  // D. 数据与接口
  { id: 'RC-30', group: 'D', severity: 'error',   name: '数据字段表（字段/类型/必填/说明 + 至少一行数据）', match: [/数据字段|字段表|字段定义/, /类型/, /必填/], verify: (ctx) => ctx.tableRows >= 2 },
  { id: 'RC-31', group: 'D', severity: 'error',   name: '接口需求（method + path + 返回）', match: [/接口/, /(GET|POST|PUT|DELETE|PATCH)\s+\/?[\w\-$]|endpoint|api\//i] },
  { id: 'RC-32', group: 'D', severity: 'info',    name: '埋点需求（如适用）', match: [/埋点/] },
  { id: 'RC-33', group: 'D', severity: 'info',    name: '数据报表需求（如适用）', match: [/报表/] },

  // E. 交付与验收
  { id: 'RC-40', group: 'E', severity: 'error',   name: '验收标准（可执行 AC）', match: [/验收标准|验收/, /AC-\d+/i] },
  { id: 'RC-41', group: 'E', severity: 'info',    name: '上线需求（如适用）', match: [/上线/] },
  { id: 'RC-42', group: 'E', severity: 'info',    name: '下线需求（如适用）', match: [/下线/] },
  { id: 'RC-43', group: 'E', severity: 'warning', name: '开发注意事项', match: [/开发注意|注意事项/] },

  // F. 运营与风险
  { id: 'RC-50', group: 'F', severity: 'info',    name: '运营计划（如适用）', match: [/运营/] },
  { id: 'RC-51', group: 'F', severity: 'warning', name: '风险分析', match: [/风险/] },
  { id: 'RC-52', group: 'F', severity: 'info',    name: '相关文档索引', match: [/相关文档|参考文档|关联文档/] }
];

// ============================================================
// 文本归一化（HTML → 纯文本，保留行号）
// ============================================================

function countMdTableRows(lines) {
  // 定位「数据字段」章节（记录标题层级），统计该章节内 Markdown 表格数据行；
  // 仅在遇到同层或更浅的标题（如 ## 7. 接口需求）时结束，子标题（### 6.1）不中断
  let start = -1;
  let sectionLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,4})\s*.*(数据字段|字段表|字段定义)/);
    if (m) { start = i + 1; sectionLevel = m[1].length; break; }
  }
  if (start === -1) return 0;
  let count = 0;
  for (let i = start; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,4})\s+/);
    if (h && h[1].length <= sectionLevel && i > start) break;
    const l = lines[i].trim();
    if (/^\|/.test(l) && (l.match(/\|/g) || []).length >= 2 && !/^\|[\s:\-|]+\|$/.test(l)) count++;
  }
  return count;
}

function countHtmlFieldRows(raw) {
  const m = raw.match(/数据字段[^<]{0,80}<table[\s\S]*?<tbody[\s\S]*?<\/tbody>/i);
  if (!m) return 0;
  return (m[0].match(/<tr[^>]*>/gi) || []).length;
}

function normalizeText(raw) {
  const isHtml = /<html|<!doctype|<body/i.test(raw);
  if (!isHtml) {
    const lines = raw.split(/\r?\n/);
    return { text: raw, lines, tableRows: countMdTableRows(lines) };
  }

  const htmlTableRows = countHtmlFieldRows(raw);
  let text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
  return { text, lines: text.split(/\r?\n/), tableRows: htmlTableRows };
}

// ============================================================
// RC 检查
// ============================================================

function checkRule(rule, lines, ctx) {
  const text = lines.join('\n');
  const matches = [];

  for (const pattern of rule.match) {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        matches.push({ line: i + 1, pattern: pattern.source });
        found = true;
        break;
      }
    }
    if (!found) return { pass: false, matches: [], text };
  }

  if (rule.minLen) {
    const sectionStart = matches[0].line - 1;
    const slice = lines.slice(sectionStart, sectionStart + 30).join('\n');
    if (slice.length < rule.minLen) {
      return { pass: false, matches, text };
    }
  }

  if (rule.verify && !rule.verify(ctx)) {
    return { pass: false, matches, text };
  }

  return { pass: true, matches, text };
}

// ============================================================
// 报告生成
// ============================================================

const GROUP_NAMES = {
  A: 'A 文档治理',
  B: 'B 背景价值',
  C: 'C 功能流程',
  D: 'D 数据接口',
  E: 'E 交付验收',
  F: 'F 运营风险'
};

function generateReport(results, fileName) {
  const errors = results.filter(r => r.severity === 'error' && !r.pass);
  const warnings = results.filter(r => r.severity === 'warning' && !r.pass);
  const totalByGroup = {};
  const passByGroup = {};

  for (const r of results) {
    totalByGroup[r.group] = (totalByGroup[r.group] || 0) + 1;
    if (!(r.group in passByGroup)) passByGroup[r.group] = 0;
    if (r.pass) passByGroup[r.group] = (passByGroup[r.group] || 0) + 1;
  }

  const groups = Object.keys(totalByGroup).sort();
  const verdict = errors.length > 0 ? 'Not Ready（不通过）' : warnings.length > 2 ? 'Conditional（有条件通过）' : 'Ready（通过）';
  const grade = errors.length > 0 ? 'C' : warnings.length > 2 ? 'B' : 'A';

  let output = '\n';
  output += 'spec-analyze 评审就绪 PRD 验证 v3.6\n';
  output += '==================================\n';
  output += `文件: ${fileName}\n`;
  output += `判定: ${verdict}（评级 ${grade}）\n\n`;

  output += '| 维度 | 通过率 | 阻断项 | 建议项 |\n';
  output += '|------|:------:|:------:|:------:|\n';
  for (const g of groups) {
    const gr = results.filter(r => r.group === g);
    const e = gr.filter(r => r.severity === 'error' && !r.pass).length;
    const w = gr.filter(r => r.severity === 'warning' && !r.pass).length;
    const pct = Math.round((passByGroup[g] / totalByGroup[g]) * 100);
    output += `| ${GROUP_NAMES[g]} | ${pct}% | ${e} | ${w} |\n`;
  }

  const failed = results.filter(r => !r.pass);
  if (failed.length > 0) {
    output += '\n## 缺失项\n\n';
    for (const r of failed) {
      const level = r.severity === 'error' ? '阻断' : r.severity === 'warning' ? '建议' : '提示';
      const loc = r.matches.length ? `（最近匹配行: ${r.matches.map(m => m.line).join(', ')}）` : '';
      output += `- [${level}] ${r.id} ${r.name}${loc}\n`;
    }
  } else {
    output += '\n全部 RC 检查通过。\n';
  }

  return {
    text: output,
    json: {
      file: fileName,
      verdict,
      grade,
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: failed.length,
      errors: errors.length,
      warnings: warnings.length,
      groups: groups.map(g => ({
        group: g,
        name: GROUP_NAMES[g],
        total: totalByGroup[g],
        passed: passByGroup[g],
        errors: results.filter(r => r.group === g && r.severity === 'error' && !r.pass).length,
        warnings: results.filter(r => r.group === g && r.severity === 'warning' && !r.pass).length
      })),
      results
    }
  };
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法: node scripts/validate-prd.js <path> [--json] [--list]');
    process.exit(1);
  }

  const targetPath = args[0];
  const isJson = args.includes('--json');
  const isList = args.includes('--list');

  if (!fs.existsSync(targetPath)) {
    console.error(`文件不存在: ${targetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(targetPath, 'utf-8');
  const normalized = normalizeText(raw);
  const { lines } = normalized;
  const profileArg = args.find(arg => arg.startsWith('--profile='));
  const profileIndex = args.indexOf('--profile');
  const profile = profileArg ? profileArg.slice('--profile='.length) : profileIndex >= 0 ? args[profileIndex + 1] : 'product-prd';
  if (!PROFILES.includes(profile)) {
    console.error(`未知 profile: ${profile}；支持 ${PROFILES.join(', ')}`);
    process.exit(1);
  }
  const rules = profile === 'product-prd' ? RC_RULES.filter(rule => !ENGINEERING_RULES.has(rule.id)) : RC_RULES;
  const results = rules.map(rule => {
    const { pass, matches } = checkRule(rule, lines, normalized);
    return { id: rule.id, group: rule.group, severity: rule.severity, name: rule.name, pass, matches };
  });
  if (profile === 'product-prd') {
    for (const rule of [
      { id: 'PRD-USERS', group: 'B', severity: 'error', name: '用户与场景', match: [/用户|使用者|角色/, /场景/] },
      { id: 'PRD-SCOPE', group: 'C', severity: 'error', name: '范围与非目标', match: [/范围/, /非目标|不包含|不做/] }
    ]) {
      const { pass, matches } = checkRule(rule, lines, normalized);
      results.push({ ...rule, match: undefined, pass, matches });
    }
    const findings = findEngineeringContent(normalized.text);
    results.push({ id: 'PRD-BOUNDARY', group: 'D', severity: 'error',
      name: '产品 PRD 不得混入接口、错误码、代码路径或验证命令；请拆分并显式选择 engineering-spec',
      pass: findings.length === 0, matches: findings });
    const criteria = lines.filter(line => /AC-\d+/i.test(line));
    results.push({ id: 'PRD-AC', group: 'E', severity: 'error',
      name: '验收标准须包含用户操作或场景与可观察预期结果',
      pass: criteria.length > 0 && criteria.every(line => /→|->|预期|显示|看到|可见|提示|保持|不能|无法|可以|可操作|可选择|不执行|跳转|出现/.test(line)), matches: [] });
  }

  const report = generateReport(results, targetPath);
  report.json.profile = profile;
  report.text = `Profile: ${profile}\n${report.text}`;

  if (isList) {
    for (const r of results.filter(r => !r.pass)) {
      console.log(`[${r.severity === 'error' ? '阻断' : r.severity === 'warning' ? '建议' : '提示'}] ${r.id} ${r.name}`);
    }
  } else if (isJson) {
    console.log(JSON.stringify(report.json, null, 2));
  } else {
    console.log(report.text);
  }

  if (report.json.errors > 0) {
    process.exit(1);
  }
}

main();
