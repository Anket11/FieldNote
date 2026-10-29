import { useId, useRef, useState } from "react";
import type { Citation, ResearchResult } from "@/types/research";
import { searchLibrary } from "@/services/librarySearch";
import ChatIcon from "./ChatIcon";
import styles from "./LibrarySearch.module.css";

interface Props { library?: ResearchResult; draft: string; onOpenSource?: (source: Citation) => void }
export default function LibrarySearch({ library, draft, onOpenSource }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const records = open && library ? searchLibrary(query, library) : [];
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  return <div className={styles.root} onKeyDown={(event) => {
    if (event.key === "Escape" && open) { event.stopPropagation(); close(); }
    if (event.key === "Enter") event.stopPropagation();
  }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label="Search library" title="Search library"
      aria-expanded={open} aria-controls={id} onClick={() => { if (open) close(); else { setQuery(draft); setOpen(true); } }}><ChatIcon name="search" /></button>
    {open && <section id={id} className={styles.panel} aria-label="Library search">
      <header><label htmlFor={`${id}-query`}>Search the supplied library</label><button type="button" aria-label="Close library search" onClick={close}><ChatIcon name="close" /></button></header>
      <input id={`${id}-query`} type="search" autoFocus value={query} maxLength={500} placeholder="Search packages, topics, or source text…"
        onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
      <p className={styles.count} role="status">{records.length} matching {records.length === 1 ? "record" : "records"}</p>
      <ul>{records.slice(0, 20).map((record) => {
        const source = record.citationIds.map((id) => library?.citationsById[id]).find(Boolean);
        return <li key={record.id}><button type="button" disabled={!source || !onOpenSource} onClick={() => {
          if (source && onOpenSource) { trigger.current?.focus({ preventScroll: true }); setOpen(false); onOpenSource(source); }
        }}><strong>{record.title}</strong><span>{record.text}</span><small>{source ? "Open source passage" : "No source passage available"}</small></button></li>;
      })}</ul>
      {!records.length && <p className={styles.empty}>No matching records. Try a place name, package reference, or fewer words.</p>}
      {records.length > 20 && <p className={styles.count}>Showing the first 20. Narrow the search to see other records.</p>}
    </section>}
  </div>;
}
