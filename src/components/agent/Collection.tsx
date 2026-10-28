import { useId, useMemo, useState, type ReactNode } from "react";
import SplitView from "./SplitView";
import List, { type ListItem } from "./List";

interface CollectionItem extends ListItem { groupIds?: string[] }
interface Props {
  items: CollectionItem[]; title?: string; emptyText?: string;
  initialSelectedId?: string;
  detailLabel?: string;
  renderDetails?: (item: CollectionItem) => ReactNode;
  initialView?: "list" | "map"; initialFilter?: string;
  filters?: { id: string; label: string }[]; filterLabel?: string; allLabel?: string;
  listLabel?: string; viewLabel?: string;
  onFilterChange?: (id: string) => void;
  renderMap?: (items: CollectionItem[], selectedId: string, onSelect: (id: string) => void, controlsId?: string) => ReactNode;
}
export default function Collection({ items, title, emptyText = "No items match this result and filter.", initialView = "list", initialFilter = "", filters,
  filterLabel = "Filter", allLabel = "All", listLabel = "Results", viewLabel = "View", onFilterChange, renderMap, renderDetails, detailLabel = "Details", initialSelectedId = "" }: Props) {
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState(initialFilter);
  const [selectedId, select] = useState(initialSelectedId);
  const detailId = useId();
  const visible = useMemo(() => items.filter((item) => !filter || item.groupIds?.includes(filter)), [items, filter]);
  const selected = renderDetails ? visible.find((item) => item.id === selectedId) ?? visible[0] : undefined;
  const activeId = selected?.id ?? selectedId;
  const targetId = renderDetails ? detailId : undefined;
  const content = !visible.length ? <p>{emptyText}</p> : view === "map" && renderMap ? renderMap(visible, activeId, select, targetId)
    : <List items={visible} selectedId={activeId} onSelect={renderDetails ? select : undefined} controlsId={targetId} label={listLabel} />;
  return <section className="space-y-3" aria-label={title ?? listLabel}>
    {title && <h3>{title}</h3>}
    {filters && <label>{filterLabel} <select value={filter} onChange={(event) => {
      setFilter(event.target.value); onFilterChange?.(event.target.value);
    }}><option value="">{allLabel}</option>{filters.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
    {renderMap && <div className="flex gap-3" role="group" aria-label={viewLabel}>
      <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
      <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
    </div>}
    {renderDetails && selected ? <SplitView detailId={detailId} detailLabel={detailLabel} detail={renderDetails(selected)}>{content}</SplitView> : content}
  </section>;
}
