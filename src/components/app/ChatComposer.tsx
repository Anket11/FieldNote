import styles from "./ChatComposer.module.css";
import { useId } from "react";
import { ArrowUpRight, BookOpen, FileCheck2, Layers3, Network } from "lucide-react";

import { DEMO_QUERY } from "@/services/demoQuery";
import ChatIcon from "./ChatIcon";
import LibrarySearch from "./LibrarySearch";
import type { Citation, ResearchResult } from "@/types/research";

interface Props {
  welcome?: boolean;
  value: string; onChange: (value: string) => void; onSend: () => void;
  running: boolean; ready: boolean;
  onStop?: () => void;
  library?: ResearchResult; onOpenSource?: (source: Citation) => void;
}
export default function ChatComposer({ value, onChange, onSend, running, ready, onStop, library, onOpenSource, welcome = false }: Props) {
  const id = useId();
  return <div className={styles.shell} data-welcome={welcome}>
    {welcome && <div className={styles.welcome}><span className={styles.welcomeMark}><Network size={24} aria-hidden="true" /></span><p className={styles.eyebrow}>YOUR RESEARCH WORKSPACE</p><h2>Every decision starts<br />with a better question.</h2><p>Find comparable projects, uncover the context,<br className={styles.desktopBreak} /> and keep the evidence close.</p></div>}
    <form className={styles.root} onSubmit={(event) => { event.preventDefault(); onSend(); }}>
    <label className={styles.label} htmlFor={id}>Ask about procurement</label>
    <div className={styles.inputRow}><textarea id={id} className={styles.input} rows={welcome ? 2 : 1} value={value}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (ready && !running && value.trim()) onSend();
        }
      }}
      onChange={(event) => onChange(event.target.value)} placeholder={welcome ? "What would you like to research?" : "Ask a follow-up or research a new question…"} required />
      {running && onStop ? <button className={styles.send} type="button" aria-label="Stop generating" title="Stop generating" onClick={onStop}><ChatIcon name="stop" /></button>
        : <button className={styles.send} type="submit" aria-label="Send" title="Send · Enter" disabled={!ready || running || !value.trim()}><ChatIcon name="send" /></button>}
    </div>
    <div className={styles.actions}>
      <button className={styles.example} type="button" disabled={running} onClick={() => onChange(DEMO_QUERY)}><ChatIcon name="sparkle" /> Use example query</button>
      <LibrarySearch library={library} draft={value} onOpenSource={onOpenSource} />
    </div>
  </form>
    {welcome && <><div className={styles.starters} aria-label="Research starting points">{[
      { icon: Layers3, title: "Find comparable packages", text: "Start with a relevant precedent", query: DEMO_QUERY },
      { icon: FileCheck2, title: "Review requirements", text: "Understand what the sources require", query: "What technical qualification requirements apply to 132 kV substation and transmission line packages in the supplied library? Cite the source passages." },
      { icon: BookOpen, title: "Learn from past projects", text: "Bring lessons into your planning", query: "What lessons in the supplied library should inform procurement planning for a substation in hilly terrain? Distinguish documented requirements from interpretation and cite sources." },
    ].map(({ icon: Icon, title, text, query }) => <button key={title} type="button" onClick={() => onChange(query)} disabled={running}><Icon size={20} aria-hidden="true" /><strong>{title}</strong><span>{text}</span><ArrowUpRight className={styles.starterArrow} size={16} aria-hidden="true" /></button>)}</div><p className={styles.libraryNote}><span /> Researching the supplied demo library <span aria-hidden="true">·</span> Sources you can inspect</p></>}
  </div>;
}
