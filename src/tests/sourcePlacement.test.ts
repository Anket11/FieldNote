import assert from "node:assert/strict";
import test from "node:test";
import { sourcePlacement } from "../components/agent/sources/sourcePlacement";

test("citation previews flip above/below and stay within the viewport", () => {
  const viewport = { width: 1000, height: 800 };
  const below = sourcePlacement({ left: 30, top: 40, bottom: 65 }, viewport);
  assert.equal(below.side, "below");
  assert.equal(below.top, 73);
  const above = sourcePlacement({ left: 950, top: 730, bottom: 755 }, viewport);
  assert.equal(above.side, "above");
  assert.equal(above.top, 302);
  assert.equal(above.left + above.width, 988);
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 280 }]) {
    const placement = sourcePlacement({ left: 310, top: 200, bottom: 224 }, viewport);
    assert.ok(placement.left >= 12 && placement.top >= 12);
    assert.ok(placement.left + placement.width <= viewport.width - 12);
    assert.ok(placement.top + placement.height <= viewport.height - 12);
  }
});
