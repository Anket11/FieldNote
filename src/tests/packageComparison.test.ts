import assert from "node:assert/strict";
import test from "node:test";
import { combinePackages, awardFields, packageLocationText } from "../services/packageComparison";
import { buildDemoResult } from "../services/research";

test("comparison links only unique matching award notices and preserves source data", () => {
  const result = buildDemoResult();
  const before = JSON.stringify(result);
  const packages = result.sections.find((section) => section.id === "similar_procurements")!.items.filter((item) => item.kind === "package");
  const awards = result.sections.find((section) => section.id === "historical_awards")!.items;
  const columns = combinePackages(packages, awards, result.citationsById);
  assert.equal(columns.length, 5);
  assert.equal(packageLocationText(packages[0]), "Jadugoda to Dhalbhumgarh");
  assert.equal(packageLocationText(packages[1]), "Tuensang");
  assert.equal(packageLocationText(packages[2]), "Mizoram");
  assert.equal(packageLocationText(packages[3]), undefined);
  assert.equal(columns.filter(({ award }) => award).length, 2);
  assert.equal(columns[0].award?.id, "historical_awards:F2");
  assert.deepEqual(awardFields(columns[1].award), { supplier: "GE T&D India Limited", value: "evaluated bid price of INR 693401152.00", duration: "15 months" });
  assert.equal(awardFields().supplier, undefined);
  const ambiguous = combinePackages([...packages, { ...packages[0], id: "other" }], awards, result.citationsById);
  assert.ok(ambiguous.some(({ item, award }) => item.id === awards[1].id && award?.id === item.id));
  assert.equal(JSON.stringify(result), before);
});
