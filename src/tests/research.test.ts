import assert from "node:assert/strict";
import test from "node:test";
import evidence from "../../demo-data/evidence.json";
import { buildDemoResult, DEMO_QUERY, mapReviewStatus, searchResearch } from "../services/research";

test("adapter preserves quotes, levels, claim review states and every grouped award", () => {
  const result = buildDemoResult();
  assert.equal(result.packages.length, 34);
  assert.equal(result.packages.reduce((sum, item) => sum + item.awardHistory.length, 0), 36);
  assert.equal(result.items.filter((item) => item.kind === "gap").length, 12);
  for (const raw of evidence) {
    const citation = result.citationsById[raw.evidence_id];
    assert.equal(citation.quote, raw.evidence_quote);
    assert.equal(citation.page, raw.source_page ?? undefined);
    assert.equal(citation.sourceUrl, raw.source_url);
    assert.equal(citation.reviewStatus, mapReviewStatus(raw.review_status));
  }
  assert.equal(result.items.filter((item) => item.reviewStatus === "source_checked").length, 20);
  assert.equal(mapReviewStatus("unknown"), "needs_review");
  assert.equal(mapReviewStatus("conflicting"), "conflicting");
  assert.equal(mapReviewStatus("not_confirmed"), "not_confirmed");
  for (const item of result.items.filter((item) => item.kind === "reported_problem")) {
    assert.equal(item.level, "project"); assert.equal(item.packageId, undefined);
  }
  for (const item of [...result.items, ...result.packages]) {
    for (const id of item.citationIds) assert.ok(result.citationsById[id]);
  }
  const nag = result.packages.find((item) => item.id === "P127974:1763281")!;
  assert.equal(nag.reviewStatus, "needs_review");
  assert.equal(nag.awardHistory[0].currency, null);
  assert.equal(nag.awardHistory[0].amount, "8351513.99");
  assert.equal(result.citationsById["reviewed:award_price"].quote, "Signed Contract price\nINR 693401152.00");
});
test("search accepts only the saved scenario, preserving honest empty and invalid states", async () => {
  assert.ok(await searchResearch(`  ${DEMO_QUERY.toUpperCase().replaceAll(" ", "  ")}  `));
  assert.equal(await searchResearch("a different substation"), null);
  await assert.rejects(searchResearch("  "), /Describe your procurement/);
});
