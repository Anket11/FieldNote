import type { ResearchResult } from "../types/research";

const stopWords = new Set("a an and are as at be by can do find for from give how i in is it me of on or our please show some the this to use we what which with you want need tell about information".split(" "));
const words = (text: string): string[] => text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? [];

// A single insertion, deletion, substitution or transposition covers common typing errors.
function similar(left: string, right: string) {
  if (left === right || (left.length >= 3 && right.startsWith(left))) return true;
  if (left.length < 4 || Math.abs(left.length - right.length) > 1) return false;
  let index = 0;
  while (index < left.length && left[index] === right[index]) index++;
  if (left.length === right.length) return left.slice(index + 1) === right.slice(index + 1) ||
    (left[index] === right[index + 1] && left[index + 1] === right[index] && left.slice(index + 2) === right.slice(index + 2));
  return left.length > right.length ? left.slice(index + 1) === right.slice(index) : left.slice(index) === right.slice(index + 1);
}

export function searchLibrary(query: string, library: ResearchResult) {
  const terms = [...new Set(words(query).filter((term) => !stopWords.has(term)))];
  return library.sections.flatMap((section) => section.items.map((record) => {
    const title = words(record.title);
    const body = words([record.text, record.relevance, record.location?.name, ...record.differences, ...record.unknowns,
      ...record.citationIds.flatMap((id) => { const source = library.citationsById[id]; return source ? [source.title, source.text] : []; })].join(" "));
    const matched = terms.map((term) => title.includes(term) ? 8 : title.some((word) => similar(term, word)) ? 5 : body.includes(term) ? 2 : body.some((word) => similar(term, word)) ? 1 : 0);
    return { record: { ...record, sectionId: section.id }, score: matched.reduce<number>((sum, score) => sum + score, 0) + matched.filter(Boolean).length * 10 };
  })).filter(({ score }) => !terms.length || score > 0).sort((a, b) => b.score - a.score).map(({ record }) => record);
}
