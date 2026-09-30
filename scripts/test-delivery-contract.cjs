"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  ContractError,
  loadContract,
  validateContract,
  filterDelivery
} = require("./delivery-contract.cjs");

const ROOT = path.resolve(__dirname, "..");
const CONTRACT_FILE = path.join(ROOT, "references", "delivery-contract.json");
const contract = loadContract(CONTRACT_FILE);

function expectCode(fn, code) {
  assert.throws(fn, error => error instanceof ContractError && error.code === code);
}

assert.deepStrictEqual(contract.layers, ["product", "implementation", "acceptance"]);
assert.strictEqual(validateContract(contract).ok, true);

const source = {
  product: {
    title: "Product title",
    scenarios: [{ title: "Scenario", behavior: "Visible behavior" }]
  },
  implementation: {
    api: "INTERNAL_API_SENTINEL",
    implementation_steps: ["private step"]
  },
  acceptance: {
    acceptance_criteria: ["ACCEPTANCE_SENTINEL"],
    verification_commands: ["node test.js"]
  }
};

const product = filterDelivery(source, "product", contract);
assert.deepStrictEqual(product, { product: source.product });
assert.notStrictEqual(product, source);
assert(!JSON.stringify(product).includes("INTERNAL_API_SENTINEL"));
assert(!JSON.stringify(product).includes("ACCEPTANCE_SENTINEL"));

assert.deepStrictEqual(
  filterDelivery(source, "implementation", contract),
  { product: source.product, implementation: source.implementation }
);
assert.deepStrictEqual(filterDelivery(source, "acceptance", contract), source);
assert.deepStrictEqual(source.implementation.api, "INTERNAL_API_SENTINEL");

expectCode(
  () => filterDelivery({ product: { title: "x", unknown: true } }, "product", contract),
  "UNKNOWN_FIELD"
);
expectCode(
  () => filterDelivery({ product: { scenarios: [{ title: "x", unknown_nested: true }] } }, "product", contract),
  "UNKNOWN_FIELD"
);
expectCode(() => filterDelivery(source, "private", contract), "INVALID_DELIVERY_LAYER");

const unsafe = JSON.parse(JSON.stringify(contract));
unsafe.unknown_field_policy = "allow";
assert(validateContract(unsafe).errors.some(error => error.code === "UNSAFE_UNKNOWN_POLICY"));
expectCode(() => filterDelivery(source, "product", unsafe), "UNSAFE_UNKNOWN_POLICY");

const ambiguous = JSON.parse(JSON.stringify(contract));
ambiguous.field_owners.title = ["product", "implementation"];
assert(validateContract(ambiguous).errors.some(error => error.code === "AMBIGUOUS_FIELD_OWNER"));

for (const entry of ["full", "standard", "lightweight", "direct_annotation", "html_review_docs"]) {
  const missing = JSON.parse(JSON.stringify(contract));
  delete missing.entry_points[entry];
  assert(
    validateContract(missing).errors.some(error => error.code === "MISSING_ENTRY_MAPPING" && error.entry === entry),
    `missing mapping must fail: ${entry}`
  );
}

const skill = fs.readFileSync(path.join(ROOT, "SKILL.md"), "utf8");
const template = fs.readFileSync(path.join(ROOT, "references", "annotation-output-templates.md"), "utf8");
for (const entry of ["full", "standard", "lightweight", "direct_annotation", "html_review_docs"]) {
  assert(skill.includes(`\`${entry}\``), `SKILL.md maps ${entry}`);
}
assert(skill.includes("references/delivery-contract.json"));
assert(skill.includes("filterDelivery(sourceDocument, \"product\", contract)"));
assert(template.includes("references/delivery-contract.json"));
assert(template.includes("filterDelivery(sourceDocument, \"product\", contract)"));

console.log("delivery contract: all tests passed");
