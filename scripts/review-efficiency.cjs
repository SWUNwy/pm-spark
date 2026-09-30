"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONDITIONS = ["numbered_directory", "on_demand_relationship"];
const METRICS = ["first_understanding_ms", "annotation_location_ms", "click_count"];
const GUARDRAILS = ["misunderstanding_count", "omission_count", "conflict_count", "locatability"];
const OBSERVATION_FIELDS = ["participant_id", "condition", "task_id", "order", "metrics", "quality"];

function sameValues(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function unknownFields(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).filter(field => !allowed.includes(field));
}

class ExperimentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExperimentError";
    this.code = code;
    Object.assign(this, details);
  }
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateProtocol(protocol) {
  const errors = [];
  if (!protocol || typeof protocol !== "object" || Array.isArray(protocol) || protocol.protocol_version !== "review-efficiency/1.0") {
    errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "protocol_version" });
  }
  for (const field of ["conditions", "tasks", "metrics", "guardrails"]) {
    if (!Array.isArray(protocol && protocol[field]) || protocol[field].length === 0) {
      errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field });
    }
  }
  if (Array.isArray(protocol && protocol.conditions) && !sameValues(protocol.conditions, CONDITIONS)) {
    errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "conditions" });
  }
  if (Array.isArray(protocol && protocol.metrics) && !sameValues(protocol.metrics, METRICS)) {
    errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "metrics" });
  }
  if (Array.isArray(protocol && protocol.guardrails) && !sameValues(protocol.guardrails, GUARDRAILS)) {
    errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "guardrails" });
  }
  if (!protocol || protocol.order_policy !== "counterbalanced") {
    errors.push({ code: "ORDER_CONTROL_REQUIRED", field: "order_policy" });
  }
  if (!protocol || !Number.isInteger(protocol.minimum_complete_participants) || protocol.minimum_complete_participants < 1) {
    errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "minimum_complete_participants" });
  }
  if (Array.isArray(protocol && protocol.tasks)) {
    const taskIds = protocol.tasks.map(task => task && task.id);
    if (taskIds.some(id => typeof id !== "string" || !id) || new Set(taskIds).size !== taskIds.length) {
      errors.push({ code: "INCOMPLETE_EXPERIMENT_PROTOCOL", field: "tasks" });
    }
  }
  return { ok: errors.length === 0, errors };
}

function validateObservation(observation, protocol) {
  const errors = [];
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
    return { ok: false, errors: [{ code: "INVALID_OBSERVATION" }] };
  }
  for (const field of unknownFields(observation, OBSERVATION_FIELDS)) {
    errors.push({ code: "INVALID_OBSERVATION", field });
  }
  if (!observation.participant_id || !protocol.conditions.includes(observation.condition) || !protocol.tasks.some(task => task.id === observation.task_id) || !Number.isInteger(observation.order) || observation.order < 1 || observation.order > protocol.conditions.length) {
    errors.push({ code: "INVALID_OBSERVATION" });
  }
  for (const field of unknownFields(observation.metrics, protocol.metrics)) {
    errors.push({ code: "INVALID_OBSERVATION_METRIC", field });
  }
  for (const metric of protocol.metrics) {
    if (!Number.isInteger(observation.metrics && observation.metrics[metric]) || observation.metrics[metric] < 0) {
      errors.push({ code: "INVALID_OBSERVATION_METRIC", field: metric });
    }
  }
  for (const field of unknownFields(observation.quality, protocol.guardrails)) {
    errors.push({ code: "INVALID_OBSERVATION_QUALITY", field });
  }
  for (const guardrail of protocol.guardrails) {
    if (!Number.isInteger(observation.quality && observation.quality[guardrail]) || observation.quality[guardrail] < 0) {
      errors.push({ code: "INVALID_OBSERVATION_QUALITY", field: guardrail });
    }
  }
  return { ok: errors.length === 0, errors };
}

function median(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarizeExperiment(protocol, observations) {
  const protocolResult = validateProtocol(protocol);
  if (!protocolResult.ok) throw new ExperimentError("INCOMPLETE_EXPERIMENT_PROTOCOL", "Invalid experiment protocol", { errors: protocolResult.errors });
  if (!Array.isArray(observations)) throw new ExperimentError("INVALID_OBSERVATIONS", "Observations must be an array");

  const errors = [];
  for (const observation of observations) {
    const result = validateObservation(observation, protocol);
    if (!result.ok) errors.push(...result.errors);
  }
  if (errors.length) throw new ExperimentError(errors[0].code, "Invalid observation", { errors });

  const participantTasks = new Map();
  for (const observation of observations) {
    const key = `${observation.participant_id}\0${observation.task_id}`;
    const rows = participantTasks.get(key) || [];
    rows.push(observation);
    participantTasks.set(key, rows);
  }
  const completeParticipants = new Set();
  for (const [key, rows] of participantTasks) {
    const conditions = new Set(rows.map(row => row.condition));
    const orders = new Set(rows.map(row => row.order));
    if (conditions.size === protocol.conditions.length && orders.size === rows.length) {
      completeParticipants.add(key.split("\0")[0]);
    }
  }

  const descriptive = {};
  for (const condition of protocol.conditions) {
    const rows = observations.filter(row => row.condition === condition);
    descriptive[condition] = { sample_count: rows.length, metrics: {}, quality: {} };
    for (const metric of protocol.metrics) descriptive[condition].metrics[metric] = median(rows.map(row => row.metrics[metric]));
    for (const guardrail of protocol.guardrails) descriptive[condition].quality[guardrail] = median(rows.map(row => row.quality[guardrail]));
  }

  const completeEnough = completeParticipants.size >= protocol.minimum_complete_participants;
  if (!observations.length) {
    return { status: "pending", sample_count: 0, complete_participants: 0, descriptive, guardrails: { status: "pending", worsened: [] }, efficiency_verdict: null, evidence_status: "protocol_only" };
  }
  if (!completeEnough) {
    return { status: "insufficient_sample", sample_count: observations.length, complete_participants: completeParticipants.size, descriptive, guardrails: { status: "not_assessed", worsened: [] }, efficiency_verdict: null, evidence_status: "fixture_or_observation_data_only" };
  }

  const control = descriptive[protocol.conditions[0]].quality;
  const experiment = descriptive[protocol.conditions[1]].quality;
  const worsened = [];
  for (const guardrail of protocol.guardrails) {
    if (guardrail === "locatability") {
      if (experiment[guardrail] < control[guardrail]) worsened.push(guardrail);
    } else if (experiment[guardrail] > control[guardrail]) {
      worsened.push(guardrail);
    }
  }
  const status = worsened.length ? "guardrail_failed" : "measured";
  return {
    status,
    sample_count: observations.length,
    complete_participants: completeParticipants.size,
    descriptive,
    guardrails: { status: worsened.length ? "failed" : "passed", worsened },
    efficiency_verdict: worsened.length ? "do_not_adopt" : "descriptive_only",
    evidence_status: "fixture_or_observation_data_only"
  };
}

function main(argv) {
  const protocolPath = argv[0] || path.join(ROOT, "references", "review-efficiency-protocol.json");
  const observationsPath = argv[1] || path.join(ROOT, "tests", "experiments", "review-efficiency", "valid-observations.json");
  try {
    const protocol = loadJson(protocolPath);
    const fixture = loadJson(observationsPath);
    const observations = Array.isArray(fixture) ? fixture : fixture.observations;
    process.stdout.write(`${JSON.stringify(summarizeExperiment(protocol, observations), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { ExperimentError, loadJson, validateProtocol, validateObservation, summarizeExperiment };
