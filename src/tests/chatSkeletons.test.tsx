import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import WorkspaceHeader from "../components/app/WorkspaceHeader";
import ChatIcon from "../components/app/ChatIcon";
import LocationView from "../components/agent/location/LocationView";
import ChatSidebar from "../components/app/ChatSidebar";
import ResearchProgress from "../components/app/ResearchProgress";
import FollowUpQuestions from "../components/app/FollowUpQuestions";
import AnswerActions from "../components/app/AnswerActions";
import ConversationNavigation from "../components/app/ConversationNavigation";
import SourcesSummary from "../components/app/evidence/SourcesSummary";
import DocumentReader from "../components/app/evidence/DocumentReader";
import type { Citation } from "../types/research";
import ChatComposer from "../components/app/ChatComposer";
import { AnswerStateContext, ResearchAnswerRenderer } from "../components/app/AnswerRenderer";

const source: Citation = {
  id: "source-1", title: "Procurement report", text: "<p>Source passage</p><script>unsafe()</script>", mentions: [],
  projectId: "P127974", projectTitle: "Power project", sectionTitle: "Findings",
  sourceUrl: "https://documents.worldbank.org/report.pdf",
};

test("the composer exposes Stop and keeps the next draft editable during a run", () => {
  const html = renderToStaticMarkup(<ChatComposer value="Next question" onChange={() => {}} onSend={() => {}}
    onStop={() => {}} ready running />);
  assert.match(html, /aria-label="Stop generating"/);
  assert.doesNotMatch(html, /<textarea[^>]*disabled|type="submit"/);
  assert.match(html, /Next question/);
  assert.match(html, /aria-label="Search library"/);
  assert.doesNotMatch(html, /Library research/);
});

test("a rejected tool output does not leave a stale error card under a retried question", () => {
  const html = renderToStaticMarkup(<AnswerStateContext.Provider value={{ answers: {}, checklistEdits: {}, onEditItem: () => {} }}>
    <ResearchAnswerRenderer toolCallId="rejected-output" status="complete" />
  </AnswerStateContext.Provider>);
  assert.equal(html, "");
});

test("progress renders only supplied operational status, tasks and activity", () => {
  const idle = renderToStaticMarkup(<ResearchProgress status="Connecting…" />);
  assert.match(idle, /role="status"/);
  assert.doesNotMatch(idle, /<details|Plan|Activity/);
  const html = renderToStaticMarkup(<ResearchProgress status="Reading sources" tasks={[
    { id: "search", label: "Find records", status: "completed" },
    { id: "read", label: "Read documents", status: "running" },
  ]} activity={[{ id: "event-1", label: "Retrieved two documents" }]} />);
  assert.match(html, /1\/2 completed/);
  assert.match(html, /data-status="running"/);
  assert.match(html, /Retrieved two documents/);
});

test("source summary handles empty groups and counts supplied document groups", () => {
  const empty = renderToStaticMarkup(<SourcesSummary groups={[]} onOpen={() => {}} loading />);
  assert.match(empty, /Sources · 0/);
  assert.match(empty, /No sources yet/);
  const html = renderToStaticMarkup(<SourcesSummary groups={[[], [source, { ...source, id: "passage-2" }]]} onOpen={() => {}} />);
  assert.match(html, /Sources · 1/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.match(html, /Power project/);
});

test("follow-ups, actions and navigation render only supported controls", () => {
  assert.equal(renderToStaticMarkup(<FollowUpQuestions questions={[]} onSelect={() => {}} />), "");
  assert.equal(renderToStaticMarkup(<AnswerActions actions={[]} />), "");
  assert.equal(renderToStaticMarkup(<ConversationNavigation questions={[]} onSelect={() => {}} />), "");
  const html = renderToStaticMarkup(<>
    <FollowUpQuestions questions={["Compare the packages"]} onSelect={() => {}} disabled />
    <AnswerActions actions={[{ id: "export", label: "Export answer", onClick: () => {} }]} />
    <ConversationNavigation questions={[{ id: "q-1", label: "First question" }]} activeId="q-1" onSelect={() => {}} />
  </>);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-current="location"/);
  assert.match(html, /Export answer/);
  assert.doesNotMatch(html, /Read Aloud|Bookmark/);
});

