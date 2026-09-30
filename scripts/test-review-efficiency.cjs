"use strict";

const assert = require("assert");
const path = require("path");
const {
  ExperimentError,
  loadJson,
  validateProtocol,
  validateObservation,
  summarizeExperiment
} = require("./review-efficiency.cjs");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(ROOT, "tests", "experiments", "review-efficiency");
const protocol = loadJson(path.join(ROOT, "references", "review-efficiency-protocol.json"));
const valid = loadJson(path.join(FIXTURES, "valid-observations.json")).observations;

assert.strictEqual(validateProtocol(protocol).ok, true);

const incomplete = { ...protocol, metrics: [] };
assert(validateProtocol(incomplete).errors.some(error => error.code === "INCOMPLETE_EXPERIMENT_PROTOCOL"));

const uncontrolled = { ...protocol, order_policy: "fixed" };
assert(validateProtocol(uncontrolled).errors.some(error => error.code === "ORDER_CONTROL_REQUIRED"));

assert.strictEqual(validateObservation(valid[0], protocol).ok, true);

const invalidMetric = JSON.parse(JSON.stringify(valid[0]));
invalidMetric.metrics.click_count = -1;
assert(validateObservation(invalidMetric, protocol).errors.some(error => error.code === "INVALID_OBSERVATION_METRIC"));

const invalidQuality = JSON.parse(JSON.stringify(valid[0]));
invalidQuality.quality.omission_count = -1;
assert(validateObservation(invalidQuality, protocol).errors.some(error => error.code === "INVALID_OBSERVATION_QUALITY"));

const unknownField = loadJson(path.join(FIXTURES, "invalid-observations.json")).observations[0];
assert(validateObservation(unknownField, protocol).errors.some(error => error.code === "INVALID_OBSERVATION" && error.field === "extra"));

const pending = summarizeExperiment(protocol, []);
assert.strictEqual(pending.status, "pending");
assert.strictEqual(pending.efficiency_verdict, null);
assert.strictEqual(pending.evidence_status, "protocol_only");

const lowSample = summarizeExperiment(protocol, loadJson(path.join(FIXTURES, "low-sample.json")).observations);
assert.strictEqual(lowSample.status, "insufficient_sample");
assert.strictEqual(lowSample.complete_participants, 1);
assert.strictEqual(lowSample.efficiency_verdict, null);

const measured = summarizeExperiment(protocol, valid);
assert.strictEqual(measured.status, "measured");
assert.strictEqual(measured.complete_participants, 2);
assert.strictEqual(measured.guardrails.status, "passed");
assert.strictEqual(measured.efficiency_verdict, "descriptive_only");
assert.strictEqual(measured.evidence_status, "fixture_or_observation_data_only");

const guardrailFailed = summarizeExperiment(protocol, loadJson(path.join(FIXTURES, "guardrail-failed.json")).observations);
assert.strictEqual(guardrailFailed.status, "guardrail_failed");
assert.strictEqual(guardrailFailed.guardrails.status, "failed");
assert.deepStrictEqual(guardrailFailed.guardrails.worsened, protocol.guardrails);
assert.strictEqual(guardrailFailed.efficiency_verdict, "do_not_adopt");

const duplicateOrder = JSON.parse(JSON.stringify(valid));
duplicateOrder[1].order = 1;
const incompleteOrderSummary = summarizeExperiment(protocol, duplicateOrder);
assert.strictEqual(incompleteOrderSummary.status, "insufficient_sample");
assert.strictEqual(incompleteOrderSummary.complete_participants, 1);

assert.throws(
  () => summarizeExperiment(protocol, [invalidMetric]),
  error => error instanceof ExperimentError && error.code === "INVALID_OBSERVATION_METRIC"
);

assert.throws(
  () => summarizeExperiment(uncontrolled, []),
  error => error instanceof ExperimentError && error.errors.some(item => item.code === "ORDER_CONTROL_REQUIRED")
);

process.stdout.write("review efficiency: all tests passed\n");
