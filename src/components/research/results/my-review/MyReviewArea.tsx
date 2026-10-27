import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { reviewSelectionChanged } from "@/store/researchSlice";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";

export default function MyReviewArea() {
  const dispatch = useAppDispatch();
  const { result, selectedIds } = useAppSelector((state) => state.research);
  if (!selectedIds.length) return <p>Add packages, requirements or action items to collect them here.</p>;
  return (
    <div className="space-y-6">
      {[{ id: "similar_procurements", title: "Package examples" }, { id: "tender_requirements", title: "Requirements being considered" }, { id: "readiness_checklist", title: "Open preparation questions" }].map((group) => {
        const items = result?.sections.find((section) => section.id === group.id)?.items.filter((item) => selectedIds.includes(item.id)) ?? [];
        return items.length > 0 && <section key={group.id}>
          <h3>{group.title}</h3>
          <EvidenceList items={items} selectedIds={selectedIds} onSelect={(id) => {
            dispatch(reviewSelectionChanged({ id, selected: false }));
          }} />
        </section>;
      })}
    </div>
  );
}
