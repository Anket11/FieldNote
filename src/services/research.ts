import sample from "../../demo-data/procurement_final.json";
import type { BackendItem, BackendResponse, Citation, Evidence, ResearchResult } from "../types/research";

function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid research response: expected an object.");
}
function strings(value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) throw new Error("Invalid research response: expected a list of text values.");
}
function list(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid research response: expected a list.");
}
function fields(value: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (typeof value[name] !== "string" || !value[name].trim()) throw new Error(`Invalid research response: missing ${name}.`);
  }
}
function uniqueId(value: unknown, seen: Set<string>) {
  if (typeof value !== "string" || !value.trim() || ["__proto__", "constructor", "prototype"].includes(value) || seen.has(value)) {
    throw new Error("Invalid research response: missing, unsafe or duplicate ID.");
  }
  seen.add(value);
}
function validateResponse(data: unknown): asserts data is BackendResponse {
  record(data); fields(data, ["title"]);
  record(data.overview); fields(data.overview, ["title"]); list(data.sections);
  record(data.citations); fields(data.citations, ["title"]); list(data.citations.projects);
  const sectionIds = new Set(["overview"]);
  const itemIds = new Set<string>();
  for (const section of [data.overview, ...data.sections]) {
    record(section); fields(section, ["title"]); list(section.items);
    if (section !== data.overview) uniqueId(section.id, sectionIds);
    for (const item of section.items) {
      record(item); fields(item, ["title", "text"]); uniqueId(item.id, itemIds); strings(item.citation_ids);
      for (const key of ["relevance", "label"]) {
        if (item[key] !== undefined && typeof item[key] !== "string") throw new Error(`Invalid research response: invalid ${key}.`);
      }
      if (item.location !== undefined) {
        record(item.location); fields(item.location, ["name"]);
        if (!["region", "place"].includes(String(item.location.precision))) throw new Error("Invalid research response: invalid location precision.");
        const coordinates = item.location.coordinates;
        if (coordinates !== undefined && (!Array.isArray(coordinates) || coordinates.length !== 2 ||
          !coordinates.every((value) => typeof value === "number" && Number.isFinite(value)) ||
          Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90)) throw new Error("Invalid research response: invalid coordinates.");
      }
      for (const key of ["differences", "unknowns"]) if (item[key] !== undefined) strings(item[key]);
    }
  }
  const projectIds = new Set<string>();
  const citationIds = new Set<string>();
  for (const project of data.citations.projects) {
    record(project); fields(project, ["title"]); uniqueId(project.id, projectIds); list(project.sections);
    for (const section of project.sections) {
      record(section); fields(section, ["id", "title"]); list(section.passages);
      for (const passage of section.passages) {
        record(passage); fields(passage, ["title", "text"]); uniqueId(passage.id, citationIds); strings(passage.mentions);
        for (const key of ["bronze_path", "source_url"]) {
          if (passage[key] !== undefined && typeof passage[key] !== "string") throw new Error(`Invalid research response: invalid ${key}.`);
        }
      }
    }
  }
}

export function adaptResearchResponse(data: unknown): ResearchResult {
  validateResponse(data);
  const citationsById: Record<string, Citation> = {};
  for (const project of data.citations.projects) {
    for (const section of project.sections) {
      for (const passage of section.passages) {
        citationsById[passage.id] = {
          id: passage.id, title: passage.title, text: passage.text, mentions: [...passage.mentions],
          projectId: project.id, projectTitle: project.title, sectionTitle: section.title,
          sourceFile: passage.bronze_path?.split("/").pop(), bronzePath: passage.bronze_path,
          sourceUrl: passage.source_url && /^https?:\/\//i.test(passage.source_url) ? passage.source_url : undefined,
        };
      }
    }
  }
  const mapItem = (item: BackendItem): Evidence => ({
    kind: item.id.startsWith("package:") ? "package" : "finding",
    id: item.id, title: item.title, text: item.text, relevance: item.relevance, label: item.label,
    location: item.location ? { ...item.location, coordinates: item.location.coordinates ? [...item.location.coordinates] : undefined } : undefined,
    differences: [...(item.differences ?? [])], unknowns: [...(item.unknowns ?? [])], citationIds: [...item.citation_ids],
    projectIds: [...new Set(item.citation_ids.flatMap((id) => Object.hasOwn(citationsById, id) ? [citationsById[id].projectId] : []))],
  });
  return {
    title: data.title,
    sections: [{ id: "overview", title: data.overview.title, items: data.overview.items.map(mapItem) },
      ...data.sections.map((section) => ({ id: section.id, title: section.title, items: section.items.map(mapItem) }))],
    citationsById,
    projects: data.citations.projects.map(({ id, title }) => ({ id, title })),
  };
}
export function buildDemoResult(): ResearchResult {
  return adaptResearchResponse(sample);
}
