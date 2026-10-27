import type { Evidence } from "@/types/research";
import EvidenceItem from "./EvidenceItem";

interface Props {
  items: Evidence[];
  selectedIds?: string[];
  onSelect?: (id: string) => void;
}

export default function EvidenceList({ items, selectedIds = [], onSelect }: Props) {
  return items.map((item) => (
    <EvidenceItem key={item.id} item={item} selected={selectedIds.includes(item.id)} onSelect={onSelect} />
  ));
}
