import { useEffect, useRef } from "react";
import type { Citation } from "@/types/research";

interface Props {
  citation: Citation;
  title: string;
  citations: Citation[];
  onCitationChange: (id: string) => void;
  onClose: () => void;
}
export default function EvidencePanel({ citation, title, citations, onCitationChange, onClose }: Props) {
  const panel = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    panel.current?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
    if (!window.matchMedia("(min-width: 64rem)").matches) window.scrollTo(0, 0);
  }, [citation.id]);
  return (
    <aside ref={panel} id="source-evidence" aria-label="Source evidence" className="min-w-0 space-y-3 break-words p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:w-96 lg:shrink-0 lg:overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1}>Source evidence</h2>
        <button type="button" onClick={onClose}><span className="lg:hidden">Back to finding</span><span className="hidden lg:inline">Close evidence</span></button>
      </div>
      {title && <p>Evidence for: {title}</p>}
      {citations.length > 1 && <label className="block">Source <select className="max-w-full" value={citation.id} onChange={(event) => onCitationChange(event.target.value)}>
        {citations.map((source, index) => <option key={source.id} value={source.id}>{index + 1}. {source.title}</option>)}
      </select></label>}
      <h3>{citation.title}</h3>
      {citation.mentions.length > 0 && <section>
        <h4>Supporting excerpts</h4>
        {citation.mentions.map((mention, index) => <blockquote key={index} className="m-0 whitespace-pre-wrap py-2">{mention}</blockquote>)}
      </section>}
      <p>{citation.projectTitle} ({citation.projectId})</p>
      {citation.sourceFile && <p>{citation.sourceFile}</p>}
      <details open={citation.mentions.length === 0}>
        <summary>Full source passage</summary>
        <pre className="whitespace-pre-wrap break-words">{citation.text}</pre>
      </details>
      {citation.sourceUrl ? <a href={citation.sourceUrl} target="_blank" rel="noreferrer">Open original source (new tab)</a> : <p>Original source link not available.</p>}
      {citation.bronzePath && <details><summary>Source provenance</summary><p>{citation.bronzePath}</p></details>}
    </aside>
  );
}
