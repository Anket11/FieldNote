import { useId, useState, type ReactNode } from "react";
import { StickyNote, Tags, X } from "lucide-react";
import { normalizeTags, saveNotebookEntry } from "@/services/workspaces";
import { useWorkspace } from "./WorkspaceContext";
import styles from "./WorkspaceTools.module.css";

export default function AnswerNotes({ questionId, question, preview, actions, sourceId, quote, linkedQuestionId, initialPanel = null, hideActions = false }: { questionId: string; question: string; preview: string; actions?: ReactNode; sourceId?: string; quote?: string; linkedQuestionId?: string; initialPanel?: "note" | "tags" | null; hideActions?: boolean }) {
  const { workspace, update } = useWorkspace();
  const entry = workspace.entries.find((item) => item.id === questionId);
  const [panel, setPanel] = useState<"note" | "tags" | null>(initialPanel);
  const [draft, setDraft] = useState(initialPanel === "note" ? entry?.note ?? "" : entry?.tags.join(", ") ?? "");
  const id = useId();
  function open(next: "note" | "tags") { setDraft(next === "note" ? entry?.note ?? "" : entry?.tags.join(", ") ?? ""); setPanel(next); }
  function save() {
    update((current) => {
      const previous = current.entries.find((item) => item.id === questionId);
      return saveNotebookEntry(current, { id: questionId, questionId: sourceId ? undefined : linkedQuestionId ?? (quote ? undefined : questionId), sourceId, quote, title: question, preview, note: panel === "note" ? draft.trim() : previous?.note ?? "", tags: panel === "tags" ? normalizeTags(draft) : previous?.tags ?? [], updatedAt: new Date().toISOString() });
    });
    setPanel(null);
  }
  const knownTags = [...new Set(workspace.entries.flatMap((item) => item.tags))];
  return <div className={styles.annotation}>
    {!hideActions && <div className={styles.answerButtons}>{actions}
      <button type="button" onClick={() => open("note")} aria-expanded={panel === "note"} aria-controls={id}><StickyNote size={16} aria-hidden="true" />{entry?.note ? "Edit note" : "Note"}</button>
      <button type="button" onClick={() => open("tags")} aria-expanded={panel === "tags"} aria-controls={id}><Tags size={16} aria-hidden="true" />{entry?.tags.length ? "Edit tags" : "Add tag"}</button>
    </div>}
    {panel && <form id={id} className={styles.editor} onSubmit={(event) => { event.preventDefault(); save(); }}>
      <label htmlFor={`${id}-input`}>{panel === "note" ? "Your note" : "Tags, separated by commas"}</label>
      {panel === "note" ? <textarea id={`${id}-input`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={10000} placeholder="What matters for your work? Add a thought, decision, or question." />
        : <input id={`${id}-input`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={820} placeholder="e.g. audit, follow-up, budget" />}
      {panel === "tags" && knownTags.length > 0 && <div className={styles.tags}>{knownTags.map((tag) => <button key={tag} type="button" onClick={() => setDraft(normalizeTags(`${draft},${tag}`).join(", "))}>{tag}</button>)}</div>}
      <div className={styles.formActions}><span>Personal to this workspace · saved in this browser</span><button type="button" onClick={() => setPanel(null)}>Cancel</button><button className={styles.primary} type="submit">Save {panel === "note" ? "note" : "tags"}</button></div>
    </form>}
    {!panel && entry && <div className={styles.savedAnnotation}>{entry.note && <p><StickyNote size={14} aria-hidden="true" /><span><strong>Your note</strong>{entry.note}</span></p>}<div className={styles.tags}>{entry.tags.map((tag) => <span key={tag}>{tag}<button type="button" aria-label={`Remove tag ${tag}`} onClick={() => update((current) => saveNotebookEntry(current, { ...entry, tags: entry.tags.filter((item) => item !== tag), updatedAt: new Date().toISOString() }))}><X size={12} aria-hidden="true" /></button></span>)}</div></div>}
  </div>;
}
