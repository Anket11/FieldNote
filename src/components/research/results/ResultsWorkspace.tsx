import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { citationClosed, citationOpened, selectEvidenceItem, selectEvidenceCitations, tabChanged } from "@/store/researchSlice";
import EvidencePanel from "./evidence-panel/EvidencePanel";
import ResearchTabs from "./ResearchTabs";
import ResearchArea from "./research/ResearchArea";
import PrepareTenderArea from "./prepare-tender/PrepareTenderArea";
import MyReviewArea from "./my-review/MyReviewArea";

export default function ResultsWorkspace() {
  const dispatch = useAppDispatch();
  const { result, status, activeTab, activeCitationId, selectedIds } = useAppSelector((state) => state.research);
  const evidenceItem = useAppSelector(selectEvidenceItem);
  const citations = useAppSelector(selectEvidenceCitations);
  if (!result || status === "empty") return null;
  const citation = activeCitationId ? result.citationsById[activeCitationId] : null;
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className={`min-w-0 flex-1 space-y-4 ${citation ? "hidden lg:block" : ""}`}>
        <ResearchTabs activeTab={activeTab} onChange={(tab) => dispatch(tabChanged(tab))} panels={[
          { id: "research", title: "Research", content: <ResearchArea sections={result.sections} /> },
          { id: "prepare", title: "Prepare tender", content: <PrepareTenderArea sections={result.sections} /> },
          { id: "review", title: "My review", count: selectedIds.length, content: <MyReviewArea /> },
        ]} />
      </div>
      {citation && <EvidencePanel citation={citation} title={evidenceItem?.title ?? ""}
        citations={citations}
        onCitationChange={(id) => dispatch(citationOpened(id))} onClose={() => dispatch(citationClosed())} />}
    </div>
  );
}
