import rawEvidence from "../../demo-data/evidence.json";
import rawPackages from "../../demo-data/procurements.json";
import rawGaps from "../../demo-data/gaps.json";
import coverage from "../../demo-data/coverage.json";
import scenario from "../../demo-data/query.json";
import type { Evidence, EvidenceKind, Level, ResearchResult, ReviewState, Tab } from "../types/research";

export const DEMO_QUERY = scenario.query;
export const reviewLabels: Record<ReviewState, string> = {
  source_checked: "Source checked", needs_review: "Needs review",
  not_confirmed: "Not confirmed", conflicting: "Conflicting evidence",
};
export function mapReviewStatus(status: string): ReviewState {
  switch (status) {
    case "source_checked_selected_claim": return "source_checked";
    case "conflicting": return "conflicting";
    case "not_confirmed": return "not_confirmed";
    default: return "needs_review";
  }
}
const normalize = (query: string) => query.trim().replace(/\s+/g, " ").toLowerCase();
const nagId = "P127974:1763281";
const historicalLimit = "Historical evidence only. Effective date, actual completion and final paid cost remain unconfirmed. Separate supply/services contracts appear in tender conditions; award-feed amounts have no verified currency and must not be substituted for the published notice price.";

export function buildDemoResult(): ResearchResult {
  const citationsById: ResearchResult["citationsById"] = {};
  const items: Evidence[] = rawEvidence.map((row) => {
    const reviewStatus = mapReviewStatus(row.review_status);
    const level: Level = row.evidence_level === "package" ? "package" : row.project_id ? "project" : "general";
    const tab: Tab = row.section === "tender_preparation" ? "requirements" : row.section === "risks_and_lessons" ? "risks" : "overview";
    const kind: EvidenceKind = tab === "requirements" ? "requirement" : row.basis === "reported_project_finding" ? "reported_problem" : "finding";
    citationsById[row.evidence_id] = {
      id: row.evidence_id, sourceId: row.source_id ?? undefined, title: row.source_file,
      quote: row.evidence_quote, reviewStatus, level, sourceLevel: row.evidence_level,
      projectId: row.project_id, packageId: row.package_id ?? undefined,
      page: row.source_page ?? undefined, recordLocator: row.source_locator ?? row.fact_id ?? undefined,
      passageId: row.passage_id ?? undefined, sourceUrl: row.source_url,
      limitation: [reviewStatus === "source_checked" ? "Only this selected claim was source checked; this does not validate the whole document or package." : "Selected interpretation of a saved Silver quotation; original-source review is still required.",
        level === "project" ? "Project/asset context only; no supplier or package root cause is established." : "Do not assume these historical terms apply to the proposed purchase.",
        row.project_id === "P127974" ? historicalLimit : "Partial retrieval; evidence may be incomplete."].join(" "),
    };
    return {
      id: row.evidence_id, kind, title: row.topic.replaceAll("_", " "),
      text: row.evidence_id === "reviewed:award_price" ? `Published signed price: INR ${row.finding} (NAG-SS-02A); not final paid cost or a forecast.` : row.finding,
      level, projectId: row.project_id, packageId: row.package_id ?? undefined,
      reviewStatus, citationIds: [row.evidence_id], tab,
    };
  });
  const implications: Record<string, string> = {
    haryana_implementation_problems: "Review right-of-way readiness, delivery capacity and dependencies before setting the proposed procurement sequence.",
    jharkhand_interface_delay: "Review substation and connecting-line interface milestones together before tendering.",
    andhra_closeout_gap: "Identify the completion and close-out records the proposed contract will need.",
    powergrid_cost_context: "Keep project loan savings separate from package price examples when planning a budget.",
    ner_scope_revision: "Review survey readiness and scope boundaries before fixing quantities.",
  };
  for (const row of rawEvidence) {
    if (implications[row.topic]) items.push({
      id: `implication:${row.evidence_id}`, kind: "planning_implication", title: "Planning implication",
      text: `${implications[row.topic]} This is a demo planning interpretation, not a source quotation or source-stated lesson.`,
      level: "project", projectId: row.project_id, reviewStatus: "needs_review", citationIds: [row.evidence_id], tab: "risks",
    });
  }
  const packages = rawPackages.map((row) => {
    const isNag = row.comparison_id === nagId;
    const awardHistory = row.award_history.map((award) => {
      const citationId = `award:${award.project_id}:${award.contract_id}`;
      citationsById[citationId] = {
        id: citationId, title: `Saved award record: ${award.reference}`, quote: award.description,
        reviewStatus: "needs_review", level: "package", sourceLevel: "structured award record",
        projectId: row.project_id, packageId: row.comparison_id, recordLocator: award.silver_lookup,
        limitation: "Saved candidate record, not original-document verification. The excerpt is the exact award description. Reported currency and actual completion are unconfirmed. " + row.grouping_basis,
      };
      return { id: award.contract_id, reference: award.reference, description: award.description,
        signedDate: award.signed_date, suppliers: award.suppliers, amount: award.reported_amount,
        currency: award.reported_currency, citationId };
    });
    return {
      id: row.comparison_id, reference: isNag ? `NAG-SS-02A · ${row.primary_reference}` : row.primary_reference,
      projectId: row.project_id, location: isNag ? "Tuensang, Nagaland" : undefined, scope: row.description,
      matchReasons: isNag ? ["Selected scope evidence establishes a 132/33 kV substation upgrade and turnkey civil works."] : ["Candidate from saved award descriptions; inspect the quoted scope before treating it as comparable.", ...(row.turnkey_status === "explicit_in_award_description" ? ["Turnkey is explicitly mentioned in the award description (needs review)."] : [])],
      differences: [isNag ? "Full connecting-line scope is not established. Altitude is 1186 m; slope classification is unverified." : "Hilly terrain and complete combined substation/line scope are not verified.", "Actual completion and final paid cost are not confirmed."],
      citationIds: [...awardHistory.map((award) => award.citationId), ...(isNag ? ["reviewed:scope", "reviewed:turnkey", "reviewed:altitude", "reviewed:award_price", "reviewed:duration"] : [])],
      reviewStatus: "needs_review" as const, grouping: row.grouping_basis, awardHistory,
    };
  });
  for (const gap of rawGaps) items.push({
    id: gap.gap_id, kind: "gap", title: gap.item,
    text: `${gap.status}. ${gap.why_it_matters} Next evidence check: ${gap.next_evidence_check}`,
    level: "general", reviewStatus: gap.gap_id === "G10" ? "conflicting" : "not_confirmed", citationIds: [], tab: "overview",
  });
  return { items, packages, citationsById,
    coverage: `${coverage.cached_unique_fact_candidates} cached fact candidates were available out of ${coverage.silver_total_facts} Silver facts. ${coverage.selected_evidence_items} selected items; ${coverage.selected_source_checked_claims} selected claims source checked, 20 need review. ${coverage.coverage_type}. Live full-dataset search did not complete.` };
}
export async function searchResearch(query: string): Promise<ResearchResult | null> {
  if (!query.trim()) throw new Error("Describe your procurement before searching.");
  return normalize(query) === normalize(DEMO_QUERY) ? buildDemoResult() : null;
}
