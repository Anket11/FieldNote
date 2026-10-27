import type { Evidence, EvidenceKind } from "@/types/research";
import CitationList from "@/components/shared/citations/CitationList";
import ReviewStatus from "@/components/shared/review-status/ReviewStatus";
const kindLabels: Record<EvidenceKind, string> = {
  finding: "Finding", requirement: "Historical requirement", reported_problem: "Reported problem",
  source_lesson: "Source-stated lesson", planning_implication: "Planning implication", gap: "Evidence gap",
};
export default function EvidenceItem({ item, selected, onSelect }: { item: Evidence; selected?: boolean; onSelect?: (id: string) => void }) {
  return <article className="space-y-2 border-b py-4">
    <p>{kindLabels[item.kind]} · {item.level}-level · <ReviewStatus status={item.reviewStatus} /></p>
    <h3>{item.title}</h3>
    <p>{item.text}</p>
    {item.projectId && <p>Project: {item.projectId}</p>}
    {item.kind === "gap" && <p>Not confirmed in reviewed evidence; this does not establish absence elsewhere.</p>}
    {onSelect && <label className="block"><input type="checkbox" checked={selected ?? false} onChange={() => onSelect(item.id)} /> Include {item.title} in draft-review checklist</label>}
    <CitationList citationIds={item.citationIds} />
  </article>;
}
