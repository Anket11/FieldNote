import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { requirementToggled } from "@/store/researchSlice";
import type { Evidence } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";
import ReviewChecklist from "./ReviewChecklist";

export default function RequirementsSection({ items }: { items: Evidence[] }) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((state) => state.research.selectedRequirementIds);

  return (
    <>
      <p>Draft-review checklist only; selection does not approve a requirement or generate a tender document. Historical qualification thresholds need engineering/procurement review for the proposed scope.</p>
      <ReviewChecklist items={items.filter((item) => selectedIds.includes(item.id))} />
      <EvidenceList items={items} selectedIds={selectedIds} onSelect={(id) => dispatch(requirementToggled(id))} />
    </>
  );
}
