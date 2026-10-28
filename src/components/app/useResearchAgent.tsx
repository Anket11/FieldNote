import { useEffect, useRef, useState } from "react";
import { useAgent, useAgentContext, useCopilotKit, useFrontendTool } from "@copilotkit/react-core/v2/headless";
import { useAppSelector } from "@/store/hooks";
import { describeChatError, type ChatError } from "@/services/chatErrors";
import { answerSchema, validateAnswer } from "@/services/chatLibrary";
import { checklistChangeSchema, validateChecklistChange } from "@/services/chatActions";
import type { ChecklistEdit, ResearchAnswer } from "@/types/chat";
import { ResearchAnswerRenderer, ChecklistChangeRenderer } from "./AnswerRenderer";

export default function useResearchAgent(threadId: string) {
  const localId = `research-${threadId}`;
  const { agent, isReady } = useAgent({ agentId: localId, runtimeAgentId: "default", threadId });
  const { copilotkit } = useCopilotKit();
  const library = useAppSelector((state) => state.research.result)!;
  const [answers, setAnswers] = useState<Record<string, ResearchAnswer>>({});
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>({});
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<ChatError | null>(null);
  const [pending, setPending] = useState(false);
  const lastRequest = useRef("");
  const busy = useRef(false);
  const failed = useRef(false);
  useEffect(() => {
    const subscription = copilotkit.subscribe({ onError: ({ error }) => {
      failed.current = true;
      setError(describeChatError(error));
    } });
    return () => subscription.unsubscribe();
  }, [copilotkit]);
  function editItem(outputId: string, itemId: string, changes: Partial<ChecklistEdit>) {
    const key = `${outputId}:${itemId}`;
    setChecklistEdits((edits) => ({ ...edits, [key]: { ...(edits[key] ?? { done: false, notes: "" }), ...changes } }));
  }
  useAgentContext({ description: "This research chat only. Browsing is not an instruction to scope the answer.", value: {
    threadId, requestedProjectFilter: projectId,
    checklists: Object.entries(answers).flatMap(([outputId, answer]) => answer.output?.kind === "checklist"
      ? [{ outputId, items: answer.output.items.map((item) => ({ ...item, ...(checklistEdits[`${outputId}:${item.id}`] ?? { done: false, notes: "" }) })) }] : []),
  } });
  useFrontendTool({
    name: "presentResearchAnswer", agentId: localId, followUp: false,
    description: "Display only the requested cited answer and optional configurable collection (list/map, split/list layout, selected record, title, detail fields), checklist or location view. Use original record and source IDs. Do not invent source fields.",
    parameters: answerSchema,
    handler: async (args, { toolCall, signal }) => {
      if (signal?.aborted) throw new Error("Request cancelled.");
      const answer = validateAnswer(args, library);
      setAnswers((answers) => ({ ...answers, [toolCall.id]: answer }));
      if (answer.output?.kind === "collection") setProjectId(answer.output.projectId ?? "");
      return { displayed: true, outputId: toolCall.id, checklistItemIds: answer.output?.kind === "checklist" ? answer.output.items.map((item) => item.id) : [] };
    },
    render: ResearchAnswerRenderer,
  }, [localId, library]);
  useFrontendTool({
    name: "editChecklist", agentId: localId, followUp: false,
    description: "Change an existing checklist item only when the user explicitly asks to mark/check/uncheck it or add/update a note. Use an output and item ID from this chat's context.",
    parameters: checklistChangeSchema,
    handler: async (args, { signal }) => {
      if (signal?.aborted) throw new Error("Request cancelled.");
      const { changes } = validateChecklistChange(args, answers, lastRequest.current);
      editItem(args.outputId, args.itemId, changes);
      return { updated: true };
    },
    render: ChecklistChangeRenderer,
  }, [localId, answers]);
  async function send(question: string, retry = false) {
    const text = question.trim();
    if (!text || !isReady || busy.current || agent.isRunning) return false;
    busy.current = true; failed.current = false; setPending(true); setError(null); lastRequest.current = text;
    try {
      if (!retry) agent.addMessage({ id: crypto.randomUUID(), role: "user", content: text });
      await copilotkit.runAgent({ agent });
      return !failed.current;
    } catch (error) {
      setError(describeChatError(error));
      return false;
    } finally { busy.current = false; setPending(false); }
  }
  return { outputState: { answers, checklistEdits, onEditItem: editItem, onFilterChange: setProjectId }, agent, isReady, running: pending || agent.isRunning, error, send, retry: async () => { const question = lastRequest.current; return { sent: await send(question, true), question }; } };
}
