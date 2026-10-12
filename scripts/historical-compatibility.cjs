"use strict";

const LEGACY_TEXT = /\bL[0-3]\b|\b(?:source_action_level|action_level|action_level_changed)\b|authority\.(?:level|source_action_level)/i;
function legacyPaths(value, prefix = "", { historical = false } = {}) {
  if (typeof value === "string") return LEGACY_TEXT.test(value) ? [prefix] : [];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    if (key === "historical_compatibility" && !historical) return [];
    const location = prefix ? `${prefix}.${key}` : key;
    if (["action_level", "source_action_level"].includes(key) || (key === "level" && prefix.split(".").at(-1) === "authority")) return [location];
    return legacyPaths(item, location, { historical });
  });
}
function currentItems(items) {
  return (items || []).filter(item => !item?.historical_compatibility && legacyPaths(item).length === 0);
}
function quarantine(value, archive, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const location = `${prefix}.${index}`;
      if (legacyPaths(item).length) {
        archive.push({ path: location, value: item });
        return [];
      }
      return [item];
    });
  }
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const location = prefix ? `${prefix}.${key}` : key;
    if (key === "historical_compatibility") { result[key] = item; continue; }
    if (["action_level", "source_action_level"].includes(key) || (key === "level" && prefix.split(".").at(-1) === "authority") || (typeof item === "string" && LEGACY_TEXT.test(item))) {
      archive.push({ path: location, value: item });
    } else result[key] = quarantine(item, archive, location);
  }
  return result;
}
function historicalEvidence(events) {
  return events.map(event => legacyPaths(event).length ? {
    line: event.line,
    historical_compatibility: { excluded_from_current_context: true, original_event: event }
  } : event);
}
module.exports = { legacyPaths, currentItems, quarantine, historicalEvidence };
