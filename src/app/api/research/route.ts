import { EventEncoder } from "@ag-ui/encoder";
import { databricksTools } from "@/server/databricks";
import { createResearchOrchestrator } from "@/server/research/orchestrator";
import { readResearchRequest } from "@/server/research/request";
import { safeResearchError } from "@/server/research/session";
import { EventType } from "@ag-ui/core";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Cross-origin research requests are not allowed." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return Response.json({ error: "Send an application/json request." }, { status: 415 });
  let input;
  try { input = await readResearchRequest(request); }
  catch (error) {
    const large = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
    return Response.json({ error: large ? "The research request is too large." : "Send threadId, runId and text messages ending with a user question." }, { status: large ? 413 : 400 });
  }
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "Set the server-only GEMINI_API_KEY before starting research." }, { status: 503 });
  let agent: ReturnType<typeof createResearchOrchestrator>;
  try { agent = createResearchOrchestrator(databricksTools()); }
  catch (error) { return Response.json({ error: safeResearchError(error) }, { status: 503 }); }

  const encoder = new EventEncoder({ accept: "text/event-stream" });
  const text = new TextEncoder();
  let stop = () => {};
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const finish = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timeout);
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", stop);
        if (!cancelled) controller.close();
      };
      const send = (event: Parameters<EventEncoder["encode"]>[0]) => {
        if (!closed) controller.enqueue(text.encode(encoder.encode(event)));
      };
      const heartbeat = setInterval(() => { if (!closed) controller.enqueue(text.encode(": keep-alive\n\n")); }, 15_000);
      const timeout = setTimeout(() => {
        send({ type: EventType.RUN_ERROR, code: "RESEARCH_TIMEOUT", message: "Research reached its five-minute limit. Try a narrower question." });
        agent.abortRun(); finish();
      }, 295_000);
      const subscription = agent.run(input).subscribe({
        next: (event) => { send(event); if (event.type === EventType.RUN_ERROR || event.type === EventType.RUN_FINISHED) finish(); },
        error: () => { send({ type: EventType.RUN_ERROR, code: "RESEARCH_FAILED", message: "The research stream could not finish. Retry this question." }); finish(); },
        complete: finish,
      });
      stop = () => { agent.abortRun(); subscription.unsubscribe(); finish(); };
      request.signal.addEventListener("abort", stop, { once: true });
      if (request.signal.aborted) stop();
    },
    cancel() { cancelled = true; stop(); },
  });
  return new Response(body, { headers: { "Content-Type": encoder.getContentType(), "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
