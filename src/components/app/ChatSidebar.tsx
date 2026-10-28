interface Props {
  chats: { id: string; title: string }[]; activeId: string;
  onNew: () => void; onSelect: (id: string) => void;
}
export default function ChatSidebar({ chats, activeId, onNew, onSelect }: Props) {
  return <aside className="space-y-3 lg:w-48 lg:shrink-0" aria-label="Research chats">
    <button type="button" onClick={onNew}>New chat</button>
    <ul className="flex flex-wrap gap-3 lg:block lg:space-y-3">{chats.map((chat) => <li key={chat.id}>
      <button type="button" className="text-left" aria-pressed={activeId === chat.id} onClick={() => onSelect(chat.id)}>{chat.title}</button>
    </li>)}</ul>
  </aside>;
}
