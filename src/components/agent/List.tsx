import styles from "./List.module.css";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface ListItem { id: string; title: ReactNode; content?: ReactNode; meta?: ReactNode; description?: string }
interface Props {
  items: ListItem[];
  label?: string;
  emptyText?: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  controlsId?: string;
  className?: string;
}
export default function List({ items, label = "Results", emptyText = "No items available.", selectedId, onSelect, controlsId, className = "" }: Props) {
  if (!items.length) return <p>{emptyText}</p>;
  return <ul className={`${styles.root} ${className}`} aria-label={label}>{items.map((item, index) => <li key={item.id} className={styles.item}>
    {onSelect && !item.content ? <>
      <button type="button" className={styles.label} aria-pressed={selectedId === item.id}
        aria-controls={controlsId} onClick={() => onSelect(item.id)}><span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className={styles.copy}><span>{item.title}</span>{item.description && <span className={styles.description}>{item.description}</span>}</span><ChevronRight size={16} className={styles.chevron} aria-hidden="true" /></button>
      {item.meta}
    </> : item.content ? <details><summary>{item.title} {item.meta}</summary>{item.content}</details>
      : <>{item.title} {item.meta}</>}
  </li>)}</ul>;
}
