import { useId } from "react";

import { DEMO_QUERY } from "@/services/demoQuery";

interface Props {
  value: string; onChange: (value: string) => void; onSend: () => void;
  running: boolean; ready: boolean;
}
export default function ChatComposer({ value, onChange, onSend, running, ready }: Props) {
  const id = useId();
  return <form className="sticky top-0 z-10 space-y-2 bg-white py-3" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
    <label htmlFor={id}>Ask about procurement</label>
    <textarea id={id} className="block w-full" rows={3} value={value} disabled={running}
      onChange={(event) => onChange(event.target.value)} placeholder="Ask a question about the available procurement records" required />
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={!ready || running || !value.trim()}>{running ? "Answering…" : "Send"}</button>
      <button type="button" disabled={running} onClick={() => onChange(DEMO_QUERY)}>Use example query</button>
    </div>
  </form>;
}
