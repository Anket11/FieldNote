import { useContext } from "react";
import { WorkspaceContext } from "./WorkspaceContext";
import AnswerNotes from "./AnswerNotes";
export default function SourceAnnotations({ id, title, text }: { id: string; title: string; text: string }) {
  const context = useContext(WorkspaceContext);
  if (!context) return null;
  return <AnswerNotes questionId={`source-${id}`} sourceId={id} question={title} preview={text.slice(0, 500)} />;
}
