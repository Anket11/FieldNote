import assert from "node:assert/strict";
import test from "node:test";
import { answerSchema, validateAnswer } from "../services/chatLibrary";
import { formatAnswer } from "../services/answerExport";
import { buildDemoResult } from "../services/research";
import { coordinatesSchema } from "../services/coordinates";
import { zodToJsonSchema } from "zod-to-json-schema";

test("map, terrain and historical outputs accept bounded GeoJSON coordinates", () => {
  for (const view of ["map", "terrain", "history"] as const) {
    const answer = validateAnswer({ claims: [], output: { kind: "location", query: "Target substation", coordinates: [94.8, 26.2], view } });
    assert.equal(answer.output?.kind, "location");
    if (answer.output?.kind === "location") assert.deepEqual(answer.output.coordinates, [94.8, 26.2]);
  }
  for (const coordinates of [[94.8, 91], [181, 26.2], [NaN, 26.2], [94.8], [94.8, 26.2, 100]]) {
    assert.equal(answerSchema.safeParse({ claims: [], output: { kind: "location", query: "Target", coordinates, view: "map" } }).success, false);
  }
});

test("collection target coordinates remain distinct from original procurement locations", () => {
  const library = buildDemoResult();
  const before = JSON.stringify(library);
  const record = library.sections.flatMap((section) => section.items).find((item) => item.kind === "package")!;
  const answer = validateAnswer({ claims: [], output: { kind: "collection", recordIds: [record.id], view: "map", targetLocation: { name: "Planned site", coordinates: [94.8, 26.2] } } }, library);
  assert.equal(JSON.stringify(library), before);
  const exported = formatAnswer("Find similar procurements", [], [{ id: "answer", answer }], library);
  assert.match(exported, /Target: Planned site/);
  assert.match(exported, /Latitude, longitude: 26.2, 94.8/);
});

test("coordinate tool schema uses homogeneous array items rather than unsupported positional items", () => {
  const schema = zodToJsonSchema(coordinatesSchema());
  assert.ok("items" in schema);
  assert.equal(Array.isArray(schema.items), false);
});
