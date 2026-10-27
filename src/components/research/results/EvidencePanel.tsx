import type { Citation } from "@/types/research";
import ReviewStatus from "@/components/shared/review-status/ReviewStatus";
export default function EvidencePanel({ citation, onClose }: { citation: Citation | null; onClose: () => void }) {
  if (!citation) return null;
  return <aside id="source-evidence" aria-label="Source evidence" className="min-w-0 space-y-3 break-words border-t p-4 lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2>Source evidence</h2><button type="button" onClick={onClose}>Close evidence</button></div>
    <h3>{citation.title}</h3>
    <p><ReviewStatus status={citation.reviewStatus} /> · {citation.level}-level</p>
    <p>Source level: {citation.sourceLevel}</p>
    {citation.projectId && <p>Project: {citation.projectId}</p>}
    {citation.packageId && <p>Package record: {citation.packageId}</p>}
    <p>Page: {citation.page ?? "Not supplied"}</p>
    <p>Record / section locator: {citation.recordLocator ?? "Not supplied"}</p>
    {citation.sourceId && <p>Source ID: {citation.sourceId}</p>}
    {citation.passageId && <p>Passage ID: {citation.passageId}</p>}
    <h4>Exact supporting quotation</h4>
    <blockquote className="m-0 whitespace-pre-wrap">{citation.quote}</blockquote>
    <h4>Limitations</h4><p>{citation.limitation}</p>
    {citation.sourceUrl ? <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open original source (new tab)</a> : <p>Original URL not supplied.</p>}
  </aside>;
}
