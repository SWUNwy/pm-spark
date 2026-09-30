"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { loadManifest, runBaseline, proxyTokens } = require("./token-baseline.cjs");

const manifestPath = path.join(__dirname, "..", "tests", "metrics", "token-baseline", "manifest.json");
const manifest = loadManifest(manifestPath);
const first = runBaseline(manifest);
const second = runBaseline(manifest);

assert.deepStrictEqual(first, second);
assert.strictEqual(first.schema_version, "token-baseline/1.0");
assert.strictEqual(first.estimator, "deterministic-char-proxy/1");
assert.strictEqual(first.status, "not_measured");
assert.strictEqual(first.quality.status, "not_measured");
assert(first.samples.length >= 3);
for (const sample of first.samples) {
  assert.strictEqual(sample.actual_tokens, null);
  assert.strictEqual(sample.total_proxy_tokens, sample.input_proxy_tokens + sample.output_proxy_tokens);
  assert(sample.total_proxy_tokens > 0);
}
assert.strictEqual(proxyTokens("abcd"), 1);
assert.strictEqual(proxyTokens("abcde"), 2);

const invalid = JSON.parse(JSON.stringify(manifest));
invalid.samples[0].delivery_layer = "private";
assert.throws(() => runBaseline(invalid), /Invalid sample/);

console.log("token baseline: all tests passed");
