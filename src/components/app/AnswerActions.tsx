import styles from "./AnswerActions.module.css";
import ChatIcon from "./ChatIcon";

export interface AnswerAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function AnswerActions({ actions }: { actions: AnswerAction[] }) {
  if (!actions.length) return null;
  return <div className={styles.root} role="group" aria-label="Answer actions" data-component="AnswerActions">
    {actions.map((action) => <button key={action.id} type="button" title={action.label} aria-label={action.label} disabled={action.disabled} onClick={action.onClick}>
      {(action.id === "copy" || action.id === "download") && <ChatIcon name={action.id} />}<span className={action.id === "copy" || action.id === "download" ? styles.srOnly : undefined}>{action.label}</span>
    </button>)}
  </div>;
}
