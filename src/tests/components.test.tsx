import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import ChatWorkspace from "../components/app/ChatWorkspace";
import ChatComposer from "../components/app/ChatComposer";
import ChatMessages from "../components/app/ChatMessages";
import ResearchAnswerView from "../components/app/answers/AnswerView";
import SourceLinks from "../components/app/evidence/SourceLinks";
import { answerSources } from "../services/answerSources";
import PackageList from "../components/agent/List";
import PackageDetails from "../components/app/details/RecordDetails";
import { combinePackages } from "../services/packageComparison";
import HistoryControls from "../components/agent/location/HistoryControls";
import PackageMap from "../components/app/answers/RecordMap";
import { buildDemoResult } from "../services/research";
import { makeStore } from "../store/store";
import { libraryLoaded } from "../store/researchSlice";

test("the chat workspace presents only the scripted requested answer with source evidence", () => {
  const record = buildDemoResult().sections.find((section) => section.id === "historical_awards")!.items[0];
  const Thread = () => <>
    <ChatComposer value="" onChange={() => {}} onSend={() => {}} ready running={false} />
    <ChatMessages messages={[
      { id: "question", role: "user", text: "Who won the Tuensang contract?" },
      { id: "answer", role: "assistant", text: "", output: <ResearchAnswerView answer={{ claims: [{ text: "GE T&D India Limited", recordId: record.id, citationIds: record.citationIds }] }} outputId="scripted" checklistEdits={{}} onChecklistChange={() => {}} /> },
    ]} />
  </>;
  const shell = renderToStaticMarkup(<ChatWorkspace Thread={Thread} configured />);
  assert.match(shell, /Opening your workspaces/);
  const store = makeStore(); store.dispatch(libraryLoaded(buildDemoResult()));
  const html = renderToStaticMarkup(<Provider store={store}><Thread /></Provider>);
  assert.match(html, /Ask about procurement/);
  assert.match(html, /Use example query/);
  assert.match(html, /GE T&amp;D India Limited/);
  assert.match(html, /aria-label="Source:/);
  assert.doesNotMatch(html, /role="tab"|Research overview|Preparation checklist|Procurement results|Procurement Plan/);
});

test("map skeleton keeps package details accessible when no Mapbox token is configured", () => {
  const previous = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  try {
    const items = buildDemoResult().sections[1].items.filter((item) => item.kind === "package");
    const html = renderToStaticMarkup(<PackageMap items={items} focusedId="" onPick={() => {}} />);
    assert.match(html, /Map unavailable/);
    assert.match(html, /Source coordinates are shown where available/);
    for (const item of items) assert.ok(html.includes(item.title.replaceAll("&", "&amp;")));
    assert.doesNotMatch(html, /api.mapbox.com/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = previous;
  }
});

test("annual imagery uses compact year buttons without capture controls", () => {
  const year = new Date().getUTCFullYear();
  const html = renderToStaticMarkup(<HistoryControls year={year} onYear={() => {}} hasScene loading={false} error="" onRetry={() => {}} />);
  assert.equal((html.match(/<button/g) ?? []).length, 11);
  assert.ok(html.includes(`aria-pressed="true">${year}`));
  assert.doesNotMatch(html, /<select|type="range"|Captured:|Capture|cloud cover|Timeline|Current year/);
});

test("shared source previews stay deduplicated and detail fields remain configurable", () => {
  const store = makeStore();
  store.dispatch(libraryLoaded(buildDemoResult()));
  const result = store.getState().research.result!;
  const original = result.sections.find((section) => section.id === "overview")!.items[1];
  const sources = renderToStaticMarkup(<Provider store={store}><SourceLinks groups={answerSources({ claims: [
    { text: "One claim", recordId: original.id, citationIds: original.citationIds },
    { text: "Repeated source", recordId: original.id, citationIds: original.citationIds },
  ] }, result)} /></Provider>);
  assert.equal((sources.match(/aria-label="Source:/g) ?? []).length, 1);
  assert.doesNotMatch(sources, /\[\d+\]|View evidence/);
  const packages = result.sections[1].items.filter((item) => item.kind === "package");
  const awards = result.sections.find((section) => section.id === "historical_awards")!.items;
  const entry = combinePackages(packages, awards, result.citationsById)[0];
  const details = renderToStaticMarkup(<Provider store={store}><PackageDetails item={entry.item} award={entry.award} /></Provider>);
  assert.doesNotMatch(details, /aria-label="Source:/);
  assert.doesNotMatch(details, /<h4>[^<]*<span/);
  for (const field of ["Scope", "Location", "Supplier", "Award value", "Stated contract duration", "Reported differences", "Unknowns to resolve"]) assert.ok(details.includes(field));
  assert.match(details, /628739940.00/);
  assert.match(details, /24 months/);
});

test("procurement list contains only selectable titles", () => {
  const items = buildDemoResult().sections[1].items.filter((item) => item.kind === "package");
  const html = renderToStaticMarkup(<PackageList items={items} selectedId={items[0].id} onSelect={() => {}} controlsId="procurement-details" />);
  assert.equal((html.match(/<button/g) ?? []).length, items.length);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-controls="procurement-details"/);
  assert.doesNotMatch(html, /type="checkbox"|href="#source-evidence"|Commissioning of 132 KV|Supplier|Award value|Add to plan/);
});
