import { test, expect, openWorkspace, research, showNavigation, highlight } from "./fixtures";

test("landing explains the problem and navigates into the workspace", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("heading", { level: 1 })).toContainText("Better procurement");
  await expect(page.getByRole("heading", { name: /connections are missing/ })).toBeAttached();
  await page.getByRole("link", { name: "Open workspace", exact: true }).click(); await expect(page.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue("My research");
});
test("named workspaces remain isolated and survive a reload", async ({ page }) => {
  await openWorkspace(page); await showNavigation(page); await page.getByRole("button", { name: "New workspace", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("textbox", { name: "Workspace name", exact: true }).fill("Audit review"); await dialog.getByRole("button", { name: "Create workspace" }).click();
  await page.getByRole("button", { name: "Plan", exact: true }).click(); await page.getByRole("textbox", { name: "New task" }).fill("Check award evidence"); await page.getByRole("button", { name: "Add task" }).click();
  await page.reload(); await expect(page.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue("Audit review"); await page.getByRole("button", { name: "Plan 1", exact: true }).click(); await expect(page.getByRole("checkbox", { name: "Check award evidence" })).toBeVisible();
  await showNavigation(page); await page.getByRole("button", { name: "My research", exact: true }).click(); await page.getByRole("button", { name: "Plan", exact: true }).click(); await expect(page.getByRole("checkbox", { name: "Check award evidence" })).not.toBeVisible();
});
test("research uses the scripted agent, collapses sources and restores answers", async ({ page }) => {
  await openWorkspace(page); await research(page, "progress Who won the contract?");
  await expect(page.getByText("GE T&D India Limited", { exact: true })).toBeVisible();
  const sources = page.locator('details[data-component="SourcesSummary"]'); await expect(sources).not.toHaveAttribute("open"); await sources.locator("summary").click(); await expect(sources).toHaveAttribute("open");
  await page.reload(); await expect(page.getByText("GE T&D India Limited", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Note", exact: true })).toBeVisible();
});
test("answer notes and tags persist and edit in their Notebook card", async ({ page }) => {
  await openWorkspace(page); await research(page); await page.getByRole("button", { name: "Note", exact: true }).click(); await page.getByRole("textbox", { name: "Your note", exact: true }).fill("Check source evidence"); await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.getByRole("button", { name: "Add tag", exact: true }).click(); await page.getByRole("textbox", { name: "Tags, separated by commas" }).fill("Audit, audit, budget"); await page.getByRole("button", { name: "Save tags" }).click();
  await page.reload(); await page.getByRole("button", { name: "Notebook 1", exact: true }).click(); const card = page.getByRole("article"); await expect(card.getByText("Check source evidence")).toBeVisible();
  await card.getByRole("button", { name: "Edit note" }).click(); await card.getByRole("textbox", { name: "Your note" }).fill("Edited right here"); await card.getByRole("button", { name: "Save note" }).click(); await expect(card.getByText("Edited right here")).toBeVisible();
  await card.getByRole("button", { name: "Open answer" }).click(); await expect(page.getByRole("button", { name: "Edit note", exact: true })).toBeVisible();
});
test("standalone notes can be found by search and tags", async ({ page }) => {
  await openWorkspace(page); await page.getByRole("button", { name: "Notebook", exact: true }).click(); await page.getByRole("button", { name: "New note" }).click(); await page.getByRole("textbox", { name: "Title", exact: true }).fill("Audit scope"); await page.getByRole("textbox", { name: "Your note" }).fill("Compare multiple packages"); await page.getByRole("textbox", { name: "Tags, separated by commas" }).fill("scope"); await page.getByRole("button", { name: "Save note" }).click();
  await page.getByRole("textbox", { name: "Search notebook" }).fill("nonexistent"); await expect(page.getByText("No matching notes")).toBeVisible(); await page.getByRole("textbox", { name: "Search notebook" }).fill("scope"); await expect(page.getByRole("heading", { name: "Audit scope" })).toBeVisible();
});
test("source annotations stay attached to their source and reopen it", async ({ page }) => {
  await openWorkspace(page); await research(page); await page.getByRole("button", { name: /^Source:/ }).first().click(); const preview = page.getByRole("dialog");
  await preview.getByRole("button", { name: "Note", exact: true }).click(); await preview.getByRole("textbox", { name: "Your note" }).fill("Source needs review"); await preview.getByRole("button", { name: "Save note" }).click(); await preview.getByRole("button", { name: "Close source preview" }).click();
  await page.getByRole("button", { name: "Notebook 1", exact: true }).click(); await expect(page.getByText("Source annotation", { exact: true })).toBeVisible(); await page.getByRole("button", { name: "Open source", exact: true }).click(); await expect(page.getByRole("region", { name: "Document reader" })).toBeVisible();
});
test("selected text tools fill a follow-up draft without sending it", async ({ page }) => {
  await openWorkspace(page); await research(page); await highlight(page); await page.getByRole("button", { name: "Ask follow-up", exact: true }).click(); await expect(page.getByRole("textbox", { name: "Ask about procurement" })).toHaveValue(/Explain this passage[\s\S]*GE T&D India Limited/); await expect(page.getByRole("group", { name: "Answer actions" })).toHaveCount(1);
});
test("selected passages save as quoted Notebook entries", async ({ page }) => {
  await openWorkspace(page); await research(page); await highlight(page); const tools = page.locator("[data-selection-tools]"); await tools.getByRole("button", { name: "Note", exact: true }).click(); await tools.getByRole("textbox", { name: "Your note" }).fill("A highlighted finding"); await tools.getByRole("button", { name: "Save note" }).click(); await tools.getByRole("button", { name: "Dismiss selection tools" }).click(); await page.getByRole("button", { name: "Notebook 1", exact: true }).click(); await expect(page.getByRole("article").locator("blockquote")).toContainText("GE T&D India Limited");
});
test("research history jumps to the right question and wraps long text", async ({ page }) => {
  await openWorkspace(page); await research(page, "Who won the Tuensang contract? ".repeat(8)); await research(page, "unknown historical risk"); const history = page.locator("details").filter({ has: page.locator("summary", { hasText: "Research history" }) }); await history.locator("summary").click(); await expect(history.getByRole("button")).toHaveCount(2); await history.getByRole("button", { name: /Who won/ }).click(); await expect(page.locator('[id^="question-"]').last()).toBeFocused();
});
test("map view has a usable list fallback without a token", async ({ page }) => {
  await openWorkspace(page); await research(page, "Find similar procurements as a list"); await page.getByRole("button", { name: "Map", exact: true }).click(); await expect(page.getByText(/Map unavailable/)).toBeVisible(); await expect(page.getByRole("region", { name: "Details", exact: true })).toBeVisible(); await page.getByRole("button", { name: "List", exact: true }).click(); await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
});
test("temporary agent failures retry and eventually show the answer", async ({ page }) => {
  await openWorkspace(page); await research(page, "fail Who won the contract?"); await expect(page.getByText("GE T&D India Limited — scripted retry succeeded.")).toBeVisible();
});
test("workspace fits the viewport and navigation works at this device size", async ({ page }) => {
  await openWorkspace(page); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await showNavigation(page); await expect(page.getByRole("button", { name: "New workspace" })).toBeVisible();
});
