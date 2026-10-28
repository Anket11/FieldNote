import { useAppSelector } from "@/store/hooks";
import SourceLinks from "../evidence/SourceLinks";
import { firstSourceMentions } from "@/services/answerSources";
import type { Citation } from "@/types/research";
import Checklist from "../../agent/Checklist";
import type { ChecklistEdit, ChecklistItem } from "@/types/chat";

interface Props {
  sourceGroups?: Citation[][];
  outputId: string; items: ChecklistItem[]; title?: string;
  edits: Record<string, ChecklistEdit>;
  onChange: (itemId: string, changes: Partial<ChecklistEdit>) => void;
}
export default function ChecklistAnswer({ outputId, items, title, edits, onChange, sourceGroups = [] }: Props) {
  const result = useAppSelector((state) => state.research.result);
  const records = result?.sections.flatMap((section) => section.items) ?? [];
  const requirements = result?.sections.find((section) => section.id === "tender_requirements")?.items ?? [];
  const citations = firstSourceMentions(sourceGroups, items.map((item) => records.find((record) => record.id === item.recordId)?.citationIds ?? []));
  return <Checklist label={title ?? "Preparation checklist"} onChange={onChange} items={items.map((item, index) => {
    const record = records.find((record) => record.id === item.recordId);
    const label = requirements.some((requirement) => requirement.id === record?.id) ? "Source requirement" : "Suggested preparation action";
    return { id: item.id, title: record?.title ?? item.suggestion,
      context: `${label}${record?.label ? ` · ${record.label}` : ""}`, description: record?.text,
      sources: citations[index].length ? <SourceLinks groups={citations[index]} /> : undefined,
      ...(edits[`${outputId}:${item.id}`] ?? { done: false, notes: "" }),
    };
  })} />;
}
