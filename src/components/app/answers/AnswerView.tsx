import { useAppSelector } from "@/store/hooks";
import { answerSources, firstSourceMentions } from "@/services/answerSources";
import SourceLinks from "../evidence/SourceLinks";
import LocationView from "../../agent/location/LocationView";
import type { ChecklistEdit, ResearchAnswer } from "@/types/chat";
import CollectionAnswer from "./CollectionAnswer";
import ChecklistAnswer from "./ChecklistAnswer";

interface Props {
  answer: ResearchAnswer; outputId: string;
  checklistEdits: Record<string, ChecklistEdit>;
  onChecklistChange: (itemId: string, changes: Partial<ChecklistEdit>) => void;
  onFilterChange?: (projectId: string) => void;
}
export default function AnswerView({ answer, outputId, checklistEdits, onChecklistChange, onFilterChange }: Props) {
  const result = useAppSelector((state) => state.research.result);
  const records = result?.sections.flatMap((section) => section.items) ?? [];
  const groups = result ? answerSources(answer, result) : [];
  const citations = firstSourceMentions(groups, answer.claims.map((claim) => {
    const record = records.find((item) => item.id === claim.recordId);
    return claim.citationIds.filter((id) => record?.citationIds.includes(id));
  }));
  const remaining = groups.filter((group) => !citations.some((placed) => placed.includes(group)));
  const output = answer.output;
  return <div className="space-y-4">
    {answer.claims.map((claim, index) => <p key={index} className="whitespace-pre-wrap">{claim.text} <SourceLinks groups={citations[index]} /></p>)}
    {output?.kind === "collection" && <CollectionAnswer key={outputId} output={output} sourceGroups={remaining} onFilterChange={onFilterChange} />}
    {output?.kind === "checklist" && <ChecklistAnswer outputId={outputId} title={output.title} items={output.items} sourceGroups={remaining} edits={checklistEdits} onChange={onChecklistChange} />}
    {output?.kind === "location" && <LocationView key={outputId} query={output.query} initialView={output.view} />}
  </div>;
}
