import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { citationOpened } from "@/store/researchSlice";
export default function CitationButton({ citationId }: { citationId: string }) {
  const dispatch = useAppDispatch();
  const citation = useAppSelector((state) => state.research.result?.citationsById[citationId]);
  if (!citation) return null;
  return <button type="button" aria-controls="source-evidence" onClick={() => dispatch(citationOpened(citationId))}>
    {citation.title}{citation.page !== undefined ? `, p. ${citation.page}` : citation.recordLocator ? " · record excerpt" : " · source excerpt"}
  </button>;
}
