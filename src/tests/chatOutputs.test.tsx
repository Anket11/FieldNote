import assert from "node:assert/strict";
import test from "node:test";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderToStaticMarkup } from "react-dom/server";
import ResearchAnswerView from "../components/app/answers/AnswerView";
import { buildDemoResult } from "../services/research";
import type { ChecklistEdit, ResearchAnswer } from "../types/chat";

function render(answer: ResearchAnswer, edits: Record<string, ChecklistEdit> = {}, outputId = "answer-a") {
  const store = configureStore({ reducer: () => ({ research: {
    result: buildDemoResult(),
  } }) });
  return renderToStaticMarkup(<Provider store={store}><ResearchAnswerView answer={answer} outputId={outputId}
    checklistEdits={edits} onChecklistChange={() => {}} /></Provider>);
}

test("a plain answer renders only its escaped claim and related source", () => {
  const award = buildDemoResult().sections.find((section) => section.id === "historical_awards")!.items[0];
  const html = render({ claims: [{ text: "<b>GE T&D India Limited</b>", recordId: award.id, citationIds: award.citationIds }] });
  assert.match(html, /&lt;b&gt;GE T&amp;D India Limited&lt;\/b&gt;/);
  assert.match(html, /aria-label="Source:/);
  assert.doesNotMatch(html, /<b>|Procurement results|Preparation checklist|Location workspace|Research findings/);
  const unrelated = render({ claims: [{ text: "A claim", recordId: award.id, citationIds: ["cite_6def679435c47bf2"] }] });
  assert.doesNotMatch(unrelated, /aria-label="Source:/);
});

test("procurement collection keeps titles on the left and selected details on the right", () => {
  const items = buildDemoResult().sections[1].items;
  const html = render({ claims: [], output: { kind: "collection", recordIds: [items[0].id], view: "list" } });
  assert.match(html, /132 kV double circuit transmission line from Jadugoda to Dhalbhumgarh/);
  assert.doesNotMatch(html, /GIS substation upgrade at Tuensang|Preparation checklist|Research findings/);
  assert.match(html, /aria-label="Details" class="detail"/);
  assert.match(html, /aria-label="Details"/);
  assert.match(html, /Commissioning of 132 KV/);
  assert.match(html, /Supplier/);
  assert.match(html, /aria-pressed="true">List/);
  assert.match(html, /aria-pressed="false">Map/);
});

test("checklist labels source requirements and suggestions and isolates edits by output", () => {
  const result = buildDemoResult();
  const before = JSON.stringify(result);
  const requirement = result.sections.find((section) => section.id === "tender_requirements")!.items[0];
  const action = result.sections.find((section) => section.id === "readiness_checklist")!.items[0];
  const answer: ResearchAnswer = { claims: [], output: { kind: "checklist", items: [
    { id: "requirement", recordId: requirement.id }, { id: "action", recordId: action.id }, { id: "suggestion", suggestion: "Arrange a team review" },
  ] } };
  const edits = { "answer-a:requirement": { done: true, notes: "<script>My note</script>" } };
  const html = render(answer, edits);
  assert.equal((html.match(/Source requirement/g) ?? []).length, 1);
  assert.equal((html.match(/Suggested preparation action/g) ?? []).length, 2);
  assert.equal((html.match(/aria-label="Source:/g) ?? []).length, 2);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.match(html, /&lt;script&gt;My note&lt;\/script&gt;/);
  assert.match(html, /Arrange a team review/);
  const otherOutput = render(answer, edits, "answer-b");
  assert.doesNotMatch(otherOutput, /checked=""|My note/);
  assert.equal(JSON.stringify(result), before);
});

test("one collection renderer shows requested source fields without duplicating other data", () => {
  const record = buildDemoResult().sections.find((section) => section.id === "readiness_checklist")!.items[0];
  const html = render({ claims: [], output: { kind: "collection", title: "Readiness actions", recordIds: [record.id], view: "list", fields: ["text"] } });
  assert.match(html, /Readiness actions/);
  assert.ok(html.includes(record.title));
  assert.ok(html.includes(record.text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;")));
  assert.match(html, /aria-label="Source:/);
  assert.doesNotMatch(html, /Why it’s relevant|Reported differences|Unknowns to resolve|Result view/);
});

test("agent parameters select a record and limit the adjacent detail fields", () => {
  const records = buildDemoResult().sections[1].items.filter((item) => item.kind === "package");
  const output = { kind: "collection" as const, recordIds: records.slice(0, 2).map((item) => item.id), view: "list" as const,
    layout: "split" as const, selectedId: records[0].id, detailFields: ["supplier", "duration"] as ("supplier" | "duration")[] };
  const html = render({ claims: [], output });
  const detail = html.slice(html.indexOf('aria-label="Details"'));
  assert.match(detail, /24 months/);
  assert.match(detail, /Aravinda/);
  assert.match(detail, /aria-label="Source:/);
  assert.doesNotMatch(detail, /<dt>Scope|<dt>Location|<dt>Award value|Why it’s relevant/);
  const listOnly = render({ claims: [], output: { ...output, layout: "list" } });
  assert.doesNotMatch(listOnly, /aria-label="Details"|24 months/);
});

test("a source appears after its first relevant claim and never repeats in later claims or details", () => {
  const record = buildDemoResult().sections.find((section) => section.id === "readiness_checklist")!.items[0];
  const html = render({ claims: [
    { text: "First finding", recordId: record.id, citationIds: record.citationIds },
    { text: "Another finding", recordId: record.id, citationIds: record.citationIds },
  ], output: { kind: "collection", recordIds: [record.id], view: "list", layout: "split", detailFields: ["text", "relevance", "unknowns"] } });
  const marker = html.indexOf('aria-label="Source:');
  assert.ok(marker > html.indexOf("First finding"));
  assert.ok(marker < html.indexOf("Another finding"));
  assert.doesNotMatch(html.slice(html.indexOf("Another finding")), /aria-label="Source:/);
  assert.doesNotMatch(html, /aria-label="Sources"/);
  assert.equal((html.match(/aria-label="Source:/g) ?? []).length, 1);
});

test("a procurement summary does not hide the separate source for its supplier and award", () => {
  const result = buildDemoResult();
  const item = result.sections.flatMap((section) => section.items).find((item) => item.title === "GIS substation upgrade at Tuensang to 132 kV")!;
  const html = render({ claims: [{ text: "A useful substation comparator", recordId: item.id, citationIds: item.citationIds }],
    output: { kind: "collection", recordIds: [item.id], view: "list", layout: "split" } });
  const supplier = html.slice(html.indexOf('>Supplier</dt>'), html.indexOf('>Award value</dt>'));
  assert.match(supplier, /GE T&amp;D India Limited/);
  assert.match(supplier, /aria-label="Source: GIS substation awarded to GE T&amp;D India/);
  assert.equal((html.match(/aria-label="Source:/g) ?? []).length, 2);
});

test("multi-topic answers render separate packages, risks and lessons with unique sources", () => {
  const result = buildDemoResult();
  const procurement = result.sections.flatMap((section) => section.items).find((item) => item.kind === "package")!;
  const findings = result.sections.find((section) => section.id === "risks_and_lessons")!.items;
  const outputs: NonNullable<ResearchAnswer["outputs"]> = [
    { kind: "collection", title: "Procurement packages", recordIds: [procurement.id], view: "list", layout: "split" },
    { kind: "collection", title: "Risks", recordIds: [findings[0].id], view: "list", layout: "list", fields: ["text"] },
    { kind: "collection", title: "Lessons", recordIds: [findings[1].id], view: "list", layout: "list", fields: ["text"] },
  ];
  const html = render({ claims: [], outputs });
  assert.doesNotMatch(html, /<select|Source project|All source projects/);
  const risks = html.indexOf('>Risks<');
  const lessons = html.indexOf('>Lessons<');
  assert.ok(html.indexOf('>Procurement packages<') < risks && risks < lessons);
  assert.ok(html.indexOf(findings[0].title) > risks);
  assert.ok(html.indexOf(findings[1].title) > lessons);
  assert.equal((html.match(/aria-label="Details"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-pressed="true">List/g) ?? []).length, 1);
  assert.equal(outputs[1].kind, "collection");
  if (outputs[1].kind !== "collection") throw new Error("Expected a finding collection");
  const withRepeatedSource = render({ claims: [], outputs: [outputs[1], { ...outputs[1], title: "Same source again" }] });
  assert.equal((withRepeatedSource.match(/aria-label="Source:/g) ?? []).length, 1);
});
