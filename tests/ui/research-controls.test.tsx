import { expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatComposer from "../../src/components/app/ChatComposer";
import SourcesSummary from "../../src/components/app/evidence/SourcesSummary";
import Collection from "../../src/components/agent/Collection";
import DocumentReader from "../../src/components/app/evidence/DocumentReader";
import LibrarySearch from "../../src/components/app/LibrarySearch";
import { WorkspacePlan } from "../../src/components/app/WorkspaceTools";
import { buildDemoResult } from "../../src/services/research";
import { WorkspaceHarness } from "./harness";
const library = buildDemoResult(); const source = Object.values(library.citationsById)[0];
function Composer({ onSend, running = false, onStop = vi.fn() }: { onSend: () => void; running?: boolean; onStop?: () => void }) { const [value, onChange] = useState(""); return <ChatComposer value={value} onChange={onChange} onSend={onSend} ready running={running} onStop={onStop} welcome />; }
it("composer prevents empty requests and sends Enter once", async () => {
 const user = userEvent.setup(); const send = vi.fn(); render(<Composer onSend={send} />); expect(screen.getByRole("button", { name: "Send" })).toBeDisabled(); await user.type(screen.getByLabelText("Ask about procurement"), "Find awards{Enter}"); expect(send).toHaveBeenCalledTimes(1);
});
it("Shift+Enter adds a line without sending", async () => {
 const user = userEvent.setup(); const send = vi.fn(); render(<Composer onSend={send} />); await user.type(screen.getByLabelText("Ask about procurement"), "First{Shift>}{Enter}{/Shift}Second"); expect(send).not.toHaveBeenCalled(); expect(screen.getByLabelText("Ask about procurement")).toHaveValue("First\nSecond");
});
it("a starter fills an editable draft without submitting", async () => {
 const user = userEvent.setup(); const send = vi.fn(); render(<Composer onSend={send} />); await user.click(screen.getByRole("button", { name: /Review requirements/ })); expect(screen.getByLabelText("Ask about procurement")).toHaveProperty("value", expect.stringContaining("qualification")); expect(send).not.toHaveBeenCalled();
});
it("Stop remains actionable while the next draft stays editable", async () => {
 const user = userEvent.setup(); const stop = vi.fn(); render(<Composer onSend={vi.fn()} running onStop={stop} />); await user.type(screen.getByLabelText("Ask about procurement"), "Next request"); await user.click(screen.getByRole("button", { name: "Stop generating" })); expect(stop).toHaveBeenCalledOnce(); expect(screen.getByLabelText("Ask about procurement")).toHaveValue("Next request");
});
it("sources expand while researching, collapse on completion, and can reopen", async () => {
 const user = userEvent.setup(); const onOpen = vi.fn(); const { rerender } = render(<SourcesSummary groups={[[source]]} onOpen={onOpen} loading />); const details = screen.getByLabelText("Answer sources"); expect(details).toHaveAttribute("open"); rerender(<SourcesSummary groups={[[source]]} onOpen={onOpen} loading={false} />); expect(details).not.toHaveAttribute("open"); await user.click(screen.getByText("Sources")); expect(details).toHaveAttribute("open"); await user.click(screen.getByRole("button", { name: new RegExp(source.title.slice(0, 12)) })); expect(onOpen).toHaveBeenCalledWith(source);
});
it("list and map views preserve selection and the detail relationship", async () => {
 const user = userEvent.setup(); render(<Collection title="Packages" items={[{ id: "a", title: "First" }, { id: "b", title: "Second" }]} renderDetails={(item) => <p>Detail: {item.title}</p>} renderMap={(_, selectedId, select) => <button onClick={() => select("a")}>Map selection: {selectedId}</button>} />);
 await user.click(screen.getByRole("button", { name: "Second" })); expect(screen.getByText("Detail: Second")).toBeVisible(); await user.click(screen.getByRole("button", { name: "Map" })); expect(screen.getByRole("button", { name: "Map selection: b" })).toBeVisible(); await user.click(screen.getByRole("button", { name: "Map selection: b" })); await user.click(screen.getByRole("button", { name: "List" })); expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-pressed", "true");
});
it("library search narrows records and opens the selected source", async () => {
 const user = userEvent.setup(); const open = vi.fn(); render(<LibrarySearch library={library} draft="" onOpenSource={open} />); await user.click(screen.getByRole("button", { name: "Search library" })); await user.type(screen.getByRole("searchbox"), "Tuensang"); await user.click(screen.getAllByRole("button", { name: /Open source passage/ })[0]); expect(open).toHaveBeenCalledOnce(); expect(screen.queryByRole("searchbox")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Search library" })).toHaveFocus();
});
it("Escape closes library search and restores trigger focus", async () => {
 const user = userEvent.setup(); render(<LibrarySearch library={library} draft="" />); await user.click(screen.getByRole("button", { name: "Search library" })); await user.keyboard("{Escape}"); expect(screen.queryByRole("searchbox")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Search library" })).toHaveFocus();
});
it("source reader escapes markup, blocks unsafe links, and closes with Escape", async () => {
 const user = userEvent.setup(); const close = vi.fn(); render(<DocumentReader source={{ ...source, text: "<script>alert(1)</script><p>Evidence</p>", sourceUrl: "javascript:alert(1)" }} onClose={close} />); expect(screen.getByText("Evidence")).toBeVisible(); expect(screen.queryByRole("link")).not.toBeInTheDocument(); await user.keyboard("{Escape}"); expect(close).toHaveBeenCalledOnce();
});
it("Plan adds, completes, and removes a task", async () => {
 const user = userEvent.setup(); render(<WorkspaceHarness><WorkspacePlan /></WorkspaceHarness>); expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled(); await user.type(screen.getByRole("textbox", { name: "New task" }), "Check award evidence"); await user.click(screen.getByRole("button", { name: "Add task" })); await user.click(screen.getByRole("checkbox", { name: "Check award evidence" })); expect(screen.getByText("1 of 1 tasks complete")).toBeVisible(); await user.click(screen.getByRole("button", { name: "Remove task: Check award evidence" })); expect(screen.getByText("A clearer next step.")).toBeVisible();
});
