import styles from "./AnswerView.module.css";
import { useAppSelector } from "@/store/hooks";
import { answerSources, firstSourceMentions } from "@/services/answerSources";
import SourceLinks from "../evidence/SourceLinks";
import LocationView from "../../agent/location/LocationView";
import { answerOutputs, type ChecklistEdit, type ResearchAnswer } from "@/types/chat";
import CollectionAnswer from "./CollectionAnswer";
import ChecklistAnswer from "./ChecklistAnswer";
import { locationOverride } from "@/services/locationOverrides";

interface Props {
  answer: ResearchAnswer; outputId: string; query?: string;
  checklistEdits: Record<string, ChecklistEdit>;
  onChecklistChange: (itemId: string, changes: Partial<ChecklistEdit>) => void;
}
export default function AnswerView({ answer, outputId, query, checklistEdits, onChecklistChange }: Props) {
  const result = useAppSelector((state) => state.research.result);
  const records = result?.sections.flatMap((section) => section.items) ?? [];
  const groups = result ? answerSources(answer, result) : [];
  const citations = firstSourceMentions(groups, answer.claims.map((claim) => {
    const record = records.find((item) => item.id === claim.recordId);
    return claim.citationIds.filter((id) => record?.citationIds.includes(id));
  }));
  const remaining = groups.filter((group) => !citations.some((placed) => placed.includes(group)));
  const outputs = answerOutputs(answer);
  const sectionSources = firstSourceMentions(remaining, outputs.map((output) =>
    result ? answerSources({ claims: [], output }, result).flatMap((group) => group.map((source) => source.id)) : []));
  return <div className={styles.root}>
    {answer.claims.map((claim, index) => <p key={index} className={styles.claim}>{claim.text} <SourceLinks groups={citations[index]} /></p>)}
    {outputs.map((output, index) => <div key={`${outputId}:${index}`}>
      {output.kind === "collection" && <CollectionAnswer output={output} query={query} sourceGroups={sectionSources[index]} />}
      {output.kind === "checklist" && <ChecklistAnswer outputId={outputId} title={output.title} items={output.items} sourceGroups={sectionSources[index]} edits={checklistEdits} onChange={onChecklistChange} />}
      {output.kind === "location" && <LocationView query={locationOverride(query ?? "")?.name ?? output.query} coordinates={output.coordinates} initialView={output.view} />}
    </div>)}
  </div>;
}
