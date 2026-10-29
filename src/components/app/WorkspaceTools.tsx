import { useId, useState } from "react";
import { ArrowUpRight, BookOpen, CheckSquare, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { normalizeTags, saveNotebookEntry } from "@/services/workspaces";
import { useWorkspace } from "./WorkspaceContext";
import styles from "./WorkspaceTools.module.css";

export function Notebook({ onOpenAnswer, onOpenSource }: { onOpenAnswer: (id: string) => void; onOpenSource?: (id: string) => void }) {
  const { workspace, update } = useWorkspace();
  const formId = useId();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const allTags = [...new Set(workspace.entries.flatMap((item) => item.tags))].sort();
  const entries = workspace.entries.filter((entry) => (!filter || entry.tags.includes(filter)) && `${entry.title} ${entry.note} ${entry.preview} ${entry.quote ?? ""} ${entry.tags.join(" ")}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const editor = editing && <form className={styles.editor} onSubmit={(event) => { event.preventDefault(); const previous = workspace.entries.find((item) => item.id === editing); update((current) => saveNotebookEntry(current, { id: previous?.id ?? crypto.randomUUID(), questionId: previous?.questionId, sourceId: previous?.sourceId, quote: previous?.quote, title: previous?.questionId ? previous.title : title.trim() || "Untitled note", preview: previous?.preview ?? "", note: note.trim(), tags: normalizeTags(tags), updatedAt: new Date().toISOString() })); setEditing(null); }}>
      <label htmlFor={`${formId}-title`}>Title</label><input id={`${formId}-title`} value={title} disabled={!!workspace.entries.find((item) => item.id === editing)?.questionId} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
      <label htmlFor={`${formId}-note`}>Your note</label><textarea id={`${formId}-note`} value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={10000} />
      <label htmlFor={`${formId}-tags`}>Tags, separated by commas</label><input id={`${formId}-tags`} value={tags} onChange={(event) => setTags(event.target.value)} maxLength={820} />
      <div className={styles.formActions}><button type="button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className={styles.primary} disabled={!note.trim() && !normalizeTags(tags).length}>Save note</button></div>
    </form>;
  return <section className={styles.tools} aria-label="Workspace notebook">
    <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>YOUR WORKING KNOWLEDGE</p><h2>Notebook</h2><p>Keep the findings, questions, and ideas that matter.</p></div><button type="button" className={styles.primary} onClick={() => { setEditing("new"); setTitle(""); setNote(""); setTags(""); }}><Plus size={16} aria-hidden="true" />New note</button></div>
    <div className={styles.search}><Search size={17} aria-hidden="true" /><input aria-label="Search notebook" placeholder="Search notes, questions, and tags" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <div className={styles.tags}><button type="button" aria-pressed={!filter} onClick={() => setFilter("")}>All notes · {workspace.entries.length}</button>{allTags.map((tag) => <button key={tag} type="button" aria-pressed={filter === tag} onClick={() => setFilter(tag)}>{tag}</button>)}</div>
    {editing === "new" && editor}
    {!entries.length && <div className={styles.empty}><BookOpen size={28} aria-hidden="true" /><h3>{workspace.entries.length ? "No matching notes" : "Make the research your own."}</h3><p>{workspace.entries.length ? "Try another search or tag." : "Add a note or tag beneath any answer, or start a standalone note here."}</p></div>}
    <div className={styles.entries}>{entries.map((entry) => <article key={entry.id} className={styles.entry}><div className={styles.entryMeta}><StickyNote size={15} aria-hidden="true" /><span>{entry.sourceId ? "Source annotation" : entry.quote ? "Highlighted text" : entry.questionId ? "From your research" : "Personal note"}</span><time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleDateString()}</time></div><h3>{entry.title}</h3>{entry.quote && <blockquote className={styles.note}>{entry.quote}</blockquote>}{entry.preview && !entry.quote && <p className={styles.preview}>{entry.preview}</p>}{editing === entry.id ? editor : entry.note && <p className={styles.note}>{entry.note}</p>}<div className={styles.tags}>{entry.tags.map((tag) => <button key={tag} type="button" onClick={() => setFilter(tag)}>{tag}</button>)}</div><div className={styles.entryActions}>{entry.sourceId && onOpenSource && <button type="button" onClick={() => onOpenSource(entry.sourceId!)}>Open source <ArrowUpRight size={15} aria-hidden="true" /></button>}{entry.questionId && <button type="button" onClick={() => onOpenAnswer(entry.questionId!)}>Open answer <ArrowUpRight size={15} aria-hidden="true" /></button>}{editing !== entry.id && <button type="button" onClick={() => { setEditing(entry.id); setTitle(entry.title); setNote(entry.note); setTags(entry.tags.join(", ")); }}>Edit note</button>}</div></article>)}</div>
  </section>;
}

export function WorkspacePlan() {
  const { workspace, update } = useWorkspace();
  const [text, setText] = useState("");
  const complete = workspace.tasks.filter((task) => task.done).length;
  return <section className={styles.tools} aria-label="Workspace plan"><div className={styles.sectionHeader}><div><p className={styles.eyebrow}>FROM RESEARCH TO ACTION</p><h2>Plan your work</h2><p>{workspace.tasks.length ? `${complete} of ${workspace.tasks.length} tasks complete` : "A simple place to keep track of what comes next."}</p></div></div>
    <form className={styles.taskForm} onSubmit={(event) => { event.preventDefault(); if (!text.trim()) return; update((current) => ({ ...current, tasks: [...current.tasks, { id: crypto.randomUUID(), text: text.trim(), done: false }] })); setText(""); }}><input aria-label="New task" placeholder="What needs to happen next?" maxLength={500} value={text} onChange={(event) => setText(event.target.value)} /><button type="submit" className={styles.primary} disabled={!text.trim()}><Plus size={16} aria-hidden="true" />Add task</button></form>
    {!workspace.tasks.length && <div className={styles.empty}><CheckSquare size={28} aria-hidden="true" /><h3>A clearer next step.</h3><p>Track checks, decisions, and follow-ups across everything in this workspace.</p></div>}
    <ul className={styles.tasks}>{workspace.tasks.map((task) => <li key={task.id} data-done={task.done}><label><input type="checkbox" checked={task.done} onChange={(event) => update((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, done: event.target.checked } : item) }))} /><span>{task.text}</span></label><button type="button" aria-label={`Remove task: ${task.text}`} onClick={() => update((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}><Trash2 size={16} aria-hidden="true" /></button></li>)}</ul>
  </section>;
}
