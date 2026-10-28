import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoResult } from "../services/research";
import { makeStore } from "../store/store";
import { libraryLoaded } from "../store/researchSlice";

test("each chat owns its source library without modifying another chat", () => {
  const first = makeStore();
  const second = makeStore();
  const library = buildDemoResult();
  first.dispatch(libraryLoaded(library));
  assert.equal(second.getState().research.result, null);
  second.dispatch(libraryLoaded(buildDemoResult()));
  first.dispatch(libraryLoaded({ ...library, title: "First chat library" }));
  assert.equal(first.getState().research.result?.title, "First chat library");
  assert.equal(second.getState().research.result?.title, library.title);
});
