import type { ReactNode } from "react";

export interface ListItem { id: string; title: ReactNode; content?: ReactNode; meta?: ReactNode }
interface Props {
  items: ListItem[];
  label?: string;
  emptyText?: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  controlsId?: string;
  className?: string;
}
export default function List({ items, label = "Results", emptyText = "No items available.", selectedId, onSelect, controlsId, className = "space-y-3" }: Props) {
  if (!items.length) return <p>{emptyText}</p>;
  return <ul className={className} aria-label={label}>{items.map((item) => <li key={item.id}>
    {onSelect && !item.content ? <>
      <button type="button" className={`text-left ${selectedId === item.id ? "font-semibold" : ""}`} aria-pressed={selectedId === item.id}
        aria-controls={controlsId} onClick={() => onSelect(item.id)}>{item.title}</button>
      {item.meta}
    </> : item.content ? <details><summary>{item.title} {item.meta}</summary>{item.content}</details>
      : <>{item.title} {item.meta}</>}
  </li>)}</ul>;
}