test("reader escapes source text, rejects unsafe links and supports a document slot", () => {
  const html = renderToStaticMarkup(<DocumentReader source={source} onClose={() => {}} />);
  assert.match(html, /Source passage/);
  assert.doesNotMatch(html, /unsafe\(\)|&lt;script|<script/);
  assert.match(html, /href="https:\/\/documents.worldbank.org\/report.pdf"/);
  assert.match(html, /Close document/);
  const unsafe = renderToStaticMarkup(<DocumentReader source={{ ...source, sourceUrl: "javascript:alert(1)" }} onClose={() => {}} />);
  assert.doesNotMatch(unsafe, /href=|<script>/);
  const document = renderToStaticMarkup(<DocumentReader source={source} onClose={() => {}}><p>Document viewer</p></DocumentReader>);
  assert.match(document, /Document viewer/);
  assert.doesNotMatch(document, /Source passage/);
});


test("the branded header exposes the sidebar state and hidden navigation retains chat controls", () => {
  const header = renderToStaticMarkup(<WorkspaceHeader sidebarOpen={false} sidebarId="chat-navigation" onToggle={() => {}} />);
  assert.match(header, /aria-label="Show sidebar"/);
  assert.match(header, /aria-expanded="false"/);
  assert.match(header, /aria-controls="chat-navigation"/);
  assert.match(header, /world-bank-institute.svg/);
  const sidebar = renderToStaticMarkup(<ChatSidebar id="chat-navigation" hidden chats={[{ id: "chat", title: "Power research" }]} activeId="chat" onNew={() => {}} onSelect={() => {}} />);
  assert.match(sidebar, /hidden=""/);
  assert.match(sidebar, /New workspace/);
  assert.match(sidebar, /aria-label="Power research"/);
});

test("Workspace controls a separate chat list with New workspace and the active chat", () => {
  const html = renderToStaticMarkup(<ChatSidebar workspaceOpen onWorkspaceToggle={() => {}} chats={[{ id: "one", title: "Tuensang Research" }]} activeId="one" onNew={() => {}} onSelect={() => {}} />);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-label="Workspace list"/);
  assert.match(html, /Close workspace list/);
  assert.match(html, /New workspace/);
  assert.match(html, /aria-label="Tuensang Research" aria-pressed="true"/);
});


test("shared icons use Lucide and terrain is labelled 3D", () => {
  assert.match(renderToStaticMarkup(<ChatIcon name="home" />), /lucide/);
  const html = renderToStaticMarkup(<LocationView query="26.2, 94.8" />);
  assert.match(html, />3D<\/button>/);
  assert.doesNotMatch(html, /Copernicus 3D/);
});


test("new research offers three editable starters and active research uses a compact composer", () => {
  const props = { value: "", onChange: () => {}, onSend: () => {}, ready: true, running: false };
  const welcome = renderToStaticMarkup(<ChatComposer {...props} welcome />);
  assert.match(welcome, /Research starting points/);
  for (const title of ["Find comparable packages", "Review requirements", "Learn from past projects"]) assert.match(welcome, new RegExp(title));
  assert.match(welcome, /rows="2"/);
  const active = renderToStaticMarkup(<ChatComposer {...props} />);
  assert.doesNotMatch(active, /Research starting points/);
  assert.match(active, /rows="1"/);
  assert.match(active, /Ask a follow-up/);
});


test("sources expand during research and collapse when results are ready", () => {
  const props = { groups: [[source]], onOpen: () => {} };
  const researching = renderToStaticMarkup(<SourcesSummary {...props} loading />);
  assert.match(researching, /<details[^>]*open=""/);
  const completed = renderToStaticMarkup(<SourcesSummary {...props} loading={false} />);
  assert.doesNotMatch(completed, /<details[^>]*open=/);
  assert.match(completed, /Procurement report/);
  assert.match(completed, /<summary/);
});
