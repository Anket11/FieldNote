import assert from "node:assert/strict";
import test from "node:test";
import { canRetryResearch, runResearchAttempts } from "../services/researchRetry";

test("research retries failed attempts, stops on success and never exceeds three attempts", async () => {
  const attempts: number[] = [];
  assert.equal(await runResearchAttempts(async (number) => { attempts.push(number); return number === 2 ? "completed" : "retry"; }, () => false), true);
  assert.deepEqual(attempts, [1, 2]);
  let calls = 0;
  assert.equal(await runResearchAttempts(async () => { calls++; return "retry"; }, () => false), false);
  assert.equal(calls, 3);
});

test("Stop and non-retryable errors prevent another attempt", async () => {
  let stopped = false;
  let calls = 0;
  assert.equal(await runResearchAttempts(async () => { calls++; stopped = true; return "retry"; }, () => stopped), false);
  assert.equal(calls, 1);
  calls = 0;
  await runResearchAttempts(async () => { calls++; return "stop"; }, () => false);
  assert.equal(calls, 1);
  for (const message of ["API_KEY_INVALID", "RESOURCE_EXHAUSTED", "Your prepayment credits are depleted", "model was not found", "HTTP 429", "Gemini is not configured"]) {
    assert.equal(canRetryResearch(new Error(message)), false, message);
  }
  assert.equal(canRetryResearch(new Error("ANSWER_VALIDATION_FAILED")), true);
  assert.equal(canRetryResearch(new Error("fetch failed")), true);
});
