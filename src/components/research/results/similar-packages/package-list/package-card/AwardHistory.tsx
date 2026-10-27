import type { AwardRecord } from "@/types/research";
import CitationButton from "@/components/shared/citations/CitationButton";

export default function AwardHistory({ awards }: { awards: AwardRecord[] }) {
  return (
    <details>
      <summary>Award history ({awards.length} records)</summary>
      {awards.map((award) => (
        <section key={award.id} className="space-y-2 py-3">
          <h4>{award.reference}</h4>
          <p>{award.description}</p>
          <p>Recorded signed date: {award.signedDate || "Not supplied"}</p>
          <p>Recorded suppliers: {award.suppliers.join(", ") || "Not supplied"}</p>
          <p>Feed amount: {award.amount} · Currency: {award.currency ?? "not verified; no conversion or comparison with notice prices"}</p>
          <CitationButton citationId={award.citationId} />
        </section>
      ))}
    </details>
  );
}
