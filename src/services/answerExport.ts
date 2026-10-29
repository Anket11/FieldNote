import { answerOutputs, type ChecklistEdit, type ResearchAnswer } from "../types/chat";
import type { ResearchResult } from "../types/research";
import { answerSources } from "./answerSources";

export function formatAnswer(question: string, plainText: string[], answers: { id: string; answer: ResearchAnswer }[], library: ResearchResult,
  edits: Record<string, ChecklistEdit> = {}) {
  const records = new Map(library.sections.flatMap((section) => section.items).map((record) => [record.id, record]));
  const parts = [`# ${question}`, ...plainText];
  for (const { id, answer } of answers) {
    parts.push(...answer.claims.map((claim) => claim.text));
    for (const output of answerOutputs(answer)) {
      if (output.kind === "location") parts.push(`## Location\n${output.query} · ${output.view}${output.coordinates ? `\nLatitude, longitude: ${output.coordinates[1]}, ${output.coordinates[0]}` : ""}`);
      if (output.kind === "collection") {
        parts.push(`## ${output.title ?? "Results"}`);
        if (output.targetLocation) parts.push(`Target: ${output.targetLocation.name}\nLatitude, longitude: ${output.targetLocation.coordinates[1]}, ${output.targetLocation.coordinates[0]}`);
        for (const recordId of output.recordIds) {
          const record = records.get(recordId);
          if (record) parts.push(`### ${record.title}\n${record.text}`);
        }
      }
      if (output.kind === "checklist") {
        parts.push(`## ${output.title ?? "Checklist"}`);
        for (const item of output.items) {
          const edit = edits[`${id}:${item.id}`];
          parts.push(`- [${edit?.done ? "x" : " "}] ${records.get(item.recordId ?? "")?.title ?? item.suggestion ?? "Checklist item"}${edit?.notes ? `\n  Notes: ${edit.notes}` : ""}`);
        }
      }
    }
    const groups = answerSources(answer, library);
    if (groups.length) parts.push("## Sources", ...groups.map(([source]) =>
      `- ${source.title} · ${source.projectTitle} (${source.projectId})${source.sourceUrl && /^https?:\/\//i.test(source.sourceUrl) ? `\n  ${source.sourceUrl}` : ""}`));
  }
  return parts.filter(Boolean).join("\n\n");
}
