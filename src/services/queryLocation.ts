export function extractQueryLocation(query: string): string | null {
  const coordinatePair = "[+-]?\\d+(?:\\.\\d+)?\\s*,\\s*[+-]?\\d+(?:\\.\\d+)?";
  const coordinates = query.trim().match(new RegExp(`^(${coordinatePair})$`)) ??
    query.match(new RegExp(`\\b(?:at|near|coordinates?\\s*[:=]?)\\s+(${coordinatePair})`, "i"));
  if (coordinates) return coordinates[1];
  // shortcut: explicit place phrases only, use backend-extracted location intent when available.
  const match = query.match(/\b(?:near|around|located in|located at|location:)\s+([^.!?;\n]+)/i) ?? query.match(/\bin\s+([^.!?;\n]+)/i);
  const name = match?.[1].split(/\s+(?:in\s+(?:hilly|mountainous|rural|urban)\b|for\b|with\b|and\s+(?:a|the|connecting|transmission|show|include)\b)/i)[0].replace(/[,\s]+$/, "").trim();
  if (!name || /\b(?:hilly|mountainous|terrain|turnkey|procurement|and|to)\b/i.test(name)) return null;
  return name;
}
