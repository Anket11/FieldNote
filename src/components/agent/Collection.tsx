import styles from "./Collection.module.css";
import { useId, useState, type ReactNode } from "react";
import { List as ListIcon, Map as MapIcon } from "lucide-react";
import SplitView from "./SplitView";
import List, { type ListItem } from "./List";

interface Props {
  items: ListItem[]; title?: string; emptyText?: string;
  initialSelectedId?: string;
  detailLabel?: string;
  renderDetails?: (item: ListItem) => ReactNode;
  initialView?: "list" | "map";
  listLabel?: string; viewLabel?: string;
  renderMap?: (items: ListItem[], selectedId: string, onSelect: (id: string) => void, controlsId?: string) => ReactNode;
}
export default function Collection({ items, title, emptyText = "No items available.", initialView = "list",
  listLabel = "Results", viewLabel = "View", renderMap, renderDetails, detailLabel = "Details", initialSelectedId = "" }: Props) {
  const [view, setView] = useState(initialView);
  const [selectedId, select] = useState(initialSelectedId);
  const detailId = useId();
  const selected = renderDetails ? items.find((item) => item.id === selectedId) ?? items[0] : undefined;
  const activeId = selected?.id ?? selectedId;
  const targetId = renderDetails ? detailId : undefined;
  const content = !items.length ? <p>{emptyText}</p> : view === "map" && renderMap ? renderMap(items, activeId, select, targetId)
    : <List items={items} selectedId={activeId} onSelect={renderDetails ? select : undefined} controlsId={targetId} label={listLabel} />;
  return <section className={styles.root} aria-label={title ?? listLabel}>
    <div className={styles.header}><div className={styles.heading}>{title && <h3>{title}</h3>}<span className={styles.count}>{items.length} {items.length === 1 ? "result" : "results"}</span></div>
    {renderMap && <div className={styles.controls} role="group" aria-label={viewLabel}>
      <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List<ListIcon size={15} aria-hidden="true" /></button>
      <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map<MapIcon size={15} aria-hidden="true" /></button>
    </div>}</div>
    {renderDetails && selected ? <SplitView mapView={view === "map" && !!renderMap} detailId={detailId} detailLabel={detailLabel} detail={renderDetails(selected)}>{content}</SplitView> : content}
  </section>;
}
