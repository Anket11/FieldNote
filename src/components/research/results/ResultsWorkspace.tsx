import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { citationClosed, tabChanged } from "@/store/researchSlice";
import EvidencePanel from "./EvidencePanel";
import ResearchTabs from "./ResearchTabs";
import OverviewSection from "./overview/OverviewSection";
import SimilarPackagesSection from "./similar-packages/SimilarPackagesSection";
import RequirementsSection from "./tender-requirements/RequirementsSection";
import RisksSection from "./risks-and-lessons/RisksSection";

export default function ResultsWorkspace() {
  const dispatch = useAppDispatch();
  const { result, status, submittedQuery, activeTab, activeCitationId } = useAppSelector((state) => state.research);
  if (!result || status === "empty") return null;

  return (
    <>
      <section className="space-y-2">
        <h2>Saved research results</h2>
        <p>Submitted query: {submittedQuery}</p>
        <p>{result.coverage}</p>
        <p>Source checked applies to selected claims only, never an entire package or supplier.</p>
      </section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <ResearchTabs activeTab={activeTab} onChange={(tab) => dispatch(tabChanged(tab))} panels={{
            overview: <OverviewSection items={result.items.filter((item) => item.tab === "overview")} />,
            packages: <SimilarPackagesSection />,
            requirements: <RequirementsSection items={result.items.filter((item) => item.tab === "requirements")} />,
            risks: <RisksSection items={result.items.filter((item) => item.tab === "risks")} />,
          }} />
        </div>
        <EvidencePanel
          citation={activeCitationId ? result.citationsById[activeCitationId] : null}
          onClose={() => dispatch(citationClosed())}
        />
      </div>
    </>
  );
}
