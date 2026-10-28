import assert from "node:assert/strict";
import test from "node:test";
import { describeChatError } from "../services/chatErrors";

test("depleted Gemini credits have an actionable billing error without exposing provider details", () => {
  const error = describeChatError(new Error("Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing."));
  assert.match(error.message, /credits are depleted/);
  assert.equal(error.helpUrl, "https://ai.studio/projects");
  assert.doesNotMatch(describeChatError(new Error("secret request data: test-key")).message, /test-key|secret request/);
});
test("quota, key and unavailable-model failures are distinguished", () => {
  assert.match(describeChatError(new Error("RESOURCE_EXHAUSTED")).message, /quota or rate limit/);
  assert.match(describeChatError(new Error("API_KEY_INVALID")).message, /rejected the API key/);
  assert.match(describeChatError(new Error("models/example was not found")).message, /model is unavailable/);
});
