"use client";

import { useState } from "react";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import { CopilotChatConfigurationProvider, useRenderToolCall } from "@copilotkit/react-core/v2/headless";
import { AnswerStateContext } from "./AnswerRenderer";
import ChatComposer from "./ChatComposer";
import ChatMessages, { type ChatMessageView } from "./ChatMessages";
import useResearchAgent from "./useResearchAgent";
import ChatWorkspace, { type ChatThreadProps } from "./ChatWorkspace";

function UnconfiguredChat() {
  const [draft, setDraft] = useState("");
  return <div className="space-y-4"><ChatComposer value={draft} onChange={setDraft} onSend={() => {}} running={false} ready={false} />
    <p role="status">Add GEMINI_API_KEY to the server environment and restart the app to start chatting.</p>
  </div>;
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
function AgentChat({ threadId, onTitle }: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const { outputState, agent, isReady, running, error, send, retry } = useResearchAgent(threadId);
  const renderToolCall = useRenderToolCall();
  const messages: ChatMessageView[] = agent.messages.flatMap((message) => {
    if (message.role !== "assistant" && message.role !== "user") return [];
    const text = typeof message.content === "string" ? message.content : "";
    const toolCalls = message.role === "assistant" ? message.toolCalls ?? [] : [];
    const visibleTools = toolCalls.filter((tool) => ["presentResearchAnswer", "editChecklist"].includes(tool.function.name));
    if (!text && !visibleTools.length) return [];
    return [{ id: message.id, role: message.role, text: visibleTools.length ? "" : text,
      output: visibleTools.map((toolCall) => {
        const toolMessage = agent.messages.find((item) => item.role === "tool" && item.toolCallId === toolCall.id);
        return <div key={toolCall.id}>{renderToolCall({ toolCall, toolMessage: toolMessage?.role === "tool" ? toolMessage : undefined })}</div>;
      }) }];
  });
  async function submit() {
    const question = draft;
    if (!question.trim() || running || !isReady) return;
    onTitle(threadId, question);
    if (await send(question)) setDraft("");
  }
  return <AnswerStateContext.Provider value={outputState}><div className="min-w-0 space-y-4">
      <ChatComposer value={draft} onChange={setDraft} onSend={() => { void submit(); }} running={running} ready={isReady} />
      {!isReady && <p role="status">Connecting to the research agent…</p>}
      {running && <p role="status">Answering your question…</p>}
      {error && <p role="alert">{error.message} {error.helpUrl && <a href={error.helpUrl} target="_blank" rel="noreferrer">Open Google AI Studio</a>} <button type="button" disabled={running} onClick={() => { void retry().then(({ sent, question }) => { if (sent) setDraft((draft) => draft.trim() === question ? "" : draft); }); }}>Retry</button></p>}
      <ChatMessages messages={messages} />
  </div></AnswerStateContext.Provider>;
}

export function ProcurementChat({ configured }: { configured: boolean }) {
  return <ChatWorkspace Thread={CopilotThread} configured={configured} />;
}
