import { formatSourceText, isStructuredSource } from "@/services/sourceText";
import ChatIcon from "../../app/ChatIcon";
import styles from "./SourceCitation.module.css";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WorkspaceContext } from "../../app/WorkspaceContext";
import SourceAnnotations from "../../app/SourceAnnotations";
import { sourcePlacement } from "./sourcePlacement";

interface CitationSource {
  id: string; title: string; text: string; excerpts?: string[];
  context?: string; fileName?: string; url?: string;
}
export default function SourceCitation({ source }: { source: CitationSource }) {
  const workspace = useContext(WorkspaceContext);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef(false);
  const [position, setPosition] = useState<ReturnType<typeof sourcePlacement> | null>(null);
  const open = position !== null;
  function cancelClose() { if (timer.current) clearTimeout(timer.current); }
  function show() {
    cancelClose();
    if (!trigger.current) return;
    document.dispatchEvent(new CustomEvent("source-preview-open", { detail: id }));
    setPosition(sourcePlacement(trigger.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }));
  }
  function leave() {
    cancelClose();
    if (!keyboard.current && !preview.current?.contains(document.activeElement) && !window.getSelection()?.toString()) timer.current = setTimeout(() => setPosition(null), 160);
  }
  function blur(event: React.FocusEvent) {
    const target = event.relatedTarget;
    if (target instanceof Node && (trigger.current?.contains(target) || preview.current?.contains(target))) return;
    keyboard.current = false;
    cancelClose();
    setPosition(null);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !preview.current?.contains(event.target)) setPosition(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      trigger.current?.focus({ preventScroll: true });
      keyboard.current = false;
      setPosition(null);
    }
    function otherOpened(event: Event) { if ((event as CustomEvent<string>).detail !== id) setPosition(null); }
    function reposition() {
      if (trigger.current) setPosition(sourcePlacement(trigger.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }));
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    document.addEventListener("source-preview-open", otherOpened);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("source-preview-open", otherOpened);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, id]);
  const text = open ? formatSourceText(source.text) : "";
  const excerpts = !open || isStructuredSource(source.text) ? [] : source.excerpts?.map(formatSourceText).filter(Boolean);
  const url = source.url && /^https?:\/\//i.test(source.url) ? source.url : undefined;
  return <>
    <button ref={trigger} type="button" aria-label={`Source: ${source.title}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      className={styles.trigger}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") { keyboard.current = false; show(); } }} onPointerLeave={(event) => { if (event.pointerType !== "touch") leave(); }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) { keyboard.current = true; show(); } }} onBlur={blur}
      onKeyDown={(event) => {
        if (open && event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          preview.current?.querySelector<HTMLElement>("button, a, [tabindex='0']")?.focus();
        }
      }}
      onClick={(event) => { event.stopPropagation(); show(); }}>
      <ChatIcon name="document" />
    </button>
    {position && createPortal(<div ref={preview} id={id} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} data-placement={position.side} data-workspace-id={workspace?.workspace.id} data-source-id={source.id} data-annotation-title={source.title}
      className={styles.preview}
      style={{ left: position.left, top: position.top, width: position.width, height: position.height }}
      onPointerEnter={cancelClose} onPointerLeave={(event) => { if (event.pointerType !== "touch") leave(); }} onFocusCapture={(event) => { cancelClose(); keyboard.current = event.target.matches(":focus-visible"); }} onBlur={blur}>
      <header className={styles.header}>
        <div className={styles.title}><h3 id={`${id}-title`}>{source.title}</h3>
          <button type="button" className={styles.close} aria-label="Close source preview" onClick={() => { trigger.current?.focus({ preventScroll: true }); keyboard.current = false; setPosition(null); }}><ChatIcon name="close" /></button>
        </div>
        {source.context && <p>{source.context}</p>}{source.fileName && <p>{source.fileName}</p>}
        {url ? <a href={url} target="_blank" rel="noreferrer">Open source ↗</a> : <p>Source link unavailable.</p>}
      </header>
      <div className={styles.annotations}><SourceAnnotations id={source.id} title={source.title} text={text} /></div>
      <div className={styles.passage} tabIndex={0} aria-label="Source passage">
        {excerpts?.length ? <>
          {excerpts.map((excerpt, index) => <blockquote key={index} className={styles.text}>{excerpt}</blockquote>)}
          <details><summary>Full source passage</summary><p className={styles.text}>{text}</p></details>
        </> : <p className={styles.text}>{text}</p>}
      </div>
    </div>, document.body)}
  </>;
}
