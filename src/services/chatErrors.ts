export interface ChatError { message: string; helpUrl?: string }
export function describeChatError(error: unknown): ChatError {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/prepay(?:ment)? credits.*deplet|insufficient.*credits/i.test(message)) return {
    message: "Gemini prepaid credits are depleted. Add credits to the API key's project in Google AI Studio, then retry.",
    helpUrl: "https://ai.studio/projects",
  };
  if (/RESOURCE_EXHAUSTED|quota.*exceed|rate.?limit|too many requests/i.test(message)) return {
    message: "Gemini's quota or rate limit was reached. Check the project's quota or retry later.",
  };
  if (/API_KEY_INVALID|API key.*(?:invalid|not valid)|invalid.*API key/i.test(message)) return {
    message: "Gemini rejected the API key. Check the server GEMINI_API_KEY and restart the app.",
  };
  if (/model.*(?:not found|not supported|not available)|NOT_FOUND/i.test(message)) return {
    message: "The configured Gemini model is unavailable. Check GEMINI_MODEL on the server and restart the app.",
  };
  return { message: "The agent could not answer. Check the server Gemini configuration and connection, then retry." };
}
