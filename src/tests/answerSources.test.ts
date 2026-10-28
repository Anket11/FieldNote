import assert from "node:assert/strict";
import test from "node:test";
import { answerSources, firstSourceMentions } from "../services/answerSources";
import { buildDemoResult } from "../services/research";
import type { ResearchAnswer } from "../types/chat";

test("repeated claims and displayed record fields contribute each source only once", () => {
  const result = buildDemoResult();
  const item = result.sections.find((section) => section.id === "readiness_checklist")!.items[0];
  const answer: ResearchAnswer = { claims: [
    { text: "First claim", recordId: item.id, citationIds: item.citationIds },
    { text: "Second claim", recordId: item.id, citationIds: item.citationIds },
  ], output: { kind: "collection", recordIds: [item.id], view: "list", layout: "split" } };
  const groups = answerSources(answer, result);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((source) => source.id), item.citationIds);
  assert.equal(answerSources({ claims: [{ text: "Unrelated", recordId: "missing", citationIds: item.citationIds }] }, result).length, 0);
});

test("one document preview retains separate passages and does not merge unknown documents by title", () => {
  const result = buildDemoResult();
  const items = result.sections.find((section) => section.id === "readiness_checklist")!.items.slice(0, 2);
  const first = result.citationsById[items[0].citationIds[0]];
  const second = result.citationsById[items[1].citationIds[0]];
  first.sourceUrl = "https://example.com/document.pdf#page=1";
  second.sourceUrl = "https://example.com/document.pdf#page=5";
  const before = JSON.stringify(result);
  const answer: ResearchAnswer = { claims: items.map((item) => ({ text: item.text, recordId: item.id, citationIds: item.citationIds })) };
  const groups = answerSources(answer, result);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
  assert.equal(groups[0][0].text, first.text);
  assert.equal(groups[0][1].text, second.text);
  assert.equal(JSON.stringify(result), before);
  first.bronzePath = second.bronzePath = "source/shared.pdf";
  second.sourceUrl = undefined;
  assert.equal(answerSources(answer, result).length, 1);
  first.sourceUrl = second.sourceUrl = undefined;
  first.bronzePath = second.bronzePath = undefined;
  second.title = first.title;
  assert.equal(answerSources(answer, result).length, 2);
});


test("source groups are assigned to their first relevant mention, never to unrelated text", () => {
  const result = buildDemoResult();
  const item = result.sections.find((section) => section.id === "readiness_checklist")!.items[0];
  const source = result.citationsById[item.citationIds[0]];
  const anotherPassage = { ...source, id: "another-passage" };
  const groups = [[source, anotherPassage]];
  const placed = firstSourceMentions(groups, [[], [source.id], [anotherPassage.id], [source.id]]);
  assert.deepEqual(placed.map((groups) => groups.length), [0, 1, 0, 0]);
  assert.equal(placed[1][0].length, 2);
});

test("shared JSON cache files do not merge distinct procurement and award records", () => {
  const result = buildDemoResult();
  const item = result.sections.flatMap((section) => section.items).find((item) => item.title === "GIS substation upgrade at Tuensang to 132 kV")!;
  const award = result.sections.find((section) => section.id === "historical_awards")!.items[0];
  const groups = answerSources({ claims: [{ text: "A relevant substation example", recordId: item.id, citationIds: item.citationIds }],
    output: { kind: "collection", recordIds: [item.id], view: "list", layout: "split" } }, result);
  const packageGroup = groups.find((group) => group.some((source) => source.id === item.citationIds[0]));
  const awardGroup = groups.find((group) => group.some((source) => source.id === award.citationIds[0]));
  assert.ok(packageGroup && awardGroup);
  assert.notEqual(packageGroup, awardGroup);
  const placements = firstSourceMentions(groups, [item.citationIds, award.citationIds, award.citationIds]);
  assert.deepEqual(placements.map((groups) => groups.length), [1, 1, 0]);
});
