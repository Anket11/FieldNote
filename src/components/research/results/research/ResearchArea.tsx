import type { ResearchSection } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";
import ResearchOverview from "./research-overview/ResearchOverview";
import SimilarPackagesSection from "./similar-packages/SimilarPackagesSection";

export default function ResearchArea({ sections }: { sections: ResearchSection[] }) {
  const packages = sections.find((section) => section.id === "similar_procurements");
  const otherSections = sections.filter((section) => !["overview", "similar_procurements", "tender_requirements", "readiness_checklist"].includes(section.id));
  return (
    <div className="space-y-6">
      <ResearchOverview sections={sections} />
      <SimilarPackagesSection items={packages?.items ?? []} />
      {otherSections.map((section) => <section key={section.id}>
        <h3 id={`research-${section.id}`} tabIndex={-1}>{section.id === "procurement_strategy" ? "Packaging and bidding examples" : section.title}</h3>
        {section.items.length ? <EvidenceList items={section.items} /> : <p>No items available.</p>}
      </section>)}
    </div>
  );
}
