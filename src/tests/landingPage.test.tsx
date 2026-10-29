import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LandingPage from "../components/landing/LandingPage";

test("landing actions open the workspace and evidence navigation resolves to real sections", () => {
  const html = renderToStaticMarkup(<LandingPage />);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.ok((html.match(/href="\/workspace"/g) ?? []).length >= 3);
  for (const id of ["main", "approach", "evidence"]) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.match(html, /<details/);
  assert.match(html, /rather than active demo capabilities/);
  assert.doesNotMatch(html, /<textarea|GEMINI_API_KEY/);
});
