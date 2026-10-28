import assert from "node:assert/strict";
import test from "node:test";
import sample from "../../demo-data/procurement_final.json";
import { adaptResearchResponse, buildDemoResult } from "../services/research";

test("adapter uses only the new response, preserving every item, excerpt and source project", () => {
  const before = JSON.stringify(sample);
  const result = buildDemoResult();
  assert.equal(result.title, sample.title);
  assert.equal(result.sections.length, 7);
  assert.equal(Object.keys(result.citationsById).length, 24);
  assert.deepEqual(result.sections.map((section) => section.items.length), [4, 6, 3, 4, 4, 5, 2]);
  for (const project of sample.citations.projects) {
    for (const section of project.sections) {
      for (const raw of section.passages) {
        const citation = result.citationsById[raw.id];
        assert.equal(citation.text, raw.text);
        assert.deepEqual(citation.mentions, raw.mentions);
        assert.equal(citation.projectId, project.id);
        assert.equal(citation.projectTitle, project.title);
        assert.equal(citation.sourceUrl, "source_url" in raw ? raw.source_url : undefined);
        assert.equal(citation.bronzePath, raw.bronze_path);
        assert.equal("reviewStatus" in citation, false);
        assert.equal("page" in citation, false);
      }
    }
  }
  const rawSections = [{ id: "overview", ...sample.overview }, ...sample.sections];
  for (const rawSection of rawSections) {
    const section = result.sections.find((section) => section.id === rawSection.id)!;
    for (const raw of rawSection.items) {
      const item = section.items.find((item) => item.id === raw.id)!;
      assert.equal(item.text, raw.text);
      assert.deepEqual(item.citationIds, raw.citation_ids);
      for (const id of item.citationIds) assert.ok(result.citationsById[id]);
    }
  }
  result.sections[1].items[0].differences.push("local change");
  result.citationsById["cite_6def679435c47bf2"].mentions.push("local change");
  assert.equal(JSON.stringify(sample), before);
});

test("adapter handles empty/new sections and missing optional provenance without manufacturing evidence", () => {
  const response = {
    title: "New report", overview: { title: "Summary", items: [] },
    sections: [{ id: "new_section", title: "New section", items: [{ id: "one", title: "Question", text: "Check the scope", citation_ids: ["source", "missing", "toString"] }] }],
    citations: { title: "Sources", projects: [{ id: "project", title: "Project", sections: [{ id: "context", title: "Context", passages: [{ id: "source", title: "Passage", text: "Exact source", mentions: [], source_url: "javascript:alert(1)" }] }] }] },
  };
  const result = adaptResearchResponse(response);
  assert.deepEqual(result.sections.map((section) => section.id), ["overview", "new_section"]);
  assert.deepEqual(result.sections[1].items[0].unknowns, []);
  assert.deepEqual(result.sections[1].items[0].projectIds, ["project"]);
  assert.equal(result.citationsById.source.sourceUrl, undefined);
  assert.equal(result.citationsById.source.sourceFile, undefined);
  assert.equal(result.citationsById.missing, undefined);
});

test("malformed responses and duplicate citation IDs produce a useful error", () => {
  assert.throws(() => adaptResearchResponse({}), /Invalid research response/);
  const wrongList = structuredClone(sample);
  Object.assign(wrongList.overview.items[0], { citation_ids: "not a list" });
  assert.throws(() => adaptResearchResponse(wrongList), /list of text/);
  const duplicate = structuredClone(sample);
  duplicate.citations.projects[0].sections[0].passages.push(duplicate.citations.projects[0].sections[0].passages[0]);
  assert.throws(() => adaptResearchResponse(duplicate), /duplicate ID/);
});
