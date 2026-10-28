"use client";

import { useCallback, useState, type ComponentType } from "react";
import { buildDemoResult } from "@/services/research";
import ResearchProvider from "@/store/Provider";
import ChatSidebar from "./ChatSidebar";

export interface ChatThreadProps {
  threadId: string;
  onTitle: (id: string, question: string) => void;
  configured: boolean;
}
interface Props { Thread: ComponentType<ChatThreadProps>; configured: boolean }
const library = buildDemoResult();
export default function ChatWorkspace({ Thread, configured }: Props) {
  const [chats, setChats] = useState(() => [{ id: crypto.randomUUID(), title: "New research" }]);
  const [activeId, setActiveId] = useState(chats[0].id);
  const onTitle = useCallback((id: string, question: string) => {
    setChats((chats) => chats.map((chat) => chat.id === id && chat.title === "New research" ? { ...chat, title: question.slice(0, 60) } : chat));
  }, []);
  function newChat() {
    const id = crypto.randomUUID();
    setChats((chats) => [...chats, { id, title: "New research" }]);
    setActiveId(id);
  }
  return <main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <h1>Procurement GPT</h1>
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <ChatSidebar chats={chats} activeId={activeId} onNew={newChat} onSelect={setActiveId} />
      <div className="min-w-0 flex-1">{chats.map((chat) => <section key={chat.id} hidden={activeId !== chat.id} aria-label={chat.title}>
        <ResearchProvider result={library}><Thread threadId={chat.id} onTitle={onTitle} configured={configured} /></ResearchProvider>
      </section>)}</div>
    </div>
  </main>;
}
