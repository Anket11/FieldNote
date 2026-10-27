import type { Evidence } from "@/types/research";
import PackageRow from "./PackageRow";

interface Props {
  items: Evidence[];
  selectedIds: string[];
  onSelectionChange: (id: string, selected: boolean) => void;
}
export default function PackageTable({ items, selectedIds, onSelectionChange }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <caption>Comparable packages</caption>
        <thead><tr>{["Select", "Package", "Scope", "Main difference", "Details"].map((label) => <th key={label} scope="col" className="p-2 text-left">{label}</th>)}</tr></thead>
        {items.map((item) => <PackageRow key={item.id} item={item} selected={selectedIds.includes(item.id)} onSelectionChange={onSelectionChange} />)}
      </table>
    </div>
  );
}
