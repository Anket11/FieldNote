import { createHash } from "node:crypto";
import type { Citation, Evidence, ResearchResult } from "../../types/research";
import type { createDatabricksTools } from "../databricks/tools";

type Tools = ReturnType<typeof createDatabricksTools>;
type Passage = Awaited<ReturnType<Tools["readEvidence"]>>["passages"][number];
type Records = Awaited<ReturnType<Tools["queryRecords"]>>;
const key = (kind: string, value: string) => `db:${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
const str = (row: Record<string, unknown>, field: string) => typeof row[field] === "string" ? row[field] as string : undefined;
const url = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;
const primaryKeys = { packages: "package_id", projects: "project_id", awards: "record_id", notices: "record_id", facts: "fact_id", requirements: "fact_id", awardPrices: "price_id", scheduleEvents: "event_id", risks: "risk_id" } as const;

/** This registry belongs to one run. Only actual tool results can populate it. */
export function createEvidenceLibrary() {
  const records = new Map<string, { section: string; item: Evidence }>();
  const citations = new Map<string, Citation>();
  const claimCitations = new Set<string>();
  let revision = 0;
  let characters = 0;
  function add(section: string, item: Evidence, sources: Citation[], citable: boolean) {
    if (records.has(item.id)) return item;
    const size = sources.reduce((total, source) => total + source.text.length, item.text.length);
    if (records.size >= 80 || characters + size > 600_000) throw new Error("EVIDENCE_LIMIT: Enough evidence has been loaded. Assess it and answer within the available scope.");
    records.set(item.id, { section, item });
    for (const source of sources) {
      citations.set(source.id, source);
      if (citable) claimCitations.add(source.id);
    }
    characters += size;
    revision++;
    return item;
  }
  function passage(value: Passage) {
    const identity = JSON.stringify([value.chunkId, value.start, value.text]);
    const id = key("passage", identity);
    const citationId = key("citation", identity);
    const projectId = value.projectId ?? "unknown";
    const title = value.citation.bronzePath?.split("/").pop() || value.documentType || "Source passage";
    const citation: Citation = { id: citationId, title, text: value.text, projectId, projectTitle: projectId,
      sectionTitle: value.citation.locator || "Document evidence", mentions: [value.chunkId],
      sourceFile: value.citation.bronzePath?.split("/").pop(), bronzePath: value.citation.bronzePath, sourceUrl: url(value.citation.url) };
    return add("documents", { id, kind: "finding", title, text: value.text, citationIds: [citationId], projectIds: [projectId], differences: [], unknowns: [] }, [citation], true);
  }
  function structured(result: Records) {
    return result.records.map((row) => {
      const nativeId = str(row, primaryKeys[result.table]);
      if (!nativeId) throw new Error("RECORD_RESPONSE: A retrieved record has no stable ID.");
      const id = key(result.table, nativeId);
      const projectId = str(row, "project_id") ?? "unknown";
      const title = str(row, "package_reference") ?? str(row, "contract_reference") ?? str(row, "project_name") ?? str(row, "field") ?? str(row, "risk_type") ?? str(row, "event_name") ?? nativeId;
      const original = JSON.stringify(row, null, 2);
      const associations: Record<string, unknown>[] = Array.isArray(row.evidence_sources)
        ? row.evidence_sources.filter((source): source is Record<string, unknown> => !!source && typeof source === "object" && !Array.isArray(source))
        : [{ source_id: row.citation_source_id, source_url: row.citation_url, bronze_path: row.citation_bronze_path }];
      const sources = associations.flatMap((source): Citation[] => {
        const sourceId = str(source, "source_id");
        if (!sourceId) return [];
        return [{ id: key("citation", `${id}:${sourceId}`), title, text: original, projectId,
          projectTitle: str(row, "project_name") ?? projectId, sectionTitle: str(row, "citation_locator") ?? `Structured ${result.table} record`,
          mentions: [nativeId, sourceId], sourceUrl: url(str(source, "source_url")),
          bronzePath: str(source, "bronze_path"), sourceFile: str(source, "bronze_path")?.split("/").pop() }];
      });
      const procurement = ["packages", "awards", "notices"].includes(result.table);
      return add(result.table === "awards" ? "historical_awards" : result.table, {
        id, title, kind: procurement ? "package" : "finding",
        text: str(row, "description") ?? str(row, "evidence_quote") ?? str(row, "value") ?? original,
        citationIds: sources.map((source) => source.id), projectIds: [projectId], differences: [],
        unknowns: result.table === "packages" ? ["Associated source documents do not establish every package field. Read supporting passages before making factual claims."] : [],
      }, sources, result.table !== "packages");
    });
  }
  function snapshot(): ResearchResult {
    const sections = [...new Set([...records.values()].map((value) => value.section))].map((section) => ({
      id: section, title: section.replaceAll("_", " "), items: [...records.values()].filter((value) => value.section === section).map((value) => value.item),
    }));
    return { title: "Retrieved procurement evidence", sections, citationsById: Object.fromEntries(citations),
      projects: [...new Set([...citations.values()].map((citation) => citation.projectId))].map((id) => ({ id, title: id })) };
  }
  return { passage, structured, snapshot, canCite: (id: string) => claimCitations.has(id), get revision() { return revision; } };
}
