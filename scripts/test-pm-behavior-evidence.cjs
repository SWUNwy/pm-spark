"use strict";
const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validateBehaviorEvidence } = require("./pm-behavior-evidence.cjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-behavior-evidence-"));
const definition = { id: "pm-test", user_turns: ["Q1", "Q2"], expected_behavior: ["E1"], must_not_do: ["N1"] };
const conditionalDefinition = { ...definition, expected_behavior: ["conditional"] };
const base = { id: "pm-test", status: "passed", conversation: { user_turns: ["Q1", "Q2"], assistant_turns: ["A1", "A2"] }, evidence: { transcript_path: "transcript.json" }, checks: { review: { expected_behavior: [{ criterion: "E1", verdict: "met", reason: "A1 answers it", evidence: [{ turn_index: 0, quote: "A1" }] }], must_not_do: [{ criterion: "N1", verdict: "not_observed", reason: "A1 and A2 contain no prohibited action", evidence: [{ turn_index: 1, quote: "A2" }] }] } } };
fs.writeFileSync(path.join(root, "transcript.json"), JSON.stringify({ scenario_id: "pm-test", conversation: base.conversation }));
assert.deepEqual(validateBehaviorEvidence(base, definition, root), []);
const conditional = JSON.parse(JSON.stringify(base));
conditional.checks.review.expected_behavior = [{ criterion: "conditional", verdict: "not_applicable", condition: "Only applies when no blocking issue exists", reason: "This run has a blocking issue", evidence: [] }];
assert.deepEqual(validateBehaviorEvidence(conditional, conditionalDefinition, root), []);
const invalidConditional = JSON.parse(JSON.stringify(conditional));
invalidConditional.checks.review.expected_behavior[0].condition = "";
assert.ok(validateBehaviorEvidence(invalidConditional, conditionalDefinition, root).some(error => error.includes("conditional not_applicable")));
const partial = JSON.parse(JSON.stringify(base));
partial.checks.review.expected_behavior = [];
assert.ok(validateBehaviorEvidence(partial, definition, root).some(error => error.includes("per-item expected_behavior")));
const tampered = JSON.parse(JSON.stringify(base));
tampered.conversation.assistant_turns[1] = "changed";
assert.ok(validateBehaviorEvidence(tampered, definition, root).some(error => error.includes("transcript")));
for (const mutate of [
  item => { item.checks = { expected_behavior_met: true, must_not_do_violations: [] }; },
  item => { item.conversation.user_turns.pop(); },
  item => { item.checks.review.must_not_do = []; },
  item => { item.checks.review.expected_behavior[0].evidence[0].quote = "absent"; },
  item => { item.evidence.transcript_path = "unrelated.txt"; }
]) {
  const item = JSON.parse(JSON.stringify(base));
  mutate(item);
  assert.ok(validateBehaviorEvidence(item, definition, root).length > 0);
}
fs.writeFileSync(path.join(root, "unrelated.txt"), "arbitrary nonempty file");
const unrelated = JSON.parse(JSON.stringify(base));
unrelated.evidence.transcript_path = "unrelated.txt";
assert.ok(validateBehaviorEvidence(unrelated, definition, root).length > 0);
const pair = { ...definition, conversation_layout: "independent_pair" };
assert.ok(validateBehaviorEvidence(base, pair, root).includes("wrong conversation layout"));
const branch = { ...definition, answer_branches: [{ id: "answer", turn_index: 1, user_turn: "Q2" }] };
assert.ok(validateBehaviorEvidence(base, branch, root).includes("missing answer branch"));
assert.ok(validateBehaviorEvidence(base, { ...definition, initial_artifacts: { "prd.md": "prior confirmed AC" } }, root).includes("missing initial artifact prd.md"));
fs.rmSync(root, { recursive: true, force: true });
console.log("PM behavior evidence contract: passed");
