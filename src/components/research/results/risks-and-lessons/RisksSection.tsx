import type { Evidence } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";

export default function RisksSection({ items }: { items: Evidence[] }) {
  return (
    <>
      <p>Reported findings and planning implications are labelled separately. No explicit source-stated lessons were selected in this saved set; retrieval of lessons sections remains incomplete. Project findings do not establish package or supplier responsibility.</p>
      <EvidenceList items={items} />
    </>
  );
}
