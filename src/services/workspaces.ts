import { z } from "zod";
import { MessageSchema } from "@ag-ui/core/schemas";
import type { Message } from "@ag-ui/core";
import { validateAnswer } from "./chatLibrary";
import type { ChecklistEdit, ResearchAnswer, ResearchRun } from "../types/chat";

export interface ResearchSnapshot {
  messages: Message[];
  answers: Record<string, ResearchAnswer>;
  answerQueries: Record<string, string>;
  checklistEdits: Record<string, ChecklistEdit>;
  runs: Record<string, ResearchRun>;
}
export interface NotebookEntry { id: string; questionId?: string; sourceId?: string; quote?: string; title: string; preview: string; note: string; tags: string[]; updatedAt: string }
export interface WorkspaceTask { id: string; text: string; done: boolean }
export interface Workspace {
  id: string; title: string; createdAt: string;
  entries: NotebookEntry[]; tasks: WorkspaceTask[];
  research: ResearchSnapshot;
}
export interface WorkspaceStore { version: 1; activeId: string; workspaces: Workspace[] }
export const WORKSPACE_STORAGE_KEY = "procurement-workspaces-v1";
const key = z.string().min(1).max(200).refine((value) => !["__proto__", "constructor", "prototype"].includes(value));
const taskState = z.enum(["pending", "running", "completed", "failed", "stopped"]);
const researchSchema = z.object({
  messages: z.array(z.unknown().transform((message): Message => MessageSchema.parse(message))),
  answers: z.record(key, z.unknown().transform((answer) => validateAnswer(answer))),
  answerQueries: z.record(key, z.string()),
  checklistEdits: z.record(key, z.object({ done: z.boolean(), notes: z.string() })),
  runs: z.record(key, z.object({ runId: z.string(), state: z.enum(["running", "completed", "stopped", "failed"]), status: z.string(),
    tasks: z.array(z.object({ id: z.string(), label: z.string(), status: taskState })),
    activity: z.array(z.object({ id: z.string(), label: z.string(), status: taskState })), sourceIds: z.array(z.string()),
  })),
});
const workspaceSchema = z.object({
  id: key, title: z.string().trim().min(1).max(80), createdAt: z.string(),
  entries: z.array(z.object({ id: key, questionId: key.optional(), sourceId: key.optional(), quote: z.string().max(10000).optional(), title: z.string(), preview: z.string(), note: z.string().max(10000), tags: z.array(z.string().min(1).max(40)).max(20), updatedAt: z.string() })),
  tasks: z.array(z.object({ id: key, text: z.string().trim().min(1).max(500), done: z.boolean() })),
  research: researchSchema,
});
const storeSchema = z.object({ version: z.literal(1), activeId: key, workspaces: z.array(workspaceSchema).min(1) });
export function emptyResearch(): ResearchSnapshot { return { messages: [], answers: {}, answerQueries: {}, checklistEdits: {}, runs: {} }; }
export function createWorkspace(title: string): Workspace {
  return { id: crypto.randomUUID(), title: title.trim().slice(0, 80) || "My research", createdAt: new Date().toISOString(), entries: [], tasks: [], research: emptyResearch() };
}
export function parseWorkspaces(raw: string): WorkspaceStore {
  const store = storeSchema.parse(JSON.parse(raw));
  if (new Set(store.workspaces.map((workspace) => workspace.id)).size !== store.workspaces.length) throw new Error("Duplicate workspace IDs.");
  if (!store.workspaces.some((workspace) => workspace.id === store.activeId)) store.activeId = store.workspaces[0].id;
  for (const workspace of store.workspaces) for (const run of Object.values(workspace.research.runs)) {
    if (run.state === "running") { run.state = "stopped"; run.status = "Research was interrupted. Ask the question again to continue."; }
  }
  return store;
}
export function normalizeTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLocaleLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 20);
}
export function updateWorkspace(store: WorkspaceStore, id: string, update: (workspace: Workspace) => Workspace): WorkspaceStore {
  return { ...store, workspaces: store.workspaces.map((workspace) => workspace.id === id ? update(workspace) : workspace) };
}
export function saveNotebookEntry(workspace: Workspace, entry: NotebookEntry): Workspace {
  const exists = workspace.entries.some((item) => item.id === entry.id);
  if (!entry.note.trim() && !entry.tags.length) return { ...workspace, entries: workspace.entries.filter((item) => item.id !== entry.id) };
  return { ...workspace, entries: exists ? workspace.entries.map((item) => item.id === entry.id ? entry : item) : [entry, ...workspace.entries] };
}
