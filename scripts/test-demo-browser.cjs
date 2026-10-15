#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const names = ['badge-position', 'bidirectional-highlight', 'scroll-linkage', 'scene-switch', 'mobile-fallback'];
const ARTIFACT_DIR = path.join(ROOT, 'tests/annotations/artifacts');
const report = { status: 'unverified', runner: 'playwright', scenarios: names.map(id => ({ id, status: 'unverified' })), evidence: { artifact_paths: [], observations: [] } };
function loadPlaywright() {
  const candidates = [process.env.PM_SPARK_PLAYWRIGHT, 'playwright', '@playwright/test'].filter(Boolean);
  const cache = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(cache)) for (const dir of fs.readdirSync(cache)) candidates.push(path.join(cache, dir, 'node_modules', 'playwright'));
  for (const candidate of candidates) { try { const mod = require(candidate); if (mod.chromium) return mod; } catch {} }
  throw new Error('Playwright unavailable; install it or set PM_SPARK_PLAYWRIGHT to an existing module path');
}
function findBrowserExecutable() {
  const candidates = [
    process.env.PM_SPARK_CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}
async function main() {
  let browser, server;
  let started = false;
  try {
    const { chromium } = loadPlaywright();
    const executablePath = findBrowserExecutable();
    if (!executablePath) throw new Error('No usable Chrome/Chromium executable found; set PM_SPARK_CHROME or install a matching browser with PLAYWRIGHT_SKIP_BROWSER_GC=1');
    browser = await chromium.launch({ headless: true, executablePath });
    report.browser = executablePath;
    report.version = browser.version();
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(ROOT, 'demo/demo.html'))); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 1440, height: 520 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/demo.html`);
    started = true;
    const proto = id => page.locator(`.product-panel .proto-element[data-proto-id="${id}"]`);
    const desc = id => page.locator(`.proto-desc[data-proto-id="${id}"]`);
    async function check(id, fn) {
      const result = report.scenarios.find(s => s.id === id);
      try {
        await fn();
        const observation = await page.evaluate(() => ({
          active_scene: document.querySelector('.scene-tab.active')?.dataset.scene,
          badges: Array.from(document.querySelectorAll('.anno-badge'), el => ({ proto_id: el.dataset.protoId, text: el.textContent, class: el.className, bounds: el.getBoundingClientRect().toJSON() })),
          highlighted: Array.from(document.querySelectorAll('.active-highlight'), el => el.dataset.protoId),
          canvas_scroll_top: document.querySelector('#canvas').scrollTop,
          doc_scroll_top: document.querySelector('.doc-panel').scrollTop,
          layout_direction: getComputedStyle(document.querySelector('.layout')).flexDirection,
          viewport: { width: innerWidth, height: innerHeight }
        }));
        const screenshot = `tests/annotations/artifacts/${id}.png`;
        await page.screenshot({ path: path.join(ROOT, screenshot) });
        report.evidence.artifact_paths.push(screenshot);
        report.evidence.observations.push({ id, dom: observation || 'assertions passed' });
        result.status = 'passed'; console.log(`PASS ${id}`);
      }
      catch (error) { result.status = 'failed'; result.reason = error.message; console.error(`FAIL ${id}: ${error.message}`); }
    }
    await check('badge-position', async () => {
      assert.equal(await page.locator('.anno-badge').count(), 3);
      for (let n = 1; n <= 3; n++) {
        const p = proto(`coupon-create-${n}`);
        const badge = p.locator('.anno-badge');
        assert.equal(await badge.textContent(), String(n));
        const { a, b } = await p.evaluate(el => ({ a: el.getBoundingClientRect().toJSON(), b: el.querySelector('.anno-badge').getBoundingClientRect().toJSON() }));
        assert(Math.abs(b.x + b.width - (a.x + a.width + 7)) < 2);
        assert(Math.abs(b.y - (a.y - 7)) < 2, JSON.stringify({ proto: a, badge: b }));
      }
    });
    await check('bidirectional-highlight', async () => {
      await proto('coupon-create-1').hover();
      await page.waitForFunction(() => document.querySelector('.proto-desc').classList.contains('active-highlight'));
      assert((await desc('coupon-create-1').getAttribute('class')).includes('active-highlight'));
      await page.mouse.move(0, 0);
      await desc('coupon-create-2').hover();
      assert((await proto('coupon-create-2').getAttribute('class')).includes('active-highlight'));
      assert((await proto('coupon-create-2').locator('.anno-badge').getAttribute('class')).includes('active'));
      await page.mouse.move(0, 0);
      assert.equal(await page.locator('.active-highlight').count(), 0);
    });
    await check('scroll-linkage', async () => {
      await page.locator('.doc-panel').evaluate(el => { el.scrollTop = 0; });
      await proto('coupon-create-3').locator('.anno-badge').click();
      await page.waitForFunction(() => document.querySelector('.doc-panel').scrollTop > 100);
      await page.locator('#canvas').evaluate(el => { el.scrollTop = 0; });
      await desc('coupon-create-3').click();
      await page.waitForFunction(() => document.querySelector('#canvas').scrollTop > 100);
    });
    await check('scene-switch', async () => {
      await page.locator('[data-scene="coupon-verify"]').click();
      assert.equal(await page.locator('.scene-tab.active').getAttribute('data-scene'), 'coupon-verify');
      assert.equal(await page.locator('.anno-badge').count(), 3);
      assert.equal(await page.locator('.anno-badge[data-proto-id^="coupon-create"]').count(), 0);
      assert.equal(await desc('coupon-verify-1').count(), 1);
      await page.waitForFunction(() => document.querySelector('#canvas').scrollTop > 100);
      await page.locator('[data-scene="coupon-create"]').click();
      assert.equal(await desc('coupon-create-1').count(), 1);
      assert.equal(await page.locator('.anno-badge[data-proto-id^="coupon-verify"]').count(), 0);
    });
    await check('mobile-fallback', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const layout = await page.locator('.layout').evaluate(el => getComputedStyle(el).flexDirection);
      assert.equal(layout, 'column');
      assert.equal(await page.locator('#resizeHandle').isVisible(), false);
      const canvas = await page.locator('#canvas').boundingBox(), docs = await page.locator('.doc-panel').boundingBox();
      assert.equal(Math.round(docs.width), 390);
      assert(docs.y >= canvas.y + canvas.height - 1);
      await page.locator('[data-scene="coupon-verify"]').click();
      assert.equal(await desc('coupon-verify-1').count(), 1);
      assert.equal(await page.locator('.anno-badge').count(), 3);
    });
    report.page_errors = errors;
    report.status = report.scenarios.every(s => s.status === 'passed') && !errors.length ? 'passed' : 'failed';
  } catch (error) {
    report.status = started ? 'failed' : 'blocked';
    report.reason = error.message.split(os.homedir()).join('<home>');
    process.exitCode = started ? 1 : 2;
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (report.status === 'failed') process.exitCode = 1;
    report.recorded_at = new Date().toISOString();
    // 归一化浮点坐标（亚像素漂移导致重跑脏工作树）：仅取整有限数值，坐标取整后跨次运行稳定
    const roundFloats = value => {
      if (Array.isArray(value)) return value.map(roundFloats);
      if (value && typeof value === 'object') { for (const k of Object.keys(value)) value[k] = roundFloats(value[k]); return value; }
      if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
      return value;
    };
    roundFloats(report);
    fs.writeFileSync(path.join(ROOT, 'tests/annotations/browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}
main();
