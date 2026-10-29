import styles from "./ChatMessages.module.css";
import { Fragment, type ReactNode } from "react";

export interface ChatMessageView { id: string; role: "user" | "assistant"; text: string; output?: ReactNode; answerIds?: string[] }
interface Props {
  messages: ChatMessageView[];
  renderTurnStart?: (questionId: string) => ReactNode;
  renderTurnEnd?: (turn: ChatMessageView[]) => ReactNode;
}
export default function ChatMessages({ messages, renderTurnStart, renderTurnEnd }: Props) {
  const turns: ChatMessageView[][] = [];
  for (const message of messages) {
    if (message.role === "user" || !turns.length) turns.push([]);
    turns[turns.length - 1].push(message);
  }
  return <ol className={styles.root} aria-label="Conversation, newest first">
    {turns.reverse().map((turn) => <li key={turn[0].id} id={`question-${turn[0].id}`} tabIndex={-1} className={styles.turn}>{turn.map((message, index) => <Fragment key={message.id}><article className={styles.message} data-role={message.role}>
      <h2 className={styles.heading}>{message.role === "user" ? "You" : "Research Workspace"}</h2>
      {message.text && <p className={styles.text}>{message.text}</p>}
      {message.output}
    </article>{index === 0 && renderTurnStart?.(turn[0].id)}</Fragment>)}{renderTurnEnd?.(turn)}</li>)}

  </ol>;
}
