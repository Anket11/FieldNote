import type { Citation, Evidence } from "../types/research";

function noticeIds(item: Evidence, citations: Record<string, Citation>): string[] {
  return item.citationIds.flatMap((id) => [...(citations[id]?.text ?? "").matchAll(/(?:"id"\s*:\s*"|Notice:\s*)(OP\d+)/g)].map((match) => match[1]));
}
export function combinePackages(packages: Evidence[], awards: Evidence[], citations: Record<string, Citation>) {
  const matches = awards.map((award) => ({ award, packages: packages.filter((item) =>
    noticeIds(item, citations).some((id) => noticeIds(award, citations).includes(id))) }));
  const used = new Set<string>();
  const columns = packages.map((item) => {
    const linked = matches.filter((match) => match.packages.length === 1 && match.packages[0].id === item.id);
    const award = linked.length === 1 ? linked[0].award : undefined;
    if (award) used.add(award.id);
    return { item, award };
  });
  return [...columns, ...awards.filter((award) => !used.has(award.id)).map((item) => ({ item, award: item }))];
}
export function awardFields(award?: Evidence) {
  const text = award?.text ?? "";
  // shortcut: explicit award phrases only, prefer structured commercial fields if the API adds them.
  return {
    supplier: text.match(/awarded to (.+?), with /i)?.[1],
    value: text.match(/(?:signed contract|evaluated bid) price of [A-Z]{3}\s+\d(?:[\d,.]*\d)?/i)?.[0],
    duration: text.match(/stated duration of (\d+\s+months?)/i)?.[1],
  };
}

export function packageLocationText(item: Evidence): string | undefined {
  return item.location?.name ?? item.title.match(/\bfrom (.+ to .+)$/i)?.[1]
    ?? item.title.match(/\b(?:at|in) (.+?)(?: to \d+\s*kV)?$/i)?.[1];
}
