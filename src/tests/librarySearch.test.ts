import assert from "node:assert/strict";
import test from "node:test";
import { searchLibrary } from "../services/librarySearch";
import { buildDemoResult } from "../services/research";
import { assessEvidence, evidenceAssessmentSchema, lookupLibrary } from "../services/chatLibrary";

const library = buildDemoResult();
test("library search ranks natural queries, prefixes and common typos without changing records", () => {
  const before = JSON.stringify(library);
  for (const query of ["Tuensang substation", "Please find the Tuensang substation", "Tuensnag substation", "Tuens substat"]) {
    assert.match(searchLibrary(query, library)[0].title, /Tuensang/i, query);
  }
  assert.equal(searchLibrary("qzxvvvnonexistent", library).length, 0);
  assert.equal(searchLibrary("", library).length, library.sections.flatMap((section) => section.items).length);
  assert.equal(JSON.stringify(library), before);
  const record = library.sections[1].items[0];
  assert.deepEqual(lookupLibrary({ recordIds: [record.id] }, library).records.map((item) => item.id), [record.id]);
});

test("library search includes original passage text", () => {
  const modified = structuredClone(library);
  const record = modified.sections[1].items[0];
  modified.citationsById[record.citationIds[0]].text += " uniquequartzreference";
  assert.ok(searchLibrary("uniquequartzreference", modified).some((item) => item.id === record.id));
});

test("insufficient evidence triggers a real focused library search and keeps the gap explicit", () => {
  assert.equal(evidenceAssessmentSchema.safeParse({ sufficient: false, gaps: ["Contract value"] }).success, false);
  const result = assessEvidence({ sufficient: false, gaps: ["Contract value"], nextQuery: "Tuensang" });
  assert.equal(result.sufficient, false);
  assert.ok(result.additionalResearch?.records.length);
  assert.match(result.additionalResearch!.source, /no external retrieval/);
  assert.equal(assessEvidence({ sufficient: true, gaps: [] }).additionalResearch, undefined);
});
