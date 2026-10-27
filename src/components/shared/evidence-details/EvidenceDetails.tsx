import type { Evidence } from "@/types/research";

export default function EvidenceDetails({ item }: { item: Evidence }) {
  return (
    <>
      <p>{item.text}</p>
      {item.relevance && <section><h4>Why it’s relevant</h4><p>{item.relevance}</p></section>}
      {item.differences.length > 0 && <section><h4>Reported differences</h4><ul>{item.differences.map((text, index) => <li key={index}>{text}</li>)}</ul></section>}
      {item.unknowns.length > 0 && <section><h4>Unknowns to resolve</h4><ul>{item.unknowns.map((text, index) => <li key={index}>{text}</li>)}</ul></section>}
      {item.projectIds.length > 0 && <p>Source project context: {item.projectIds.join(", ")}</p>}
    </>
  );
}
