import type { ResearchSnapshot } from "@/services/workspaces";
import type { Message } from "@ag-ui/core";
import { mergeChatHistory } from "@/services/chatHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent, useAgentContext, useCopilotKit, useFrontendTool } from "@copilotkit/react-core/v2/headless";
import { useAppSelector } from "@/store/hooks";
import { describeChatError, type ChatError } from "@/services/chatErrors";
import { answerSchema, validateAnswer } from "@/services/chatLibrary";
import { checklistChangeSchema, validateChecklistChange } from "@/services/chatActions";
import { answerOutputs, type ChecklistEdit, type ResearchAnswer, type ResearchRun } from "@/types/chat";
import { canRetryResearch, runResearchAttempts } from "@/services/researchRetry";
import { createResearchProgress } from "@/services/researchProgress";
import { ResearchAnswerRenderer, ChecklistChangeRenderer } from "./AnswerRenderer";

export default function useResearchAgent(threadId: string, onTitle: (id: string, title: string, generated?: boolean) => void, initialResearch: ResearchSnapshot, onSnapshot: (id: string, snapshot: ResearchSnapshot) => void) {
  const localId = `research-${threadId}`;
  const { agent, isReady } = useAgent({ agentId: localId, runtimeAgentId: "default", threadId });
  const { copilotkit } = useCopilotKit();
  const library = useAppSelector((state) => state.research.result)!;
  const initial = useRef(initialResearch);
  const [restored, setRestored] = useState(false);
  const [history, setHistory] = useState<Message[]>(initialResearch.messages);
  const [answerQueries, setAnswerQueries] = useState<Record<string, string>>(initialResearch.answerQueries);
  const [answers, setAnswers] = useState<Record<string, ResearchAnswer>>(initialResearch.answers);
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>(initialResearch.checklistEdits);
  const [error, setError] = useState<ChatError | null>(null);
  const [pending, setPending] = useState(false);
  const [runs, setRuns] = useState<Record<string, ResearchRun>>(initialResearch.runs);
  useEffect(() => {
    if (!isReady || restored) return;
    agent.setMessages(initial.current.messages);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Enable sending only after the external agent has restored its messages.
    setRestored(true);
  }, [agent, isReady, restored]);
  const messages = useMemo(() => mergeChatHistory(history, agent.messages), [history, agent.messages]);
  useEffect(() => {
    if (restored && !pending && !agent.isRunning) onSnapshot(threadId, { messages, answers, answerQueries, checklistEdits, runs });
  }, [restored, pending, agent.isRunning, messages, answers, answerQueries, checklistEdits, runs, threadId, onSnapshot]);
  const progress = useRef<ReturnType<typeof createResearchProgress> | null>(null);
  const lastQuestionId = useRef("");
  const lastRequest = useRef("");
  const targetQuery = useRef("");
  const busy = useRef(false);
  const failed = useRef(false);
  const stopped = useRef(false);
  const attemptError = useRef<unknown>(null);
  useEffect(() => {
    const subscription = copilotkit.subscribe({ onError: ({ error }) => {
      if (!busy.current || progress.current?.getSnapshot().state === "stopped") return;
      failed.current = true;
      attemptError.current = error;
      progress.current?.fail();
    } });
    return () => subscription.unsubscribe();
  }, [copilotkit]);
  function editItem(outputId: string, itemId: string, changes: Partial<ChecklistEdit>) {
    const key = `${outputId}:${itemId}`;
    setChecklistEdits((edits) => ({ ...edits, [key]: { ...(edits[key] ?? { done: false, notes: "" }), ...changes } }));
  }
  useAgentContext({ description: "This workspace may cover many projects or topics. Use the current question to determine scope; do not assume every question concerns the same procurement.", value: {
    threadId,
    checklists: Object.entries(answers).flatMap(([outputId, answer]) => answerOutputs(answer).flatMap((output) => output.kind === "checklist"
      ? [{ outputId, items: output.items.map((item) => ({ ...item, ...(checklistEdits[`${outputId}:${item.id}`] ?? { done: false, notes: "" }) })) }] : [])),
  } });
  useFrontendTool({
    name: "presentResearchAnswer", agentId: localId, followUp: false,
    description: "Display the requested cited answer, using separate titled outputs for packages, risks and lessons rather than one mixed collection. Each output is a configurable collection (list/map, split/list layout, selected record, title, detail fields), checklist or location view. Use original record and source IDs. Do not invent source fields.",
    parameters: answerSchema,
    handler: async (args, { toolCall, signal }) => {
      if (signal?.aborted || progress.current?.getSnapshot().state === "stopped") throw new Error("Request cancelled.");
      let answer: ResearchAnswer;
      try { answer = validateAnswer(args, library); }
      catch (error) { throw new Error(`ANSWER_VALIDATION_FAILED: ${error instanceof Error ? error.message : "Invalid answer"}. Correct the record/source IDs and output before trying again.`); }
      const query = targetQuery.current || lastRequest.current;
      setAnswerQueries((queries) => ({ ...queries, [toolCall.id]: query }));
      if (answer.chatTitle) onTitle(threadId, answer.chatTitle, true);
      setAnswers((answers) => ({ ...answers, [toolCall.id]: answer }));
      progress.current?.answer(answer, toolCall.id);
      const outputs = answerOutputs(answer);
      return { displayed: true, outputId: toolCall.id, checklistItemIds: outputs.flatMap((output) => output.kind === "checklist" ? output.items.map((item) => item.id) : []) };
    },
    render: ResearchAnswerRenderer,
  }, [localId, library, onTitle, threadId]);
  useFrontendTool({
    name: "editChecklist", agentId: localId, followUp: false,
    description: "Change an existing checklist item only when the user explicitly asks to mark/check/uncheck it or add/update a note. Use an output and item ID from this chat's context.",
    parameters: checklistChangeSchema,
    handler: async (args, { signal, toolCall }) => {
      if (signal?.aborted || progress.current?.getSnapshot().state === "stopped") throw new Error("Request cancelled.");
      const { changes } = validateChecklistChange(args, answers, lastRequest.current);
      editItem(args.outputId, args.itemId, changes);
      progress.current?.completeTool(toolCall.id);
      return { updated: true };
    },
    render: ChecklistChangeRenderer,
  }, [localId, answers]);
  async function send(question: string, retry = false) {
    const text = question.trim();
    if (!text || !isReady || !restored || busy.current || agent.isRunning) return false;
    busy.current = true; stopped.current = false; setPending(true); setError(null); lastRequest.current = text;
    if (!retry) lastQuestionId.current = crypto.randomUUID();
    targetQuery.current = text;
    const questionId = lastQuestionId.current;
    try {
      if (!retry) {
        const question: Message = { id: questionId, role: "user", content: text };
        const snapshot = [...agent.messages, question];
        setHistory((history) => mergeChatHistory(history, snapshot));
        // Persist the question before the request; a reload interrupts execution, not its record.
        onSnapshot(threadId, { messages: mergeChatHistory(history, snapshot), answers, answerQueries, checklistEdits,
          runs: { ...runs, [questionId]: { runId: questionId, state: "stopped", status: "Research was interrupted. Ask this question again to continue.", sourceIds: [], tasks: [], activity: [] } } });
        agent.addMessage(question);
      }
      const completed = await runResearchAttempts(async (attempt) => {
        failed.current = false; attemptError.current = null;
        const runId = crypto.randomUUID();
        const tracker = createResearchProgress(runId, library, (run) => setRuns((runs) => ({ ...runs, [questionId]: run })),
          attempt, attempt > 1 ? progress.current?.getSnapshot() : undefined);
        progress.current = tracker;
        const subscription = agent.subscribe(tracker.subscriber);
        const errorSubscription = agent.subscribe({ onRunErrorEvent: ({ event }) => {
          failed.current = true; attemptError.current = new Error(event.message);
        } });
        try {
          await copilotkit.runAgent({ agent, runId });
          if (failed.current) tracker.fail();
          else tracker.complete();
        } catch (error) {
          attemptError.current = error;
          tracker.fail();
        } finally { subscription.unsubscribe(); errorSubscription.unsubscribe(); }
        if (stopped.current || tracker.getSnapshot().state === "stopped") return "stop";
        if (tracker.getSnapshot().state === "completed") return "completed";
        return canRetryResearch(attemptError.current) ? "retry" : "stop";
      }, () => stopped.current);
      if (!completed && !stopped.current) {
        setError(attemptError.current ? describeChatError(attemptError.current) : {
          message: "Research could not return a complete answer after three attempts. Retry this question to continue.",
        });
      }
      return completed;
    } finally { busy.current = false; setPending(false); }
  }

  function stop() {
    if (!busy.current) return;
    stopped.current = true;
    progress.current?.stop();
    copilotkit.stopAgent({ agent });
  }
  return { messages, outputState: { answers, answerQueries, checklistEdits, onEditItem: editItem }, agent, isReady: isReady && restored, runs, stop,
    running: pending || agent.isRunning, error, send,
    retry: async () => { const question = lastRequest.current; return { sent: await send(question, true), question }; } };
}
