import { useEffect, useId, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { Evidence } from "@/types/research";
import { evidenceOpened } from "@/store/researchSlice";

export default function CitationList({ item }: { item: Evidence }) {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector((state) => state.research.activeCitationId);
  const map = useAppSelector((state) => state.research.result?.citationsById);
  const availableIds = item.citationIds.filter((id) => map && Object.hasOwn(map, id));
  const openerId = useId();
  const currentOpenerId = useAppSelector((state) => state.research.evidenceOpenerId);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnPosition = useRef<number | null>(null);
  useEffect(() => {
    if (!activeId && currentOpenerId === openerId && returnPosition.current !== null) {
      if (trigger.current?.getClientRects().length) {
        trigger.current.focus({ preventScroll: true });
        window.scrollTo(0, returnPosition.current);
      }
      returnPosition.current = null;
    }
  }, [activeId, currentOpenerId, openerId]);
  if (!availableIds.length) return <span>No source available.</span>;
  return (
    <button ref={trigger} type="button" aria-controls="source-evidence" aria-label={`View evidence for ${item.title}`} onClick={() => {
      returnPosition.current = window.scrollY;
      dispatch(evidenceOpened({ itemId: item.id, openerId }));
    }}>
      View evidence · {availableIds.length} {availableIds.length === 1 ? "source" : "sources"}
    </button>
  );
}
