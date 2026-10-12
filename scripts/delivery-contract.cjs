"use strict";

const fs = require("fs");

class ContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ContractError";
    this.code = code;
    Object.assign(this, details);
  }
}

function loadContract(filePath) {
  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new ContractError("INVALID_CONTRACT", `Cannot load delivery contract: ${error.message}`);
  }
  const result = validateContract(contract);
  if (!result.ok) {
    throw new ContractError("INVALID_CONTRACT", "Delivery contract is invalid", { errors: result.errors });
  }
  return contract;
}

function validateContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return { ok: false, errors: [{ code: "INVALID_CONTRACT" }] };
  }
  if (contract.schema_version !== "delivery-contract/1.0") {
    errors.push({ code: "INVALID_SCHEMA_VERSION" });
  }
  if (!Array.isArray(contract.layers) || contract.layers.join("\0") !== "product\0implementation\0acceptance") {
    errors.push({ code: "INVALID_LAYERS" });
  }
  if (contract.unknown_field_policy !== "reject") {
    errors.push({ code: "UNSAFE_UNKNOWN_POLICY" });
  }
  if (!contract.field_owners || typeof contract.field_owners !== "object") {
    errors.push({ code: "MISSING_FIELD_OWNERS" });
  } else {
    for (const [field, owner] of Object.entries(contract.field_owners)) {
      const owners = Array.isArray(owner) ? owner : [owner];
      if (owners.length !== 1 || !contract.layers.includes(owners[0])) {
        errors.push({ code: "AMBIGUOUS_FIELD_OWNER", field });
      }
    }
  }
  if (!contract.entry_points || typeof contract.entry_points !== "object") {
    errors.push({ code: "MISSING_ENTRY_MAPPING" });
  } else {
    for (const entry of ["full", "standard", "lightweight", "direct_annotation", "html_review_docs"]) {
      if (!Object.prototype.hasOwnProperty.call(contract.entry_points, entry)) {
        errors.push({ code: "MISSING_ENTRY_MAPPING", entry });
      } else if (!contract.layers.includes(contract.entry_points[entry])) {
        errors.push({ code: "INVALID_ENTRY_MAPPING", entry });
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function findEngineeringContent(text) {
  const patterns = [
    /\b(?:GET|POST|PUT|DELETE|PATCH)\s+\/[^\s`<]+|\/api\/[\w/{]/i,
    /(?:^|[\s`"'])(?:[\w.-]+\/)+[\w.-]+\.(?:[cm]?[jt]sx?|py|go|rs|java|sh|vue|svelte)(?=$|[\s`"':])/i,
    /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:test|build|lint|check)\b|\b(?:node|python3?|pytest|jest|vitest|curl)\s+[^\s]+/i,
    /错误码\s*[:：=]?\s*[`"']?(?:\d{3}|[A-Z][A-Z_\d]+)|\bHTTP\s*(?:状态码\s*)?[45]\d{2}\b|(?:返回|响应|状态码)\s*[45]\d{2}/
  ];
  const findings = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.test(line)) findings.push({ line: index + 1, pattern: pattern.source });
    }
  });
  return findings;
}

function filterDelivery(document, targetLayer, contract) {
  const contractResult = validateContract(contract);
  if (!contractResult.ok) {
    const unsafe = contractResult.errors.find(error => error.code === "UNSAFE_UNKNOWN_POLICY");
    throw new ContractError(unsafe ? unsafe.code : "INVALID_CONTRACT", "Delivery contract is invalid", { errors: contractResult.errors });
  }
  const targetIndex = contract.layers.indexOf(targetLayer);
  if (targetIndex === -1) {
    throw new ContractError("INVALID_DELIVERY_LAYER", `Unknown delivery layer: ${targetLayer}`);
  }
  const owners = contract.field_owners;
  function visit(value, path) {
    if (Array.isArray(value)) return value.map((item, index) => visit(item, `${path}[${index}]`));
    if (typeof value === "string" && targetLayer === "product" && findEngineeringContent(value).length) {
      throw new ContractError("ENGINEERING_CONTENT", `Engineering content in product field: ${path}`, { path });
    }
    if (!value || typeof value !== "object") return value;
    const output = {};
    for (const [field, child] of Object.entries(value)) {
      const owner = owners[field];
      if (!owner) {
        throw new ContractError("UNKNOWN_FIELD", `Unknown delivery field: ${path}.${field}`, { field, path });
      }
      if (contract.layers.indexOf(owner) <= targetIndex) {
        output[field] = visit(child, `${path}.${field}`);
      }
    }
    return output;
  }
  return visit(document, "$");
}

module.exports = { ContractError, loadContract, validateContract, filterDelivery, findEngineeringContent };
