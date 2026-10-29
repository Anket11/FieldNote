import styles from "./Checklist.module.css";
import { useId, type ReactNode } from "react";

interface ChecklistEntry {
  id: string; title: ReactNode; description?: ReactNode; context?: ReactNode; sources?: ReactNode;
  done: boolean; notes: string;
}
interface Props {
  items: ChecklistEntry[];
  onChange: (id: string, changes: { done?: boolean; notes?: string }) => void;
  label?: string; emptyText?: string; notesLabel?: string;
}
export default function Checklist({ items, onChange, label = "Checklist", emptyText = "No checklist items available.", notesLabel = "Your notes" }: Props) {
  const fieldId = useId();
  if (!items.length) return <p>{emptyText}</p>;
  return <ol className={styles.root} aria-label={label}>{items.map((item, index) => <li key={item.id} className={styles.item}>
    {item.context && <p>{item.context}</p>}
    <label className={styles.label}><input type="checkbox" checked={item.done} onChange={(event) => onChange(item.id, { done: event.target.checked })} /> {item.title}</label>
    {(item.description || item.sources) && <p>{item.description} {item.sources}</p>}
    <label className={styles.notes} htmlFor={`${fieldId}-${index}`}>{notesLabel}</label>
    <textarea id={`${fieldId}-${index}`} className={styles.input} rows={2} value={item.notes} onChange={(event) => onChange(item.id, { notes: event.target.value })} />
  </li>)}</ol>;
}
