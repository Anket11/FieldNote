import type { Message } from "@ag-ui/core";

/** A transport snapshot may omit earlier turns. Keep their IDs and update streamed messages in place. */
export function mergeChatHistory(history: Message[], current: Message[]): Message[] {
  const messages = new Map(history.map((message) => [message.id, message]));
  for (const message of current) messages.set(message.id, message);
  return [...messages.values()];
}
