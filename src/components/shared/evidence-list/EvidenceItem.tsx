import type { Evidence } from "@/types/research";
import EvidenceDetails from "../evidence-details/EvidenceDetails";
import CitationList from "../citations/CitationList";

interface Props {
  item: Evidence;
  selected?: boolean;
  onSelect?: (id: string) => void;
}
export default function EvidenceItem({ item, selected, onSelect }: Props) {
  return (
    <article className="space-y-2 py-3">
      <details>
        <summary>{item.title}{item.label ? ` · ${item.label}` : ""}</summary>
        <EvidenceDetails item={item} />
      </details>
      <div className="flex flex-wrap gap-3">
        <CitationList item={item} />
        {onSelect && <button type="button" aria-label={`${selected ? "Remove" : "Add"} ${item.title} ${selected ? "from" : "to"} review`} onClick={() => onSelect(item.id)}>{selected ? "Remove from review" : "Add to review"}</button>}
      </div>
    </article>
  );
}
