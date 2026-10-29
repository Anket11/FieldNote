import { useId, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ConversationNavigation.module.css";

interface Props {
  questions: { id: string; label: string }[];
  activeId?: string;
  onSelect: (id: string) => void;
}

export default function ConversationNavigation({ questions, activeId, onSelect }: Props) {
  const tooltipId = useId();
  const [preview, setPreview] = useState<{ id: string; label: string; top: number; right: number } | null>(null);
  if (!questions.length) return null;
  const activeIndex = questions.findIndex((question) => question.id === activeId);
  function show(button: HTMLButtonElement, question: Props["questions"][number]) {
    const bounds = button.getBoundingClientRect();
    setPreview({ ...question, top: Math.max(12, Math.min(bounds.top, window.innerHeight - 100)), right: window.innerWidth - bounds.left + 20 });
  }
  return <nav className={styles.root} aria-label={`Questions in this conversation (${questions.length})`} data-component="ConversationNavigation" onPointerLeave={() => setPreview(null)}>
    <ol onScroll={() => setPreview(null)}>{questions.map((question, index) => <li key={question.id}>
      <button type="button" aria-label={`Go to ${question.label}`} aria-current={question.id === activeId ? "location" : undefined}
        aria-describedby={preview?.id === question.id ? tooltipId : undefined} data-near-active={activeIndex >= 0 && Math.abs(index - activeIndex) === 1}
        onPointerEnter={(event) => { if (event.pointerType !== "touch") show(event.currentTarget, question); }}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget, question); }}
        onBlur={() => setPreview(null)} onKeyDown={(event) => { if (event.key === "Escape") setPreview(null); }}
        onClick={() => { setPreview(null); onSelect(question.id); }}>
        <span className={styles.marker} aria-hidden="true" />
      </button>
    </li>)}</ol>
    {preview && createPortal(<div id={tooltipId} role="tooltip" className={styles.tooltip} style={{ top: preview.top, right: preview.right }}>{preview.label}</div>, document.body)}
  </nav>;
}
