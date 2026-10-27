import type { KeyboardEvent, ReactNode } from "react";
import type { Tab } from "@/types/research";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "packages", label: "Similar packages" },
  { id: "requirements", label: "Tender requirements" },
  { id: "risks", label: "Risks & lessons" },
];

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  panels: Record<Tab, ReactNode>;
}

export default function ResearchTabs({ activeTab, onChange, panels }: Props) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  return (
    <>
      <div className="flex flex-wrap gap-3" role="tablist" aria-label="Research results">
        {tabs.map((tab, index) => (
          <button type="button" key={tab.id} id={`tab-${tab.id}`} role="tab"
            aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(tab.id)}>
            {tab.label}{activeTab === tab.id ? " (active)" : ""}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section key={tab.id} id={`panel-${tab.id}`} role="tabpanel"
          aria-labelledby={`tab-${tab.id}`} tabIndex={0} hidden={activeTab !== tab.id}>
          <h2>{tab.label}</h2>
          {panels[tab.id]}
        </section>
      ))}
    </>
  );
}
