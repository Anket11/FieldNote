import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import ResearchWorkspace from "../components/research/ResearchWorkspace";
import { DEMO_QUERY } from "../services/research";
import { makeStore } from "../store/store";
import { citationClosed, citationOpened, requirementToggled, search, tabChanged } from "../store/researchSlice";

test("small feature components compose search, tabs, checklist, awards and shared evidence", async () => {
  const store = makeStore();
  const render = () => renderToStaticMarkup(<Provider store={store}><ResearchWorkspace /></Provider>);

  assert.match(render(), /Describe your procurement/);
  assert.doesNotMatch(render(), /role="tablist"/);
  await store.dispatch(search(DEMO_QUERY));
  const result = store.getState().research.result!;
  const requirement = result.items.find((item) => item.kind === "requirement")!;
  store.dispatch(requirementToggled(requirement.id));
  store.dispatch(tabChanged("requirements"));
  store.dispatch(citationOpened("reviewed:award_price"));

  const html = render();
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  const panel = html.match(/<section id="panel-requirements"[^>]*>/)?.[0];
  assert.ok(panel);
  assert.doesNotMatch(panel, /hidden/);
  assert.match(html, /1 items selected for draft review/);
  assert.equal((html.match(/Award history \(2 records\)/g) ?? []).length, 2);
  assert.match(html, /Signed Contract price\nINR 693401152.00/);

  store.dispatch(citationClosed());
  assert.doesNotMatch(render(), /id="source-evidence"/);
  assert.equal(store.getState().research.activeTab, "requirements");
  assert.deepEqual(store.getState().research.selectedRequirementIds, [requirement.id]);
});
