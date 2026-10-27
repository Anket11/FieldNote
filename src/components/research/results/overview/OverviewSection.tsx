import type { Evidence } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";

export default function OverviewSection({ items }: { items: Evidence[] }) {
  return (
    <>
      <p>Historical examples are not cost predictions or completion forecasts. NAG-SS-02A has a published signed notice price of INR 693401152, a 15-month duration from an unconfirmed effective date, and separate supply/services contract conditions. Actual completion and final paid cost remain unconfirmed; inspect the cited items below.</p>
      <EvidenceList items={items} />
    </>
  );
}
