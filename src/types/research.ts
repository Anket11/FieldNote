export type ReviewState = "source_checked" | "needs_review" | "not_confirmed" | "conflicting";
export type EvidenceKind = "finding" | "requirement" | "reported_problem" | "source_lesson" | "planning_implication" | "gap";
export type Tab = "overview" | "packages" | "requirements" | "risks";
export type Level = "package" | "project" | "general";
export interface Citation {
  id: string; sourceId?: string; title: string; quote: string;
  reviewStatus: ReviewState; level: Level; sourceLevel: string;
  projectId?: string; packageId?: string; page?: number;
  recordLocator?: string; passageId?: string; sourceUrl?: string; limitation: string;
}
export interface Evidence {
  id: string; kind: EvidenceKind; title: string; text: string;
  level: Level; projectId?: string; packageId?: string;
  reviewStatus: ReviewState; citationIds: string[]; tab: Tab;
}
export interface AwardRecord {
  id: string; reference: string; description: string; signedDate: string;
  suppliers: string[]; amount: string; currency: string | null; citationId: string;
}
export interface Package {
  id: string; reference: string; projectId: string; location?: string; scope: string;
  matchReasons: string[]; differences: string[]; citationIds: string[];
  reviewStatus: ReviewState; grouping: string; awardHistory: AwardRecord[];
}
export interface ResearchResult {
  items: Evidence[]; packages: Package[]; citationsById: Record<string, Citation>;
  coverage: string;
}
