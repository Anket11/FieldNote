import { test as base, expect, type Page } from "@playwright/test";
import type { RunAgentInput, BaseEvent } from "@ag-ui/core";
import { ScriptedAgent } from "../../src/tests/fixtures/scriptedAgent";
export const test = base.extend({
  page: async ({ page }, runTest) => {
    // Every research endpoint is intercepted: no provider credentials or paid calls.
    await page.route("**/api/copilotkit{,/**}", async (route) => {
      const request = route.request(); const url = new URL(request.url());
      if (url.pathname.endsWith("/info")) {
        await route.fulfill({ json: { version: "test", agents: { default: { name: "default", className: "ScriptedAgent", description: "Deterministic test agent" } }, audioFileTranscriptionEnabled: false, threadEndpoints: { list: false, inspect: false, mutations: false, realtimeMetadata: false }, suggestions: false, telemetryDisabled: true } }); return;
      }
      if (url.pathname.endsWith("/run") && request.method() === "POST") {
        const input: RunAgentInput = request.postDataJSON();
        const events = await new Promise<BaseEvent[]>((resolve, reject) => { const result: BaseEvent[] = []; new ScriptedAgent({ threadId: input.threadId }).run(input).subscribe({ next: (event) => result.push(event), error: reject, complete: () => resolve(result) }); });
        await route.fulfill({ contentType: "text/event-stream", body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") }); return;
      }
      await route.fulfill({ json: {} });
    });
    await page.route("**/api/research/**", (route) => route.abort());
    await runTest(page);
  },
});
export { expect };
export async function openWorkspace(page: Page) {
  await page.goto("/workspace", { waitUntil: "domcontentloaded" }); await expect(page.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue("My research", { timeout: 30000 });
}
export async function research(page: Page, question = "Who won the Tuensang contract?") {
  await page.getByRole("textbox", { name: "Ask about procurement" }).fill(question);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("group", { name: "Answer actions" }).last()).toBeVisible();
}
export async function showNavigation(page: Page) {
  const show = page.getByRole("button", { name: "Show sidebar" }); if (await show.isVisible()) await show.click();
}
export async function highlight(page: Page) {
  await page.locator('[data-role="assistant"]').first().scrollIntoViewIfNeeded();
  await page.locator('[data-role="assistant"] p').first().evaluate((element) => {
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(page.getByRole("group", { name: "Selected text actions" })).toBeVisible();
}
