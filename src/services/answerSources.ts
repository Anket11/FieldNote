import { answerOutputs, type ResearchAnswer } from "../types/chat";
import type { Citation, ResearchResult } from "../types/research";
import { combinePackages } from "./packageComparison";

export function answerSources(answer: ResearchAnswer, result: ResearchResult): Citation[][] {
  const records = result.sections.flatMap((section) => section.items);
  const byId = new Map(records.map((item) => [item.id, item]));
  const ids = new Set<string>();
  for (const claim of answer.claims) {
    const record = claim.recordId ? byId.get(claim.recordId) : undefined;
    for (const id of claim.citationIds) if (record?.citationIds.includes(id)) ids.add(id);
  }
  for (const output of answerOutputs(answer)) {
    const recordIds = output?.kind === "collection" ? output.recordIds : output?.kind === "checklist" ? output.items.flatMap((item) => item.recordId ?? []) : [];
    for (const recordId of recordIds) for (const id of byId.get(recordId)?.citationIds ?? []) ids.add(id);
    if (output?.kind === "collection") {
      const awards = result.sections.find((section) => section.id === "historical_awards")?.items ?? [];
      const split = (output.layout ?? (recordIds.every((id) => byId.get(id)?.kind === "package" || awards.some((item) => item.id === id)) ? "split" : "list")) === "split";
      if (split && (!output.detailFields || output.detailFields.some((field) => ["supplier", "awardValue", "duration"].includes(field)))) {
        for (const entry of combinePackages(records.filter((item) => item.kind === "package"), awards, result.citationsById)) {
          if (recordIds.includes(entry.item.id)) for (const id of entry.award?.citationIds ?? []) ids.add(id);
        }
      }
    }
  }
  return groupSources([...ids].flatMap((id) => Object.hasOwn(result.citationsById, id) ? [result.citationsById[id]] : []));
}

export function groupSources(sources: Citation[]): Citation[][] {
  const groups: Citation[][] = [];
  for (const source of sources) {
    if (groups.some((group) => group.some((other) => other.id === source.id))) continue;
    // Cached JSON pages can contain many distinct notices; they are not source documents.
    const matches = groups.filter((group) => group.some((other) =>
      (source.sourceUrl && other.sourceUrl && !/\.jsonl?(?:[?#]|$)/i.test(source.sourceUrl) && source.sourceUrl.split("#")[0] === other.sourceUrl.split("#")[0]) ||
      (source.bronzePath && /\.(?:pdf|docx?|rtf|txt|html?)$/i.test(source.bronzePath) && source.bronzePath === other.bronzePath)));
    if (!matches.length) groups.push([source]);
    else {
      matches[0].push(source, ...matches.slice(1).flat());
      for (const group of matches.slice(1)) groups.splice(groups.indexOf(group), 1);
    }
  }
  return groups;
}

export function firstSourceMentions(groups: Citation[][], mentions: string[][]): Citation[][][] {
  const seen = new Set<number>();
  return mentions.map((ids) => groups.filter((group, index) => {
    if (seen.has(index) || !group.some((source) => ids.includes(source.id))) return false;
    seen.add(index);
    return true;
  }));
}
