"use client";
import styles from "./CopilotThread.module.css";

import { useEffect, useRef, useState } from "react";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import { CopilotChatConfigurationProvider, useRenderToolCall } from "@copilotkit/react-core/v2/headless";
import AnswerNotes from "./AnswerNotes";
import { AnswerStateContext, ResearchAnswerRenderer } from "./AnswerRenderer";
import ChatComposer from "./ChatComposer";
import ChatMessages, { type ChatMessageView } from "./ChatMessages";
import useResearchAgent from "./useResearchAgent";
import ChatWorkspace, { type ChatThreadProps } from "./ChatWorkspace";
import ResearchProgress from "./ResearchProgress";
import SourcesSummary from "./evidence/SourcesSummary";
import DocumentReader from "./evidence/DocumentReader";
import FollowUpQuestions from "./FollowUpQuestions";
import AnswerActions from "./AnswerActions";
import ConversationNavigation from "./ConversationNavigation";
import { useAppSelector } from "@/store/hooks";
import { groupSources } from "@/services/answerSources";
import { formatAnswer } from "@/services/answerExport";
import type { Citation } from "@/types/research";

function UnconfiguredChat() {
  const [draft, setDraft] = useState("");
  const library = useAppSelector((state) => state.research.result)!;
  const [source, setSource] = useState<Citation | null>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  return <div className={styles.workspace} data-reader-open={!!source}><div className={styles.root}>
    <ChatComposer welcome value={draft} onChange={setDraft} onSend={() => {}} running={false} ready={false} library={library}
      onOpenSource={(source) => { sourceTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSource(source); }} />
    <p role="status">Add GEMINI_API_KEY to the server environment and restart the app to start chatting.</p>
  </div>{source && <DocumentReader source={source} onClose={() => { setSource(null); sourceTrigger.current?.focus({ preventScroll: true }); }} />}</div>;
}
export default function CopilotThread(props: ChatThreadProps) {
  if (!props.configured) return <UnconfiguredChat />;
  // CopilotKit context is provider-scoped; each chat must own its provider.
  return <CopilotKitProvider runtimeUrl="/api/copilotkit" enableInspector={false} showIntelligenceIndicator={false}>
    <CopilotChatConfigurationProvider agentId={`research-${props.threadId}`} threadId={props.threadId}>
      <AgentChat {...props} />
    </CopilotChatConfigurationProvider>
  </CopilotKitProvider>;
}
function AgentChat({ threadId, onTitle, initialResearch, onSnapshot }: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const chatTop = useRef<HTMLDivElement>(null);
  const { outputState, messages: agentMessages, isReady, running, error, send, retry, runs, stop } = useResearchAgent(threadId, onTitle, initialResearch, onSnapshot);
  const library = useAppSelector((state) => state.research.result)!;
  const [selectedSource, setSelectedSource] = useState<Citation | null>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string>();
  const [actionNotice, setActionNotice] = useState<{ questionId: string; text: string } | null>(null);
  const renderToolCall = useRenderToolCall();
  useEffect(() => {
    function followUp(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: string; value: string }>).detail;
      if (detail.workspaceId !== threadId) return;
      setDraft(detail.value);
      requestAnimationFrame(() => { const input = chatTop.current?.querySelector("textarea"); input?.focus(); input?.scrollIntoView({ block: "center" }); });
    }
    function source(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: string; value: string }>).detail;
      if (detail.workspaceId === threadId && Object.hasOwn(library.citationsById, detail.value)) setSelectedSource(library.citationsById[detail.value]);
    }
    document.addEventListener("workspace-follow-up", followUp);
    document.addEventListener("workspace-open-source", source);
    return () => { document.removeEventListener("workspace-follow-up", followUp); document.removeEventListener("workspace-open-source", source); };
  }, [threadId, library]);
  const messages: ChatMessageView[] = agentMessages.flatMap((message) => {
    if (message.role !== "assistant" && message.role !== "user") return [];
    const text = typeof message.content === "string" ? message.content : "";
    const toolCalls = message.role === "assistant" ? message.toolCalls ?? [] : [];
    const visibleTools = toolCalls.filter((tool) => ["presentResearchAnswer", "editChecklist"].includes(tool.function.name));
    if (!text && !visibleTools.length) return [];
    return [{ id: message.id, role: message.role, text: visibleTools.length ? "" : text,
      answerIds: visibleTools.filter((tool) => tool.function.name === "presentResearchAnswer").map((tool) => tool.id),
      output: visibleTools.map((toolCall) => {
        const toolMessage = agentMessages.find((item) => item.role === "tool" && item.toolCallId === toolCall.id);
        return <div key={toolCall.id}>{toolCall.function.name === "presentResearchAnswer" && outputState.answers[toolCall.id] ? <ResearchAnswerRenderer toolCallId={toolCall.id} status="complete" /> : renderToolCall({ toolCall, toolMessage: toolMessage?.role === "tool" ? toolMessage : undefined })}</div>;
      }) }];
  });
  const latestQuestionId = messages.filter((message) => message.role === "user").at(-1)?.id;
  useEffect(() => {
    // Scroll after the new question renders; streaming updates must not move the reader.
    if (latestQuestionId) chatTop.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [latestQuestionId]);
  async function submit(question = draft) {
    if (!question.trim() || running || !isReady) return;
    setActiveQuestion(undefined);
    onTitle(threadId, question);
    setDraft((current) => current === question ? "" : current);
    await send(question);
  }
  function openSource(source: Citation) {
    sourceTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedSource(source);
  }
  function closeSource() {
    setSelectedSource(null);
    sourceTrigger.current?.focus({ preventScroll: true });
  }
  function turnStart(questionId: string) {
    const run = runs[questionId];
    if (!run) return null;
    const groups = groupSources(run.sourceIds.flatMap((id) => Object.hasOwn(library.citationsById, id) ? [library.citationsById[id]] : []));
    return <>
      <SourcesSummary groups={groups} onOpen={openSource} loading={run.state === "running"} />
      <ResearchProgress status={run.status} tasks={run.tasks} activity={run.activity} state={run.state} />
    </>;
  }
  function turnEnd(turn: ChatMessageView[]) {
    const questionId = turn[0].id;
    const run = runs[questionId];
    if (!run || run.state === "running" || !turn.some((message) => message.role === "assistant")) return null;
    const answers = turn.flatMap((message) => (message.answerIds ?? []).flatMap((id) => {
      const answer = outputState.answers[id];
      return answer ? [{ id, answer }] : [];
    }));
    const questions = [...new Set(answers.flatMap(({ answer }) => answer.followUpQuestions ?? []))].slice(0, 3);
    const plainText = turn.filter((message) => message.role === "assistant").map((message) => message.text);
    if (!answers.length && !plainText.some((text) => text.trim())) return null;
    const text = () => formatAnswer(turn[0].text, plainText, answers, library, outputState.checklistEdits);
    async function copy() {
      try {
        await navigator.clipboard.writeText(text());
        setActionNotice({ questionId, text: "Answer copied." });
      } catch { setActionNotice({ questionId, text: "Could not copy the answer. Use Download answer instead." }); }
    }
    function download() {
      const url = URL.createObjectURL(new Blob([text()], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = "procurement-answer.md";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    return <>
      {run.state === "completed" && <FollowUpQuestions questions={questions} disabled={running || !isReady} onSelect={(question) => { void submit(question); }} />}
      <AnswerNotes actions={<AnswerActions actions={[{ id: "copy", label: "Copy answer", onClick: () => { void copy(); } },
        { id: "download", label: "Download answer", onClick: download }]} />} questionId={questionId} question={turn[0].text} preview={[...plainText, ...answers.flatMap(({ answer }) => answer.claims.map((claim) => claim.text))].filter(Boolean).join(" ").slice(0, 500)} />
      {actionNotice?.questionId === questionId && <p className={styles.notice} role="status">{actionNotice.text}</p>}
    </>;
  }
  return <AnswerStateContext.Provider value={outputState}><div className={styles.workspace} data-reader-open={!!selectedSource}><div ref={chatTop} className={styles.root}>
      <ChatComposer welcome={!messages.length} value={draft} onChange={setDraft} onSend={() => { void submit(); }} running={running} ready={isReady} onStop={stop} library={library} onOpenSource={openSource} />
      {!isReady && <p role="status">Connecting to the research agent…</p>}
      {error && <p role="alert">{error.message} {error.helpUrl && <a href={error.helpUrl} target="_blank" rel="noreferrer">Open Google AI Studio</a>} <button type="button" className={styles.retry} disabled={running} onClick={() => { void retry().then(({ sent, question }) => { if (sent) setDraft((draft) => draft.trim() === question ? "" : draft); }); }}>Retry</button></p>}
      <ConversationNavigation questions={messages.filter((message) => message.role === "user").map((message) => ({ id: message.id, label: message.text }))}
        activeId={activeQuestion ?? messages.filter((message) => message.role === "user").at(-1)?.id} onSelect={(id) => {
          setActiveQuestion(id);
          const target = document.getElementById(`question-${id}`);
          target?.scrollIntoView({ block: "start" }); target?.focus({ preventScroll: true });
        }} />
      <ChatMessages messages={messages} renderTurnStart={turnStart} renderTurnEnd={turnEnd} />
  </div>{selectedSource && <DocumentReader source={selectedSource} onClose={closeSource} />}</div></AnswerStateContext.Provider>;
}

export function ProcurementChat({ configured }: { configured: boolean }) {
  return <ChatWorkspace Thread={CopilotThread} configured={configured} />;
}
