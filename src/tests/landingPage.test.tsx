import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LandingPage from "../components/landing/LandingPage";

test("landing actions open the workspace and evidence navigation resolves to real sections", () => {
  const html = renderToStaticMarkup(<LandingPage />);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.ok((html.match(/href="\/workspace"/g) ?? []).length >= 3);
  for (const id of ["main", "problem", "approach", "evidence"]) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.match(html, /<details/);
  assert.match(html, /supplied procurement library/);
  assert.match(html, /The connections are missing/);
  assert.match(html, /What occurred/);
  assert.match(html, /How it was executed/);
  assert.match(html, /Why it succeeded or failed/);
  assert.match(html, /proposed capabilities, not active demo features/);
  assert.match(html, /save in this browser/);
  for (const label of ["Research.", "Notebook.", "Plan.", "Notes · highlights · tags"]) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Procurement GPT|ProcureGPT|>GPT</);
  assert.doesNotMatch(html, /<textarea|GEMINI_API_KEY/);
});
