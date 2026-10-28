import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoResult } from "../services/research";
import { lookupLibrary, readSources, validateAnswer } from "../services/chatLibrary";

test("an answer can cite only evidence belonging to its identified record", () => {
  const result = buildDemoResult();
  const record = result.sections[1].items[0];
  const answer = validateAnswer({ claims: [{ text: "The documented package is a 132 kV transmission line.", recordId: record.id, citationIds: record.citationIds }] });
  assert.equal(answer.claims[0].recordId, record.id);
  assert.throws(() => validateAnswer({ claims: [{ text: "Unsupported claim", recordId: record.id, citationIds: ["cite_6def679435c47bf2"] }] }), /does not belong/);
});

test("only approved output types, actual procurements and valid filters are accepted", () => {
  const result = buildDemoResult();
  const procurement = result.sections[1].items[0];
  assert.equal(validateAnswer({ claims: [], output: { kind: "collection", recordIds: [procurement.id], view: "map", projectId: "P162086" } }).output?.kind, "collection");
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "html", content: "<script>bad</script>" } }));
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "collection", recordIds: ["readiness_checklist:F1"], view: "map" } }), /requires a procurement/);
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "collection", recordIds: [procurement.id], view: "list", projectId: "invented" } }), /Unknown project/);
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "collection", view: "list", recordIds: ["invented"] } }), /unavailable/);
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "collection", view: "list", recordIds: [], component: "arbitrary" } }));
});

test("checklists distinguish source records and suggestions without changing source text", () => {
  const result = buildDemoResult();
  const before = JSON.stringify(result);
  const sourceItem = { id: "permit", recordId: "readiness_checklist:F2" };
  const suggestion = { id: "review", suggestion: "Ask the project team to review the preparation questions." };
  const answer = validateAnswer({ claims: [], output: { kind: "checklist", items: [sourceItem, suggestion] } }, result);
  assert.equal(answer.output?.kind, "checklist");
  assert.equal(JSON.stringify(result), before);
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "checklist", items: [{ ...sourceItem, suggestion: "Pretend this was a contractual requirement" }] } }), /separate suggestion/);
  assert.throws(() => validateAnswer({ claims: [], output: { kind: "checklist", items: [sourceItem, sourceItem] } }), /unique/);
});

test("library tools find records in user wording and expose exact source references without pretending to retrieve", () => {
  const result = buildDemoResult();
  const response = lookupLibrary({ query: "Tuensang" }, result);
  const procurement = response.records.find((record) => record.title === "GIS substation upgrade at Tuensang to 132 kV");
  assert.ok(procurement);
  assert.match(response.source, /no external retrieval/);
  assert.ok(response.associations.some((link) => link.procurementId === procurement.id && link.award?.id === "historical_awards:F1"));
  const sources = readSources({ citationIds: procurement.citationIds }, result);
  assert.equal(sources[0].text, result.citationsById[procurement.citationIds[0]].text);
  assert.throws(() => readSources({ citationIds: ["invented"] }, result), /Unknown source/);
  assert.throws(() => lookupLibrary({ recordIds: ["invented"] }, result), /Unknown library record/);
  const filtered = lookupLibrary({ projectId: "P162086", sectionId: "historical_awards" }, result);
  assert.equal(filtered.records.length, 1);
  assert.equal(filtered.records[0].id, "historical_awards:F2");
});

test("collections configure titles and source fields for different record types", () => {
  const output = { kind: "collection", title: "Readiness actions", view: "list", recordIds: ["readiness_checklist:F1"], fields: ["text", "unknowns"] };
  assert.equal(validateAnswer({ claims: [], output }).output?.kind, "collection");
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, fields: ["supplier_invented"] } }));
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, recordIds: ["readiness_checklist:F1", "readiness_checklist:F1"] } }), /unique/);
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, fields: ["text", "text"] } }), /unique/);
});

test("split presentation validates selected records and permitted detail fields", () => {
  const record = buildDemoResult().sections[1].items[0];
  const output = { kind: "collection", recordIds: [record.id], view: "list", layout: "split", selectedId: record.id, detailFields: ["supplier", "duration"] };
  assert.equal(validateAnswer({ claims: [], output }).output?.kind, "collection");
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, selectedId: "outside-this-answer" } }), /belong/);
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, detailFields: ["duration", "duration"] } }), /unique/);
  assert.throws(() => validateAnswer({ claims: [], output: { ...output, detailFields: ["invented"] } }));
});
