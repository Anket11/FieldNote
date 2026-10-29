import styles from "./FollowUpQuestions.module.css";
import ChatIcon from "./ChatIcon";

interface Props {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function FollowUpQuestions({ questions, onSelect, disabled = false }: Props) {
  if (!questions.length) return null;
  return <nav className={styles.root} aria-label="Suggested follow-up questions" data-component="FollowUpQuestions">
    <ul>{questions.map((question, index) => <li key={`${index}:${question}`}>
      <button type="button" disabled={disabled} onClick={() => onSelect(question)}><ChatIcon name="followUp" /><span>{question}</span></button>
    </li>)}</ul>
  </nav>;
}
