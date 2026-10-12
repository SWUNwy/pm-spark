#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const VALIDATOR = path.join(ROOT, 'scripts/validate-annotations.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-annotations-'));
let passed = 0;
function run(file, args = []) { return spawnSync(process.execPath, [VALIDATOR, file, '--json', ...args], { encoding: 'utf8' }); }
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
const ann = { type: 'T6', summary: '创建成员。', feature: '为管理员创建成员。', logic: '填写后提交，成功关闭；失败保留填写内容。', states: '可填写、字段错误、提交中、成功、失败可重试。', boundary: '管理员可操作；必填项为空禁止提交。' };
function fixture(data, name = 'case.json') { const file = path.join(tmp, name); fs.writeFileSync(file, JSON.stringify(data)); return file; }
function review(item) { return `<div data-proto-id="form"></div><script id="review-docs" type="application/json">${JSON.stringify({ scene: { heading: '创建', items: [item] } })}</script>`; }
function html(content) { const file = path.join(tmp, 'review.html'); fs.writeFileSync(file, content); return file; }
try {
  check('PM 六字段无等级和可选 copy 通过', () => {
    const result = run(fixture({ form: ann })); assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).warnings, 0);
  });
  for (const field of ['summary', 'feature', 'logic', 'states', 'boundary']) check(`缺失 ${field} 阻断`, () => {
    const copy = { ...ann }; delete copy[field]; assert.equal(run(fixture({ form: copy })).status, 1);
  });
  check('未知组件类型、空 copy、占位文本阻断', () => {
    for (const change of [{ type: 'T12' }, { copy: '' }, { boundary: '待补充边界' }]) assert.equal(run(fixture({ form: { ...ann, ...change } })).status, 1);
  });
  check('新输出拒绝旧等级及技术字段', () => {
    for (const change of [{ level: 'L2' }, { L3: '旧内容' }, { levelLabels: {} }, { api: '/api/create' }]) assert.equal(run(fixture({ form: { ...ann, ...change } })).status, 1);
  });
  const { summary, type, ...annotation } = ann;
  const item = { protoId: 'form', title: '成员', scopeMark: 'new', type, summary, annotation };
  check('review-docs 六字段完整性与嵌套旧字段阻断', () => {
    assert.equal(run(html(review(item))).status, 0);
    for (const bad of [{ ...item, annotation: { ...annotation, feature: '' } }, { ...item, annotation: { ...annotation, L2: '旧内容' } }, { ...item, annotation: { ...annotation, api: '/api' } }, { ...item, type: undefined }]) assert.equal(run(html(review(bad))).status, 1);
  });
  const leaks = {
    API_PATH: ['/api/coupons', 'POST /coupons', 'https://example.test/v1/coupons'],
    HTTP_STATUS: ['HTTP 403', '状态码：500', '200 OK'],
    TIMING: ['timing: 0.3s', '延迟 300ms', '防抖 300 毫秒', 'debounce'],
    CSS_PIXEL: ['宽度 320px', '间距 16 像素'],
    ARIA_ATTRIBUTE: ['aria-label="保存"', 'aria-expanded'],
    I18N_KEY: ['i18n key', 'coupon.create.success', "t('coupon.saved')"],
    SNAKE_CASE: ['coupon_id', 'error_message'],
    RETIRED_LEVEL: ['L1', 'L2', 'L3', '注释等级：高', 'level: 2']
  };
  for (const field of ['summary', 'feature', 'logic', 'states', 'boundary', 'copy']) {
    check(`合法 ${field} 字符串内技术泄漏硬阻断（JSON 与 review-docs）`, () => {
      for (const [code, values] of Object.entries(leaks)) for (const value of values) {
        const changed = { ...ann, [field]: `产品描述：${value}。` };
        const { summary, type, ...annotation } = changed;
        const changedItem = { protoId: 'form', title: '成员', scopeMark: 'new', type, summary, annotation };
        for (const file of [fixture({ form: changed }), html(review(changedItem))]) {
          const result = run(file);
          assert.equal(result.status, 1, `${field}: ${value}`);
          const report = JSON.parse(result.stdout);
          const errors = report.reviewDocs ? report.reviewDocs.errors.join('\n') : report.results.flatMap(r => r.errors.map(e => `${e.field}: ${e.msg}`)).join('\n');
          assert(errors.includes(code) && errors.includes(field), errors);
        }
      }
    });
  }
  check('产品数量、时间、限制和用户文案不误伤', () => {
    const result = run(fixture({ form: { ...ann, boundary: '每人限领 1 张，库存上限 100,000；有效期 365 天，名称限 20 字。', states: '提交中显示进度，成功后展示结果。', copy: '保存成功；500 张券已发放，3 秒后返回列表。' } }));
    assert.equal(result.status, 0, result.stdout);
  });
  check('迁移后仍硬阻断技术字符串，legacy 读取保持可用', () => {
    const file = path.join(tmp, 'legacy-leak.html');
    fs.writeFileSync(file, '<script>const ANNOTATIONS = ' + JSON.stringify({ form: { ...ann, logic: 'POST /api/members', blocks: [{ title: '触发条件' }, { title: '字段定义' }, { title: '行为描述' }, { title: '关闭条件' }] } }) + ';</script>');
    assert.equal(run(file, ['--legacy']).status, 0);
    assert.equal(run(file, ['--legacy', '--migrate']).status, 1);
    assert.equal(fs.existsSync(file + '.pm.json'), false);
    const result = run(file, ['--migrate']);
    assert.equal(result.status, 1);
    assert(result.stdout.includes('API_PATH'));
  });
  check('demo 当前交付通过', () => assert.equal(run(path.join(ROOT, 'demo/demo.html')).status, 0));
  check('旧 blocks 只允许显式兼容读取', () => {
    for (const name of ['chinese-titles.html', 'no-api.html']) {
      const file = path.join(ROOT, 'tests/annotations', name); assert.equal(run(file).status, 1); assert.equal(run(file, ['--legacy']).status, 0);
    }
  });
  check('VIEW_DESCS 兼容正负例', () => {
    assert.equal(run(path.join(ROOT, 'tests/annotations/view-descs-good.html'), ['--legacy']).status, 0);
    assert.equal(run(path.join(ROOT, 'tests/annotations/view-descs-bad.html'), ['--legacy']).status, 1);
  });
  check('旧注释迁移保留原文件且新输出无等级', () => {
    const file = path.join(tmp, 'legacy.html');
    const source = '<!-- T11 L3 --><script>const ANNOTATIONS = ' + JSON.stringify({ info: { type: 'T11', level: 'L3', desc: '说明页面用途。', blocks: [{ title: '触发条件', lines: ['点击说明按钮展开。'] }], state: { visible: '显示说明。' } } }) + ';</script>';
    fs.writeFileSync(file, source); const result = run(file, ['--migrate']); assert.equal(result.status, 1);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
    const output = fs.readFileSync(file + '.pm.json', 'utf8'); assert(!/level|L[123]/.test(output)); assert.equal(JSON.parse(output).info.boundary, '');
    assert.equal(run(file, ['--migrate']).status, 1);
  });
  check('shell 目录计数和失败退出码', () => {
    const dir = path.join(tmp, 'directory with spaces'); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'good.json'), JSON.stringify({ form: ann })); fs.writeFileSync(path.join(dir, 'bad.json'), JSON.stringify({ form: { type: 'T6' } }));
    const result = spawnSync('bash', [path.join(ROOT, 'scripts/check-annotations.sh'), dir], { encoding: 'utf8' }); assert.equal(result.status, 1); assert(result.stdout.includes('通过: 1  失败: 1'));
  });
  check('注释等级参数不再被接受', () => assert.equal(run(fixture({ form: ann }), ['--level-labels=基础/完整']).status, 1));
  console.log(`Results: ${passed} passed, 0 failed`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
