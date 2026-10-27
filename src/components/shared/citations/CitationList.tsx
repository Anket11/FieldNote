import CitationButton from "./CitationButton";

export default function CitationList({ citationIds }: { citationIds: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {citationIds.map((id) => <CitationButton key={id} citationId={id} />)}
    </div>
  );
}
