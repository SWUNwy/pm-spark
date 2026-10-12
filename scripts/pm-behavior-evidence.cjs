"use strict";
const fs = require("fs");
const path = require("path");
function validateBehaviorEvidence(item, definition, root) {
  const errors = [];
  const filled = value => typeof value === "string" && value.trim().length > 0;
  const read = file => {
    if (!filled(file) || path.isAbsolute(file)) throw new Error("relative evidence path required");
    const resolved = fs.realpathSync(path.resolve(root, file));
    if (!resolved.startsWith(`${fs.realpathSync(root)}${path.sep}`)) throw new Error("evidence outside root");
    return fs.readFileSync(resolved, "utf8");
  };
  if (!definition) return ["missing definition"];
  const conversation = item.conversation || {};
  const users = conversation.user_turns, assistants = conversation.assistant_turns;
  let expected = definition.user_turns;
  if (definition.answer_branches) {
    if (!conversation.branch_id && definition.answer_branches.length > 1) {
      expected = [];
      for (const b of definition.answer_branches) {
        const bturns = [...definition.user_turns]; bturns[b.turn_index] = b.user_turn;
        expected = expected.concat(bturns);
      }
    } else {
      const branch = definition.answer_branches.find(branch => branch.id === conversation.branch_id);
      if (!branch) errors.push("missing answer branch");
      else { expected = [...expected]; expected[branch.turn_index] = branch.user_turn; }
    }
  }
  if (JSON.stringify(users) !== JSON.stringify(expected)) errors.push("incomplete or changed catalog user turns");
  if (!Array.isArray(assistants) || assistants.length !== expected.length || !assistants.every(filled)) errors.push("incomplete assistant turns");
  if (definition.conversation_layout && conversation.layout !== definition.conversation_layout) errors.push("wrong conversation layout");
  try {
    const transcript = JSON.parse(read(item.evidence?.transcript_path));
    if (transcript.scenario_id !== item.id || JSON.stringify(transcript.conversation) !== JSON.stringify(conversation)) errors.push("transcript does not match full conversation");
  } catch { errors.push("missing or invalid transcript evidence"); }
  const review = item.checks?.review;
  for (const kind of ["expected_behavior", "must_not_do"]) {
    const criteria = definition[kind];
    const entries = review?.[kind];
    if (!Array.isArray(entries) || entries.length !== criteria.length) { errors.push(`missing per-item ${kind} review`); continue; }
    criteria.forEach((criterion, index) => {
      const entry = entries[index];
      if (entry?.criterion !== criterion || ![kind === "expected_behavior" ? "met" : "not_observed", "not_applicable"].includes(entry?.verdict) || !filled(entry?.reason)) errors.push(`invalid ${kind} review ${index}`);
      if (kind === "must_not_do" && entry?.verdict === "not_applicable") errors.push(`invalid conditional not_applicable ${kind} review ${index}`);
      if (entry?.verdict === "not_applicable") {
        if (kind !== "expected_behavior" || !filled(entry?.condition) || !filled(entry?.reason) || entry.evidence?.length) errors.push(`invalid conditional not_applicable ${kind} review ${index}`);
        return;
      }
      if (!Array.isArray(entry?.evidence) || !entry.evidence.length || !entry.evidence.every(ref => Number.isInteger(ref.turn_index) && filled(ref.quote) && assistants?.[ref.turn_index]?.includes(ref.quote))) errors.push(`unlocated ${kind} evidence ${index}`);
    });
  }
  if (definition.initial_artifacts) {
    const artifacts = item.evidence?.initial_artifacts;
    for (const name of Object.keys(definition.initial_artifacts)) {
      try { if (!filled(read(artifacts?.[name]))) errors.push(`empty initial artifact ${name}`); } catch { errors.push(`missing initial artifact ${name}`); }
    }
  }
  return errors;
}
module.exports = { validateBehaviorEvidence };
