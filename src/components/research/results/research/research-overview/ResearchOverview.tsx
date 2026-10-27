import type { ResearchSection } from "@/types/research";
import { useAppDispatch } from "@/store/hooks";
import { tabChanged } from "@/store/researchSlice";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";

const areas = [
  { id: "similar_procurements", title: "Similar packages", tab: "research" },
  { id: "historical_awards", title: "Historical awards", tab: "research" },
  { id: "risks_and_lessons", title: "Risks & lessons", tab: "research" },
  { id: "tender_requirements", title: "Requirements to consider", tab: "prepare" },
  { id: "readiness_checklist", title: "Action items", tab: "prepare" },
  { id: "procurement_strategy", title: "Packaging and bidding examples", tab: "research" },
];

export default function ResearchOverview({ sections }: { sections: ResearchSection[] }) {
  const dispatch = useAppDispatch();
  const findings = sections.find((section) => section.id === "overview")?.items ?? [];
  return (
    <section className="space-y-3">
      <h3>Research overview</h3>
      <table>
        <thead><tr><th scope="col" className="text-left">Area</th><th scope="col">Results</th></tr></thead>
        <tbody>{areas.map((area) => {
          const items = sections.find((section) => section.id === area.id)?.items ?? [];
          const count = area.id === "similar_procurements" ? items.filter((item) => item.kind === "package").length : items.length;
          return <tr key={area.id}>
            <td><button type="button" disabled={!count} onClick={() => {
              dispatch(tabChanged(area.tab));
              requestAnimationFrame(() => document.getElementById(`research-${area.id}`)?.focus());
            }}>{area.title}</button></td>
            <td>{count}</td>
          </tr>;
        })}</tbody>
      </table>
      {findings.length > 0 && <details><summary>Key findings</summary><EvidenceList items={findings} /></details>}
    </section>
  );
}
