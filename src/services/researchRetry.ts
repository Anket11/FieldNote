export function canRetryResearch(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return !/prepay(?:ment)? credits.*deplet|insufficient.*credits|RESOURCE_EXHAUSTED|quota.*exceed|rate.?limit|too many requests|API_KEY_INVALID|API key.*(?:invalid|not valid)|invalid.*API key|model.*(?:not found|not supported|not available)|NOT_FOUND|not configured|unauthori[sz]ed|forbidden|401|403|429/i.test(message);
}

/** A failed request gets two more attempts; cancellation always wins. */
export async function runResearchAttempts(attempt: (number: number) => Promise<"completed" | "retry" | "stop">, stopped: () => boolean) {
  for (let number = 1; number <= 3; number++) {
    if (stopped()) return false;
    const result = await attempt(number);
    if (stopped()) return false;
    if (result === "completed") return true;
    if (result === "stop") return false;
  }
  return false;
}
