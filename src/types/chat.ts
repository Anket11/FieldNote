import type { MapTarget, MapView } from "./geography";

interface Claim { text: string; recordId?: string; citationIds: string[] }
export interface ChecklistItem { id: string; recordId?: string; suggestion?: string }
export type DetailKey = "text" | "location" | "supplier" | "awardValue" | "duration" | "relevance" | "differences" | "unknowns";
export interface CollectionOutput {
  kind: "collection";
  recordIds: string[];
  view: "list" | "map";
  title?: string;
  layout?: "list" | "split";
  selectedId?: string;
  detailFields?: DetailKey[];
  fields?: ("text" | "relevance" | "differences" | "unknowns")[];
  targetLocation?: MapTarget;
}
type ResearchOutput =
  | CollectionOutput
  | { kind: "checklist"; items: ChecklistItem[]; title?: string }
  | { kind: "location"; query: string; coordinates?: [number, number]; view: MapView };
export interface ResearchAnswer { chatTitle?: string; claims: Claim[]; output?: ResearchOutput; outputs?: ResearchOutput[]; followUpQuestions?: string[] }
export interface ChecklistEdit { done: boolean; notes: string }

export interface ResearchTask {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "stopped";
}
export interface ResearchRun {
  runId: string;
  state: "running" | "completed" | "stopped" | "failed";
  status: string;
  tasks: ResearchTask[];
  activity: { id: string; label: string; status: ResearchTask["status"] }[];
  sourceIds: string[];
}

export function answerOutputs(answer: ResearchAnswer): ResearchOutput[] {
  return answer.outputs ?? (answer.output ? [answer.output] : []);
}
