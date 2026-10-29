import type { AgentSubscriber } from "@ag-ui/client";
import { researchPlanSchema, evidenceAssessmentSchema } from "./chatLibrary";
import { answerSources } from "./answerSources";
import type { ResearchAnswer, ResearchRun } from "../types/chat";
import type { ResearchResult } from "../types/research";

const labels: Record<string, string> = {
  assessEvidence: "Checking evidence coverage",
  reportResearchPlan: "Updating research plan",
  lookupLibrary: "Searching supplied procurement records",
  readSources: "Reading source documents",
  presentResearchAnswer: "Preparing the answer",
  editChecklist: "Updating checklist",
};

/** One tracker per attempt; terminal runs ignore late stream events. */
export function createResearchProgress(runId: string, library: ResearchResult, onChange: (run: ResearchRun) => void, attempt = 1, previous?: ResearchRun) {
  const retryLabel = `Research did not finish. Retrying (${attempt}/3)…`;
  let run: ResearchRun = { runId, state: "running", status: attempt > 1 ? retryLabel : "Starting research…",
    tasks: previous?.tasks ?? [], sourceIds: previous?.sourceIds ?? [],
    activity: [...(previous?.activity ?? []), ...(attempt > 1 ? [{ id: `${runId}-retry`, label: retryLabel, status: "completed" as const }] : [])] };
  const calls = new Map<string, string>();
  const assistantMessages = new Set<string>();
  let hasAnswer = false;
  function update(changes: Partial<ResearchRun>) {
    if (run.state !== "running") return;
    run = { ...run, ...changes };
    onChange(run);
  }
  function finish(state: Exclude<ResearchRun["state"], "running">, status: string) {
    update({ state, status, activity: run.activity.map((item) => item.status === "running"
      ? { ...item, status: state === "stopped" ? "stopped" : "failed" } : item),
      tasks: run.tasks.map((task) => task.status === "running" && state !== "completed"
        ? { ...task, status: state === "stopped" ? "stopped" : "failed" } : task) });
  }
  function completeTool(id: string) {
    if (run.state !== "running") return;
    if (calls.get(id) === "editChecklist") hasAnswer = true;
    const activity = run.activity.map((item) => item.id === id ? { ...item, status: "completed" as const } : item);
    update({ activity, ...(!activity.some((item) => item.status === "running") ? { status: "Reviewing results…" } : {}) });
  }
  function addSources(ids: string[]) {
    update({ sourceIds: [...new Set([...run.sourceIds, ...ids.filter((id) => Object.hasOwn(library.citationsById, id))])] });
  }
  const subscriber: AgentSubscriber = {
    onToolCallStartEvent: ({ event }) => {
      calls.set(event.toolCallId, event.toolCallName);
      const label = event.toolCallName === "lookupLibrary" && run.activity.some((item) => item.label.includes("Searching"))
        ? "Searching for more matching records" : labels[event.toolCallName] ?? "Running agent action";
      update({ status: `${label}…`, activity: [...run.activity, { id: event.toolCallId, label, status: "running" }] });
    },
    onToolCallResultEvent: ({ event }) => {
      const name = calls.get(event.toolCallId);
      // Tool results are untrusted; display only locally known sources and validated plan fields.
      try {
        const value: unknown = typeof event.content === "string" ? JSON.parse(event.content) : undefined;
        if (name === "assessEvidence") {
          const assessment = evidenceAssessmentSchema.safeParse(value && typeof value === "object" ? {
            sufficient: "sufficient" in value ? value.sufficient : undefined,
            gaps: "gaps" in value ? value.gaps : undefined,
            nextQuery: "nextQuery" in value ? value.nextQuery : undefined,
          } : value);
          if (assessment.success) {
            completeTool(event.toolCallId);
            const label = assessment.data.sufficient ? "Evidence checked. Preparing the answer…" : "Evidence is incomplete. Searching for more information…";
            update({ status: label, activity: run.activity.map((item) => item.id === event.toolCallId
              ? { ...item, label: `${label}${assessment.data.gaps.length ? ` Gaps: ${assessment.data.gaps.join("; ")}` : ""}` } : item) });
            return;
          }
        }
        if (name === "reportResearchPlan") {
          const plan = researchPlanSchema.safeParse(value);
          if (plan.success) update({ tasks: plan.data.tasks });
        }
        if (name === "readSources" && Array.isArray(value)) {
          addSources(value.flatMap((item) => item && typeof item === "object" && "id" in item && typeof item.id === "string" ? [item.id] : []));
        }
        if (value && typeof value === "object" && "error" in value) {
          update({ activity: run.activity.map((item) => item.id === event.toolCallId ? { ...item, status: "failed" } : item) });
          return;
        }
      } catch { /* Non-JSON tool results contain no trusted source or plan metadata. */ }
      completeTool(event.toolCallId);
    },
    onTextMessageStartEvent: ({ event }) => {
      if (event.role === "assistant") {
        assistantMessages.add(event.messageId);
        update({ status: "Writing the answer…" });
      }
    },
    onTextMessageContentEvent: ({ event }) => {
      if (run.state === "running" && assistantMessages.has(event.messageId) && event.delta.trim()) hasAnswer = true;
    },
    onReasoningStartEvent: () => { update({ status: "Considering your request…" }); },
    onRunErrorEvent: () => { finish("failed", "Research failed. You can retry this question."); },
    onRunFailed: () => { finish("failed", "Research failed. You can retry this question."); },
  };
  onChange(run);
  return {
    subscriber,
    answer: (answer: ResearchAnswer, toolCallId: string) => {
      if (run.state !== "running") return;
      hasAnswer = true;
      addSources(answerSources(answer, library).flatMap((group) => group.map((source) => source.id)));
      completeTool(toolCallId);
    },
    completeTool,
    complete: () => {
      if (hasAnswer) finish("completed", "Research complete.");
      else finish("failed", "Research ended before an answer was returned. Retry this question.");
    },
    fail: () => { finish("failed", "Research failed. You can retry this question."); },
    stop: () => { finish("stopped", "Research stopped. Any partial answer is kept below."); },
    getSnapshot: () => run,
  };
}
