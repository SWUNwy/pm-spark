"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "references", "annotation-output-templates.md"), "utf8");
const DEMO = fs.readFileSync(path.join(ROOT, "demo", "demo.html"), "utf8");
const SYSTEM = fs.readFileSync(path.join(ROOT, "references", "html-annotation-system.md"), "utf8");

function assertIncludes(source, value, message) {
  assert(source.includes(value), `${message}: missing ${value}`);
}

function authoritativeBlock(source, marker) {
  const start = source.indexOf(marker);
  assert(start !== -1, `authoritative marker missing: ${marker}`);
  const ends = ["/* =====", "</style>", "})();"]
    .map(end => source.indexOf(end, start + marker.length))
    .filter(index => index !== -1);
  assert(ends.length > 0, `authoritative block end missing: ${marker}`);
  return source.slice(start, Math.min(...ends));
}

const CSS_MARK = "/* ===== 评审模式布局（权威，生成时原样嵌入） ===== */";
const JS_MARK = "/* ===== 评审模式权威交互脚本 v4.0（无SVG·徽标锚定·滚动联动；唯一实现；生成 HTML 原样嵌入，禁止手改） ===== */";

assert.strictEqual(
  authoritativeBlock(DEMO, CSS_MARK),
  authoritativeBlock(TEMPLATE, CSS_MARK),
  "demo CSS must remain synchronized with the authoritative template"
);
assert.strictEqual(
  authoritativeBlock(DEMO, JS_MARK),
  authoritativeBlock(TEMPLATE, JS_MARK),
  "demo JS must remain synchronized with the authoritative template"
);

// TC-07–09: v4.0 徽标层 badge positioning contract (replaces SVG sizing contract).
// .anno-badge must declare position:absolute so it anchors to the proto-element mount point.
assertIncludes(TEMPLATE, ".anno-badge{", "badge CSS rule must be present");
assertIncludes(TEMPLATE, "position:absolute", "badge must declare position:absolute for correct anchoring");
assertIncludes(TEMPLATE, "z-index:10", "badge must be layered above content");

// TC-10–12: scroll sync and highlight pairing.
assertIncludes(TEMPLATE, "scrollIntoView({behavior:'smooth'", "scroll-sync must use smooth scrolling");
assertIncludes(TEMPLATE, "active-highlight", "hover pairing must apply active-highlight class");
assertIncludes(TEMPLATE, "classList.toggle('active-highlight'", "highlight toggle must use classList.toggle");

// TC-13–16: badge injection, scene switching, panel resize.
assertIncludes(TEMPLATE, "function injectBadges(", "badge injection must be a named function");
assertIncludes(TEMPLATE, "function renderDocs(", "scene rendering must be a named function");
assertIncludes(TEMPLATE, "window.setScene = function(", "scene switch must be exposed as window.setScene");
assertIncludes(TEMPLATE, "document.getElementById('resizeHandle')", "panel resize handle must be wired");
assertIncludes(TEMPLATE, "@media (max-width:760px)", "responsive CSS fallback must remain declared");

// TC-30–32: dynamic lookup — anchors queried per render, not cached.
assertIncludes(TEMPLATE, "document.querySelector('.product-panel .proto-element[data-proto-id=\"'", "proto-element anchors must be queried on every badge injection");
assertIncludes(TEMPLATE, "document.querySelectorAll('.product-panel .proto-element[data-proto-id]')", "hover binding must query proto-elements on every render");
assertIncludes(TEMPLATE, "docBody.querySelectorAll('.proto-desc[data-proto-id]')", "annotation hover binding must query desc cards on every render");

// Architecture documentation contracts.
assertIncludes(SYSTEM, "Product layer", "architecture documentation must describe the product layer");
assertIncludes(SYSTEM, "Annotation layer", "architecture documentation must describe the annotation layer");

console.log("relationship layer: all tests passed");
