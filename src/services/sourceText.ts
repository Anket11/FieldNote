import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
const inline = new Set(["a", "b", "strong", "i", "em", "span", "small", "sup", "sub", "u", "code", "abbr"]);
const hidden = new Set(["script", "style", "template", "svg", "noscript"]);

function nodeText(node: Node): string {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  if (!("childNodes" in node)) return "";
  const tag = "tagName" in node ? node.tagName : "";
  if (hidden.has(tag)) return "";
  if (tag === "br" || tag === "hr") return "\n";
  const text = node.childNodes.map(nodeText).join("");
  if (tag === "td" || tag === "th") return `${text}\t`;
  return !tag || inline.has(tag) ? text : `\n${text}\n`;
}

export function isStructuredSource(text: string) {
  try { const value: unknown = JSON.parse(text); return value !== null && typeof value === "object"; } catch { return false; }
}

function structuredText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(structuredText).filter(Boolean).join("\n\n");
  if (typeof value === "object") {
    const entries = Object.entries(value);
    // Prefer the original document body over transport metadata and duplicated fields.
    const body = entries.find(([key, content]) => /^(notice_text|text|content|body|passage)$/i.test(key) && typeof content === "string" && content.trim());
    if (body) return String(body[1]);
    return entries.map(([key, content]) => `${key.replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase())}: ${structuredText(content)}`).join("\n");
  }
  return String(value);
}

/** Plain text only. Source HTML is parsed as data and is never inserted into the DOM. */
export function formatSourceText(source: string): string {
  let text = source;
  try { text = structuredText(JSON.parse(text)); } catch { /* Ordinary passages are already text. */ }
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let pass = 0; pass < 3; pass++) {
    const parsed = nodeText(parseFragment(text));
    if (parsed === text) break;
    text = parsed;
    if (!/&(?:lt|gt|amp|#\d+|#x[\da-f]+);|<\/?[a-z][^>]*>/i.test(text)) break;
  }
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
