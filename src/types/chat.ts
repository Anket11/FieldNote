import type { MapView } from "./geography";

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
  projectId?: string;
  fields?: ("text" | "relevance" | "differences" | "unknowns")[];
}
type ResearchOutput =
  | CollectionOutput
  | { kind: "checklist"; items: ChecklistItem[]; title?: string }
  | { kind: "location"; query: string; view: MapView };
export interface ResearchAnswer { claims: Claim[]; output?: ResearchOutput }
export interface ChecklistEdit { done: boolean; notes: string }
