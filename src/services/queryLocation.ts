import { locationOverride } from "./locationOverrides";

export function extractQueryLocation(query: string): string | null {
  const override = locationOverride(query);
  if (override) return override.name;
  const number = "([+-]?\\d+(?:\\.\\d+)?)";
  const latitude = query.match(new RegExp(`\\blat(?:itude)?\\s*[:=]?\\s*${number}`, "i"));
  const longitude = query.match(new RegExp(`\\b(?:longitude|lon|lng)\\s*[:=]?\\s*${number}`, "i"));
  if (latitude && longitude) return `${latitude[1]}, ${longitude[1]}`;
  const coordinatePair = "[+-]?\\d+(?:\\.\\d+)?\\s*,\\s*[+-]?\\d+(?:\\.\\d+)?";
  const coordinates = query.trim().match(new RegExp(`^(${coordinatePair})$`)) ??
    query.match(new RegExp(`(?:\\b(?:at|near)\\s+|\\bcoordinates?\\s*[:=]?\\s*)(${coordinatePair})`, "i"));
  if (coordinates) return coordinates[1];
  // shortcut: explicit place phrases only, use backend-extracted location intent when available.
  const match = query.match(/\b(?:near|around|located in|located at|location:)\s+([^.!?;\n]+)/i) ?? query.match(/\bin\s+([^.!?;\n]+)/i);
  const name = match?.[1].split(/\s+(?:in\s+(?:hilly|mountainous|rural|urban)\b|for\b|with\b|and\s+(?:a|the|connecting|transmission|show|include)\b)/i)[0].replace(/[,\s]+$/, "").trim();
  if (!name || /\b(?:hilly|mountainous|terrain|turnkey|procurement|and|to)\b/i.test(name)) return null;
  return name;
}
