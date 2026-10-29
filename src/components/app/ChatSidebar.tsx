import { useId, useRef } from "react";
import ChatIcon from "./ChatIcon";
import styles from "./ChatSidebar.module.css";
interface Props {
  id?: string; hidden?: boolean; workspaceOpen?: boolean; onWorkspaceToggle?: () => void;
  chats: { id: string; title: string }[]; activeId: string;
  onNew: () => void; onSelect: (id: string) => void;
}
export default function ChatSidebar({ id, hidden, workspaceOpen = false, onWorkspaceToggle, chats, activeId, onNew, onSelect }: Props) {
  const panelId = useId();
  const workspace = useRef<HTMLButtonElement>(null);
  function close() { onWorkspaceToggle?.(); workspace.current?.focus({ preventScroll: true }); }
  return <aside id={id} hidden={hidden} className={styles.root} data-workspace-open={workspaceOpen} aria-label="Workspaces">
    <nav className={styles.rail} aria-label="Workspace navigation">
      <button ref={workspace} type="button" className={styles.workspace} aria-expanded={workspaceOpen} aria-controls={panelId} onClick={onWorkspaceToggle}>
        <span className={styles.home}><ChatIcon name="home" /></span><span>Workspace</span>
      </button>
    </nav>
    <section id={panelId} hidden={!workspaceOpen} className={styles.panel} aria-label="Workspace list" onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    }}>
      <div className={styles.panelHeader}><h2>Your workspaces</h2><button type="button" className={styles.close} aria-label="Close workspace list" onClick={close}><ChatIcon name="close" /></button></div>
      <button type="button" className={styles.new} onClick={onNew}><ChatIcon name="plus" /><span>New workspace</span></button>
      <h3 className={styles.label}>Workspaces <span>{chats.length}</span></h3>
      <ul className={styles.list}>{chats.map((chat) => <li key={chat.id} className={styles.item}>
        <button type="button" title={chat.title} aria-label={chat.title} aria-pressed={activeId === chat.id} onClick={() => onSelect(chat.id)}><ChatIcon name="document" /><span>{chat.title}</span></button>
      </li>)}</ul>
    </section>
  </aside>;
}
