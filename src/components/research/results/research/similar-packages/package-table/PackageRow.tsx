import { useState } from "react";
import type { Evidence } from "@/types/research";
import EvidenceDetails from "@/components/shared/evidence-details/EvidenceDetails";
import CitationList from "@/components/shared/citations/CitationList";

interface Props {
  item: Evidence;
  selected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
}
export default function PackageRow({ item, selected, onSelectionChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <tbody>
      <tr>
        <td className="p-2 align-top"><input type="checkbox" aria-label={`Select ${item.title}`} checked={selected} onChange={(event) => onSelectionChange(item.id, event.target.checked)} /></td>
        <th scope="row" className="p-2 text-left align-top">{item.title}</th>
        <td className="p-2 align-top">{item.text}</td>
        <td className="p-2 align-top">{item.differences[0] ?? "Not specified"}</td>
        <td className="p-2 align-top"><button type="button" aria-expanded={expanded} aria-controls={`package-${item.id}`} aria-label={`${expanded ? "Hide" : "View"} details for ${item.title}`} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide" : "View"}</button></td>
      </tr>
      <tr id={`package-${item.id}`} hidden={!expanded}>
        <td colSpan={5} className="space-y-3 p-3">
          <EvidenceDetails item={item} />
          <CitationList item={item} />
        </td>
      </tr>
    </tbody>
  );
}
