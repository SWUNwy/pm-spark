"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA = "token-baseline/1.0";
const ESTIMATOR = "deterministic-char-proxy/1";

class BaselineError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BaselineError";
    this.code = code;
  }
}

function proxyTokens(value) {
  return Math.ceil(Buffer.byteLength(String(value), "utf8") / 4);
}

function loadManifest(filePath) {
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!manifest || manifest.manifest_version !== "token-baseline-manifest/1.0" || !Array.isArray(manifest.samples)) {
    throw new BaselineError("INVALID_MANIFEST", "Invalid token baseline manifest");
  }
  return manifest;
}

function runBaseline(manifest) {
  const samples = manifest.samples.map(sample => {
    if (!sample.id || !["product", "implementation", "acceptance"].includes(sample.delivery_layer) ||
        !["small", "medium", "large"].includes(sample.complexity) ||
        !Number.isInteger(sample.round) || sample.round < 1) {
      throw new BaselineError("INVALID_SAMPLE", `Invalid sample: ${sample.id || "unknown"}`);
    }
    const input = proxyTokens(sample.input);
    const output = proxyTokens(sample.output);
    return {
      id: sample.id,
      delivery_layer: sample.delivery_layer,
      complexity: sample.complexity,
      round: sample.round,
      input_proxy_tokens: input,
      output_proxy_tokens: output,
      total_proxy_tokens: input + output,
      actual_tokens: null
    };
  });
  return {
    schema_version: SCHEMA,
    estimator: ESTIMATOR,
    template_version: manifest.template_version,
    status: "not_measured",
    samples,
    quality: {
      status: "not_measured",
      reference: null,
      reason: "No real tokenizer, billing reference, or manually verified quality sample was supplied."
    }
  };
}

function main(argv) {
  const manifestPath = argv[0] || path.join(ROOT, "tests", "metrics", "token-baseline", "manifest.json");
  try {
    const result = runBaseline(loadManifest(manifestPath));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { BaselineError, loadManifest, proxyTokens, runBaseline };
