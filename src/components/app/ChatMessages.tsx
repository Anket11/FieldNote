import type { ReactNode } from "react";

export interface ChatMessageView { id: string; role: "user" | "assistant"; text: string; output?: ReactNode }
export default function ChatMessages({ messages }: { messages: ChatMessageView[] }) {
  const turns: ChatMessageView[][] = [];
  for (const message of messages) {
    if (message.role === "user" || !turns.length) turns.push([]);
    turns[turns.length - 1].push(message);
  }
  return <ol className="space-y-6" aria-label="Conversation, newest first">
    {turns.reverse().map((turn) => <li key={turn[0].id} className="space-y-3">{turn.map((message) => <article key={message.id} className="space-y-3">
      <h2>{message.role === "user" ? "You" : "Procurement GPT"}</h2>
      {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
      {message.output}
    </article>)}</li>)}
    {!messages.length && <li>Ask a question to start researching the supplied procurement library.</li>}
  </ol>;
}
