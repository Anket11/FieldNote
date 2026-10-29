import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, StickyNote, Tags, X } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import AnswerNotes from "./AnswerNotes";
import { selectionToolsPosition } from "@/services/selectionTools";
import styles from "./SelectionTools.module.css";
interface Highlight { id: string; text: string; title: string; sourceId?: string; questionId?: string; rect: { left: number; right: number; top: number; bottom: number } }
export default function SelectionTools({ onFollowUp }: { onFollowUp: (text: string) => void }) {
  const { workspace } = useWorkspace();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [mode, setMode] = useState<"note" | "tags" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function readSelection() {
      if (root.current?.contains(document.activeElement)) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) { setHighlight(null); return; }
      const range = selection.getRangeAt(0);
      const element = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      if (!element || element.closest("input, textarea, button, [contenteditable='true'], [hidden], [data-selection-tools]")) return;
      if (element.closest("[data-workspace-id]")?.getAttribute("data-workspace-id") !== workspace.id) { setHighlight(null); return; }
      const text = selection.toString().trim();
      if (!text || text.length > 10000) { setHighlight(null); return; }
      const rect = range.getBoundingClientRect();
      if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) return;
      const source = element.closest<HTMLElement>("[data-source-id]");
      const question = element.closest("[id^='question-']");
      setMode(null);
      setHighlight({ id: crypto.randomUUID(), text, sourceId: source?.dataset.sourceId, title: source?.dataset.annotationTitle ?? "Highlighted text", questionId: question?.id.slice(9), rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } });
    }
    function dismiss(event?: Event) { if (event?.type === "scroll" && event.target instanceof Node && root.current?.contains(event.target)) return; setHighlight(null); setMode(null); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") dismiss(); }
    function pointer(event: PointerEvent) { if (root.current?.contains(event.target as Node)) return; if (window.getSelection()?.isCollapsed) dismiss(); }
    document.addEventListener("selectionchange", readSelection);
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { document.removeEventListener("selectionchange", readSelection); document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [workspace.id]);
  if (!highlight) return null;
  const position = selectionToolsPosition(highlight.rect, { width: innerWidth, height: innerHeight }, !!mode);
  return createPortal(<div ref={root} data-selection-tools className={styles.root} data-placement={position.side} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}>
    <div className={styles.actions} role="group" aria-label="Selected text actions">
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => { onFollowUp(`Explain this passage and its implications, using the available sources:\n\n“${highlight.text}”${highlight.sourceId ? `\nSource: ${highlight.title}` : ""}`); setHighlight(null); }}><MessageSquarePlus size={15} aria-hidden="true" />Ask follow-up</button>
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => setMode("note")}><StickyNote size={15} aria-hidden="true" />Note</button>
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => setMode("tags")}><Tags size={15} aria-hidden="true" />Tag</button>
      <button type="button" aria-label="Dismiss selection tools" onClick={() => setHighlight(null)}><X size={14} aria-hidden="true" /></button>
    </div>
    {mode && <div className={styles.editor}><p className={styles.quote}>{highlight.text}</p><AnswerNotes key={`${highlight.id}-${mode}`} questionId={`highlight-${highlight.id}`} linkedQuestionId={highlight.questionId} sourceId={highlight.sourceId} quote={highlight.text} question={highlight.title} preview="" initialPanel={mode} hideActions /></div>}
  </div>, document.body);
}
