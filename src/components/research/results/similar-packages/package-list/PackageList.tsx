import type { Package } from "@/types/research";
import PackageCard from "./package-card/PackageCard";

interface Props {
  items: Package[];
  selectedIds: string[];
  onSelectionChange: (id: string, selected: boolean) => void;
}

export default function PackageList({ items, selectedIds, onSelectionChange }: Props) {
  return items.map((item) => (
    <PackageCard key={item.id} item={item} selected={selectedIds.includes(item.id)} onSelectionChange={onSelectionChange} />
  ));
}
