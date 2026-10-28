import { createContext, useContext } from "react";
import type { ChecklistEdit, ResearchAnswer } from "@/types/chat";
import AnswerView from "./answers/AnswerView";

interface AnswerState {
  answers: Record<string, ResearchAnswer>;
  checklistEdits: Record<string, ChecklistEdit>;
  onEditItem: (outputId: string, itemId: string, changes: Partial<ChecklistEdit>) => void;
  onFilterChange: (projectId: string) => void;
}
export const AnswerStateContext = createContext<AnswerState | null>(null);
// Stable component identity preserves older output controls when tools re-register.
export function ResearchAnswerRenderer({ toolCallId, status }: { toolCallId: string; status: string }) {
  const state = useContext(AnswerStateContext);
  const answer = state && Object.hasOwn(state.answers, toolCallId) ? state.answers[toolCallId] : undefined;
  if (!answer || !state) return status === "complete" ? <p role="alert">This output could not be validated. Please retry.</p> : <p role="status">Preparing the requested output…</p>;
  return <AnswerView answer={answer} outputId={toolCallId}
    checklistEdits={state.checklistEdits} onChecklistChange={(id, changes) => state.onEditItem(toolCallId, id, changes)} onFilterChange={state.onFilterChange} />;
}
export function ChecklistChangeRenderer({ status, result }: { status: string; result?: string }) {
  if (status !== "complete") return <p role="status">Updating the requested checklist item…</p>;
  let updated = false;
  try { updated = !!result && JSON.parse(result).updated === true; } catch { /* Tool failures are not JSON results. */ }
  return updated ? <p>Checklist updated.</p> : <p role="alert">The checklist change was not applied. Please retry with an explicit item and change.</p>;
}
