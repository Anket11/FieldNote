import assert from "node:assert/strict";
import test from "node:test";
import { withChatTitle } from "../services/chatTitles";
import { validateAnswer } from "../services/chatLibrary";

test("the agent replaces a provisional title once and changes only its own chat", () => {
  const chats = [{ id: "one", title: "New research" }, { id: "two", title: "New research" }];
  const provisional = withChatTitle(chats, "one", "Find similar substation contracts near Tuensang");
  const named = withChatTitle(provisional, "one", "Tuensang Substation Procurement", true);
  assert.equal(named[0].title, "Tuensang Substation Procurement");
  assert.equal(named[0].named, true);
  assert.equal(named[1], chats[1]);
  assert.equal(chats[0].title, "New research");
  assert.deepEqual(withChatTitle(named, "one", "Later question"), named);
  assert.deepEqual(withChatTitle(named, "one", "A different generated name", true), named);
});

test("chat names are bounded and validated with the research answer", () => {
  const chats = [{ id: "one", title: "New research" }];
  assert.equal(withChatTitle(chats, "one", "   "), chats);
  assert.equal(withChatTitle(chats, "one", "  Power\n research  ", true)[0].title, "Power research");
  assert.equal(withChatTitle(chats, "one", "a".repeat(100), true)[0].title.length, 60);
  assert.equal(validateAnswer({ claims: [{ text: "What location?", citationIds: [] }], chatTitle: "Substation Research" }).chatTitle, "Substation Research");
  assert.throws(() => validateAnswer({ claims: [{ text: "What location?", citationIds: [] }], chatTitle: "a".repeat(61) }));
});
