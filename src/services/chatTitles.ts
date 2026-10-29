export interface ChatSummary { id: string; title: string; named?: boolean }

export function withChatTitle(chats: ChatSummary[], id: string, title: string, generated = false): ChatSummary[] {
  const text = title.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!text) return chats;
  return chats.map((chat) => {
    if (chat.id !== id || chat.named || (!generated && chat.title !== "New research")) return chat;
    return { ...chat, title: text, named: generated };
  });
}
