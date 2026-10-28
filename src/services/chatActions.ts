import { z } from "zod";
import type { ChecklistEdit, ResearchAnswer } from "../types/chat";

export const checklistChangeSchema = z.object({
  outputId: z.string().min(1).max(200), itemId: z.string().min(1).max(200),
  done: z.boolean().optional(), notes: z.string().max(4000).optional(),
}).strict();
export function validateChecklistChange(value: unknown, answers: Record<string, ResearchAnswer>, request: string) {
  const change = checklistChangeSchema.parse(value);
  if (change.done === undefined && change.notes === undefined) throw new Error("Specify a checklist change.");
  const commands = request.trim().split(/\s+(?:and|then)\s+|[;\n]/i)
    .map((command) => command.trim().replace(/^(?:please|(?:can|could|would) you)\s+/i, ""));
  const completionCommands = commands.filter((command) => /^(?:mark|set|update|change|check off|tick off|uncheck|untick)\b/i.test(command));
  const negative = completionCommands.some((command) => /\b(?:uncheck|untick|incomplete|unchecked|not (?:done|complete|completed|checked))\b/i.test(command));
  const positive = completionCommands.some((command) => /\b(?:check off|tick off|done|complete|completed|checked)\b/i.test(command));
  if (change.done !== undefined && (change.done ? !positive || negative : !negative)) throw new Error("Explicit completion or uncompletion instructions are required.");
  if (change.notes !== undefined && !commands.some((command) => /^(?:add|write|update|set|change)\b.*\bnotes?\b/i.test(command))) throw new Error("Explicit note instructions are required.");
  const output = Object.hasOwn(answers, change.outputId) ? answers[change.outputId].output : undefined;
  if (output?.kind !== "checklist" || !output.items.some((item) => item.id === change.itemId)) throw new Error("Unknown checklist item in this chat.");
  const changes: Partial<ChecklistEdit> = {};
  if (change.done !== undefined) changes.done = change.done;
  if (change.notes !== undefined) changes.notes = change.notes;
  return { key: `${change.outputId}:${change.itemId}`, changes };
}
