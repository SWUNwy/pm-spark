#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const GOOD = path.join(ROOT, 'tests/prd/prd-001-sample.md');
const PRODUCT = path.join(ROOT, 'tests/prd/prd-003-product.md');
const DEFECTIVE = path.join(ROOT, 'tests/prd/prd-002-defective.md');
let passed = 0;
function validate(file, profile) {
  const args = [path.join(ROOT, 'scripts/validate-prd.js'), file, '--json'];
  if (profile) args.push('--profile', profile);
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  return { status: run.status, report: JSON.parse(run.stdout) };
}
function check(name, fn) { fn(); passed++; console.log(`${name}: PASS`); }
check('4B 静态流程契约遵循 v6.1 按需澄清', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
  const start = skill.indexOf('### 4B PRD 撰写');
  const end = skill.indexOf('### 4C Spec 三文档', start);
  assert(start >= 0 && end > start);
  const prd = skill.slice(start, end);
  for (const rule of ['范围已明确则直接使用，不重复询问', '会改变结论、范围、风险或交付类型时才澄清', '不自动切换', '每轮最多问一个', '非关键缺口标为假设或待验证', '信息够用即交付']) assert(prd.includes(rule), `4B 缺失规则：${rule}`);
  assert(!/逐章引导 PM 填写缺失内容|要求 PM (?:逐章补齐|补齐所有章节)/.test(prd));
});
check('无接口产品 PRD 默认通过', () => {
  const { status, report } = validate(PRODUCT);
  assert.strictEqual(status, 0);
  assert.strictEqual(report.profile, 'product-prd');
  assert.strictEqual(report.grade, 'A');
  assert(!report.results.some(rule => ['RC-31', 'RC-43'].includes(rule.id)));
});
for (const profile of ['engineering-spec', 'legacy']) {
  check(`${profile} 显式兼容完整研发 PRD`, () => {
    const { status, report } = validate(GOOD, profile);
    assert.strictEqual(status, 0);
    assert.strictEqual(report.grade, 'A');
    assert.strictEqual(report.profile, profile);
  });
  check(`${profile} 缺少接口仍阻断`, () => {
    const { status, report } = validate(PRODUCT, profile);
    assert.strictEqual(status, 1);
    assert(report.results.some(rule => rule.id === 'RC-31' && !rule.pass));
  });
}
check('旧研发 PRD 不自动提升 profile', () => {
  const { status, report } = validate(GOOD);
  assert.strictEqual(status, 1);
  assert(report.results.some(rule => rule.id === 'PRD-BOUNDARY' && !rule.pass));
});
check('缺陷 PRD 命中状态与验收缺失', () => {
  const { status, report } = validate(DEFECTIVE);
  assert.strictEqual(status, 1);
  for (const id of ['RC-22', 'RC-40']) assert(report.results.some(rule => rule.id === id && !rule.pass));
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-prd-'));
try {
  for (const fragment of ['接口：GET /api/invitations', '代码路径：`src/invitation.ts`', '错误码：403', '验证：npm test', '验证：node scripts/test.cjs']) {
    check(`产品混入 ${fragment} 被拒绝并路由`, () => {
      const file = path.join(dir, 'mixed.md');
      fs.writeFileSync(file, fs.readFileSync(PRODUCT, 'utf8') + '\n' + fragment);
      const { status, report } = validate(file);
      assert.strictEqual(status, 1);
      const boundary = report.results.find(rule => rule.id === 'PRD-BOUNDARY');
      assert(!boundary.pass && boundary.matches.length > 0);
      assert(boundary.name.includes('engineering-spec'));
    });
  }
  check('HTML 内嵌产品 PRD 通过', () => {
    const file = path.join(dir, 'product.html');
    const text = fs.readFileSync(PRODUCT, 'utf8').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    fs.writeFileSync(file, `<html><body>${text}\n数据字段<table><tbody><tr><td>字段 类型 必填 说明</td></tr><tr><td>达人姓名 文本 是 邀约对象</td></tr></tbody></table></body></html>`);
    const { status, report } = validate(file);
    assert.strictEqual(status, 0);
    assert.strictEqual(report.profile, 'product-prd');
  });
  check('无可观察结果的验收阻断', () => {
    const file = path.join(dir, 'unobservable.md');
    fs.writeFileSync(file, fs.readFileSync(PRODUCT, 'utf8').replace(/^- AC-\d+.*$/gm, '- AC-01 功能正确'));
    const { status, report } = validate(file);
    assert.strictEqual(status, 1);
    assert(!report.results.find(rule => rule.id === 'PRD-AC').pass);
  });
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
console.log(`Results: ${passed} passed, 0 failed`);
