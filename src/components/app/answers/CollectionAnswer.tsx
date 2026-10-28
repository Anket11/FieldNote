import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import Collection from "../../agent/Collection";
import Details from "../../agent/Details";
import RecordDetails from "../details/RecordDetails";
import { combinePackages } from "@/services/packageComparison";
import RecordMap from "./RecordMap";
import SourceLinks from "../evidence/SourceLinks";
import { firstSourceMentions } from "@/services/answerSources";
import type { Citation } from "@/types/research";
import type { CollectionOutput } from "@/types/chat";

interface Props {
  output: CollectionOutput;
  sourceGroups?: Citation[][];
  onFilterChange?: (projectId: string) => void;
}
const labels = { text: "Details", relevance: "Why it’s relevant", differences: "Reported differences", unknowns: "Unknowns to resolve" };
export default function CollectionAnswer({ output, onFilterChange, sourceGroups = [] }: Props) {
  const result = useAppSelector((state) => state.research.result);
  const records = useMemo(() => result?.sections.flatMap((section) => section.items) ?? [], [result]);
  const requested = useMemo(() => output.recordIds.flatMap((id) => records.find((item) => item.id === id) ?? []), [output.recordIds, records]);
  const supportsMap = requested.every((record) => record.kind === "package" || result?.sections.find((section) => section.id === "historical_awards")?.items.some((item) => item.id === record.id));
  const split = (output.layout ?? (supportsMap ? "split" : "list")) === "split";
  const entries = useMemo(() => combinePackages(records.filter((item) => item.kind === "package"),
    result?.sections.find((section) => section.id === "historical_awards")?.items ?? [], result?.citationsById ?? {}), [records, result]);
  const items = useMemo(() => {
    const rows = requested.map((record) => {
      const isProcurement = record.kind === "package" || result?.sections.find((section) => section.id === "historical_awards")?.items.some((item) => item.id === record.id);
      const fields = split ? [] : output.fields ?? (isProcurement ? [] : ["text", "relevance", "differences", "unknowns"] as const);
      const firstField = fields.find((field) => Array.isArray(record[field]) ? record[field].length > 0 : !!record[field]);
      return { record, fields, firstField };
    });
    const citations = firstSourceMentions(sourceGroups, rows.map(({ record, fields, firstField }) => !fields.length || firstField ? record.citationIds : []));
    return rows.map(({ record, fields, firstField }, index) => ({
      id: record.id, title: `${record.title}${record.label ? ` · ${record.label}` : ""}`, groupIds: record.projectIds,
      meta: !split && !fields.length ? <SourceLinks groups={citations[index]} /> : undefined,
      content: fields.length > 0 ? <Details fields={fields.map((field) => ({
        label: labels[field], value: record[field], suffix: field === firstField ? <> <SourceLinks groups={citations[index]} /></> : undefined,
      }))} /> : undefined,
    }));
  }, [requested, output.fields, result, split, sourceGroups]);
  return <Collection items={items} title={output.title} initialView={output.view} initialFilter={output.projectId}
    filters={result?.projects.filter((project) => requested.some((item) => item.projectIds.includes(project.id))).map((project) => ({ id: project.id, label: project.title }))}
    filterLabel="Source project" allLabel="All source projects" listLabel={output.title ?? "Results"} viewLabel="Result view" initialSelectedId={output.selectedId}
    onFilterChange={onFilterChange}
    renderDetails={split ? (selected) => {
      const record = requested.find((item) => item.id === selected.id)!;
      return <RecordDetails item={record} award={entries.find((entry) => entry.item.id === record.id)?.award} fields={output.detailFields} sourceGroups={sourceGroups} />;
    } : undefined}
    renderMap={supportsMap ? (visible, selectedId, onSelect, controlsId) => <RecordMap key={visible.map((item) => item.id).join(",")} items={requested} visibleItems={visible} focusedId={selectedId} onPick={onSelect} controlsId={controlsId} /> : undefined} />;
}
