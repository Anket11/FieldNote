import type { KeyboardEvent, ReactNode } from "react";

interface TabPanel {
  id: string;
  title: string;
  count?: number;
  content: ReactNode;
}
interface Props {
  activeTab: string;
  onChange: (tab: string) => void;
  panels: TabPanel[];
}
export default function ResearchTabs({ activeTab, onChange, panels }: Props) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % panels.length;
    else if (event.key === "ArrowLeft") next = (index + panels.length - 1) % panels.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = panels.length - 1;
    else return;
    event.preventDefault();
    onChange(panels[next].id);
    document.getElementById(`tab-${panels[next].id}`)?.focus();
  }
  return (
    <>
      <div className="flex flex-wrap gap-3" role="tablist" aria-label="Research results">
        {panels.map((panel, index) => (
          <button type="button" key={panel.id} id={`tab-${panel.id}`} role="tab"
            aria-selected={activeTab === panel.id} aria-controls={`panel-${panel.id}`}
            tabIndex={activeTab === panel.id ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(panel.id)}>
            {panel.title}{panel.count !== undefined ? ` (${panel.count})` : ""}{activeTab === panel.id ? " (active)" : ""}
          </button>
        ))}
      </div>
      {panels.map((panel) => (
        <section key={panel.id} id={`panel-${panel.id}`} role="tabpanel"
          aria-labelledby={`tab-${panel.id}`} tabIndex={0} hidden={activeTab !== panel.id}>
          <h2>{panel.title}</h2>
          {panel.content}
        </section>
      ))}
    </>
  );
}
