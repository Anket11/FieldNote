import type { ResearchSection } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { reviewSelectionChanged } from "@/store/researchSlice";

export default function PrepareTenderArea({ sections }: { sections: ResearchSection[] }) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((state) => state.research.selectedIds);
  return (
    <div className="space-y-6">
      {[{ id: "tender_requirements", title: "Requirements to consider" }, { id: "readiness_checklist", title: "Questions to resolve" }].map((group) => {
        const items = sections.find((section) => section.id === group.id)?.items ?? [];
        return <section key={group.id}>
          <h3 id={`research-${group.id}`} tabIndex={-1}>{group.title}</h3>
          {items.length ? <EvidenceList items={items} selectedIds={selectedIds} onSelect={(id) => dispatch(reviewSelectionChanged({ id, selected: !selectedIds.includes(id) }))} /> : <p>No items available.</p>}
        </section>;
      })}
    </div>
  );
}
