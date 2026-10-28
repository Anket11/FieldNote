import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import List from "../components/agent/List";
import Collection from "../components/agent/Collection";
import Details from "../components/agent/Details";
import Checklist from "../components/agent/Checklist";
import ChatMessages from "../components/app/ChatMessages";

test("agent components render arbitrary labelled data and slots without an app provider", () => {
  const html = renderToStaticMarkup(<>
    <Collection title="Site decisions" initialFilter="open" filters={[{ id: "open", label: "Open" }]}
      items={[{ id: "a", title: "Access road", groupIds: ["open"], content: <Details fields={[{ label: "Owner", value: "Site team" }, { label: "Due", value: undefined }]} />, meta: <a href="#source">[1]</a> },
        { id: "b", title: "Filtered record", groupIds: ["closed"] }]} />
    <Checklist label="Next steps" notesLabel="Decision notes" items={[{ id: "visit", title: "Visit the site", done: false, notes: "<keep escaped>", context: "Tentative" }]} onChange={() => {}} />
  </>);
  for (const text of ["Site decisions", "Access road", "Site team", "Not specified", "Decision notes", "Tentative", "&lt;keep escaped&gt;", 'href="#source"']) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /Filtered record|Procurement|Source project/);
  const list = renderToStaticMarkup(<List label="Choices" items={[{ id: "x", title: "Option A" }]} selectedId="x" onSelect={() => {}} controlsId="details" />);
  assert.match(list, /aria-pressed="true"/);
  assert.match(list, /aria-controls="details"/);
});

test("newest conversation turn comes first while questions precede their answers", () => {
  const messages = [
    { id: "q1", role: "user" as const, text: "First question" },
    { id: "a1", role: "assistant" as const, text: "First answer" },
    { id: "q2", role: "user" as const, text: "Latest question" },
    { id: "a2", role: "assistant" as const, text: "Latest answer", output: <List items={[{ id: "result", title: "Latest result" }]} /> },
  ];
  const before = JSON.stringify(messages);
  const html = renderToStaticMarkup(<ChatMessages messages={messages} />);
  assert.ok(html.indexOf("Latest question") < html.indexOf("Latest answer"));
  assert.ok(html.indexOf("Latest result") < html.indexOf("First question"));
  assert.ok(html.indexOf("First question") < html.indexOf("First answer"));
  const pending = renderToStaticMarkup(<ChatMessages messages={[...messages, { id: "q3", role: "user", text: "Pending question" }]} />);
  assert.ok(pending.indexOf("Pending question") < pending.indexOf("Latest question"));
  assert.equal(JSON.stringify(messages), before);
});

test("split collections share selection between list/map and a reusable detail slot", () => {
  const items = [{ id: "a", title: "First choice" }, { id: "b", title: "Second choice" }];
  const details = (item: { id: string }) => <Details fields={[{ label: "Decision", value: `Detail for ${item.id}` }]} />;
  for (const view of ["list", "map"] as const) {
    const html = renderToStaticMarkup(<Collection items={items} initialView={view} initialSelectedId="b" renderDetails={details}
      renderMap={(_, selectedId) => <p>Map selection: {selectedId}</p>} />);
    assert.match(html, /md:grid-cols-2/);
    assert.match(html, /Detail for b/);
    assert.doesNotMatch(html, /Detail for a/);
    if (view === "map") assert.match(html, /Map selection: b/);
    else {
      const target = html.match(/aria-controls="([^"]+)"/)?.[1];
      assert.ok(target);
      assert.ok(html.includes(`id="${target}" aria-label="Details"`));
    }
  }
  const filtered = renderToStaticMarkup(<Collection items={[{ ...items[0], groupIds: ["visible"] }, { ...items[1], groupIds: ["hidden"] }]}
    initialSelectedId="b" initialFilter="visible" renderDetails={details} />);
  assert.match(filtered, /Detail for a/);
  assert.doesNotMatch(filtered, /Detail for b/);
});

test("document citation icons appear after descriptions without numeric labels", async () => {
  const { default: SourceCitation } = await import("../components/agent/sources/SourceCitation");
  const html = renderToStaticMarkup(<p>Description of the finding. <SourceCitation source={{ id: "source", title: "Original source", text: "<script>Original source text</script>" }} /></p>);
  assert.ok(html.indexOf("Description of the finding.") < html.indexOf("<button"));
  assert.match(html, /aria-label="Source: Original source"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /\[\d+\]|<script>|role="dialog"/);
});

test("shared details render lists, retain zero values and hide citations for missing data", () => {
  const html = renderToStaticMarkup(<Details fields={[
    { label: "Count", value: 0, suffix: <span>count-source</span> },
    { label: "Scope", value: ["Design", "Testing"], suffix: <span>scope-source</span> },
    { label: "Unknown", value: [], suffix: <span>unrelated-source</span> },
  ]} />);
  assert.match(html, /<dd>0/);
  assert.match(html, /<li>Design<\/li><li>Testing<\/li>/);
  assert.match(html, /scope-source|count-source/);
  assert.match(html, /Not specified/);
  assert.doesNotMatch(html, /unrelated-source/);
});
