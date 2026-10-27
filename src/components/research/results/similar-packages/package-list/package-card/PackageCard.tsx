import type { Package } from "@/types/research";
import CitationList from "@/components/shared/citations/CitationList";
import AwardHistory from "./AwardHistory";
import ReviewStatus from "@/components/shared/review-status/ReviewStatus";
export default function PackageCard({ item, selected, onSelectionChange }: { item: Package; selected: boolean; onSelectionChange: (id: string, selected: boolean) => void }) {
  return <article className="space-y-3 border-b py-4">
    <h3>{item.reference}</h3>
    <label><input type="checkbox" checked={selected} onChange={(event) => onSelectionChange(item.id, event.target.checked)} /> Select {item.reference}</label>
    <p>Project: {item.projectId}{item.location ? ` · ${item.location}` : " · Location not verified"}</p>
    <p>{item.scope}</p>
    {item.matchReasons.map((reason) => <p key={reason}>Match evidence: {reason}</p>)}
    {item.differences.map((difference) => <p key={difference}>Difference / limit: {difference}</p>)}
    <p>Candidate review: <ReviewStatus status={item.reviewStatus} />. Source checked labels below apply only to selected claims.</p>
    <p>Grouping: {item.grouping}</p>
    <CitationList citationIds={item.citationIds} />
    <AwardHistory awards={item.awardHistory} />
  </article>;
}
