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
    scenarios: [{ title: "Scenario", behavior: "Visible behavior" }],
    acceptance_criteria: ["选择记录后显示确认结果"],
    observable_acceptance: ["空列表显示暂无记录"]
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

assert.deepStrictEqual(product.product.acceptance_criteria, source.product.acceptance_criteria);
assert.deepStrictEqual(product.product.observable_acceptance, source.product.observable_acceptance);
assert.deepStrictEqual(
  filterDelivery({ product: { ...source.product, api: "private", verification_commands: ["npm test"] } }, "product", contract),
  product
);
for (const value of ["GET /api/private", "src/private.ts", "npm test", "错误码：403"]) {
  expectCode(() => filterDelivery({ acceptance_criteria: [value] }, "product", contract), "ENGINEERING_CONTENT");
}
assert.deepStrictEqual(filterDelivery({ acceptance_criteria: ["点击按钮后显示成功"] }, "product", contract),
  { acceptance_criteria: ["点击按钮后显示成功"] });
assert.deepStrictEqual(filterDelivery({ acceptance_criteria: ["npm test"] }, "acceptance", contract),
  { acceptance_criteria: ["npm test"] });

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

assert(template.includes("当前请求够用即停"));
assert(template.includes("4A 默认直接生成评审面板，无需额外模式确认"));
assert(template.includes("只有用户请求或确认 Spec 工作且完成范围确认后，才固定生成三文档"));
assert(template.includes("不自动扩大到 PRD、Spec 或实现"));
assert(template.includes("未运行或受阻如实说明"));
assert(!template.includes("经 Step 8F 模式路由确认后启用"));
assert(!template.includes("三种输出格式对应三条路由路径"));
assert(!template.includes("spec-analyze 的核心差异化"));

console.log("delivery contract: all tests passed");
