import { useContext, useEffect, useRef, type ReactNode } from "react";
import { formatSourceText } from "@/services/sourceText";
import type { Citation } from "@/types/research";
import styles from "./DocumentReader.module.css";
import { WorkspaceContext } from "../WorkspaceContext";
import SourceAnnotations from "../SourceAnnotations";
import ChatIcon from "../ChatIcon";

interface Props {
  source: Citation;
  onClose: () => void;
  children?: ReactNode;
}

export default function DocumentReader({ source, onClose, children }: Props) {
  const workspace = useContext(WorkspaceContext);
  const root = useRef<HTMLElement>(null);
  useEffect(() => { root.current?.focus({ preventScroll: true }); }, [source.id]);
  const url = source.sourceUrl && /^https?:\/\//i.test(source.sourceUrl) ? source.sourceUrl : undefined;
  return <section className={styles.root} ref={root} tabIndex={-1} aria-label="Document reader" data-component="DocumentReader" data-workspace-id={workspace?.workspace.id} data-source-id={source.id} data-annotation-title={source.title}
    onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
    <header className={styles.header}>
      <span className={styles.document}><ChatIcon name="document" /></span>
      <h3>{source.title}</h3>
      <button className={styles.close} type="button" aria-label="Close document" title="Close document" onClick={onClose}><ChatIcon name="close" /><span className={styles.srOnly}>Close document</span></button>
      <p className={styles.meta}>{source.projectTitle} ({source.projectId})</p>
      {source.sourceFile && <p className={styles.meta}>{source.sourceFile}</p>}
      {url ? <a className={styles.original} href={url} target="_blank" rel="noreferrer">Open original document <ChatIcon name="external" /></a> : <p className={styles.meta}>Original document link unavailable.</p>}
    </header>
    <div className={styles.annotations}><SourceAnnotations id={source.id} title={source.title} text={formatSourceText(source.text)} /></div>
    <div className={styles.content} role="region" aria-label="Document content" tabIndex={0}>
      {children ?? <blockquote>{formatSourceText(source.text)}</blockquote>}
    </div>
  </section>;
}
