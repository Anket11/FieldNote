export interface PackageLocation {
  name: string;
  precision: "region" | "place";
  coordinates?: [number, number];
}
/** The sectioned response supplied by the backend. */
export interface BackendItem {
  id: string;
  title: string;
  text: string;
  relevance?: string;
  differences?: string[];
  unknowns?: string[];
  citation_ids: string[];
  label?: string;
  location?: PackageLocation;
}
interface BackendSection {
  id: string;
  title: string;
  items: BackendItem[];
}
interface BackendPassage {
  id: string;
  title: string;
  text: string;
  mentions: string[];
  bronze_path?: string;
  source_url?: string;
}
export interface BackendResponse {
  title: string;
  overview: { title: string; items: BackendItem[] };
  sections: BackendSection[];
  citations: {
    title: string;
    projects: {
      id: string;
      title: string;
      sections: { id: string; title: string; passages: BackendPassage[] }[];
    }[];
  };
}
export interface Citation {
  id: string;
  title: string;
  text: string;
  mentions: string[];
  projectId: string;
  projectTitle: string;
  sectionTitle: string;
  sourceFile?: string;
  bronzePath?: string;
  sourceUrl?: string;
}
export interface Evidence {
  kind: "package" | "finding";
  id: string;
  title: string;
  text: string;
  relevance?: string;
  differences: string[];
  unknowns: string[];
  label?: string;
  location?: PackageLocation;
  citationIds: string[];
  projectIds: string[];
}
interface ResearchSection {
  id: string;
  title: string;
  items: Evidence[];
}
export interface ResearchResult {
  title: string;
  sections: ResearchSection[];
  citationsById: Record<string, Citation>;
  projects: { id: string; title: string }[];
}
