import { reviewLabels } from "@/services/research";
import type { ReviewState } from "@/types/research";

type Filters = { project: string; review: ReviewState | "" };
interface Props {
  projects: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function PackageFilters({ projects, filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <label>Project <select value={filters.project} onChange={(event) => onChange({ ...filters, project: event.target.value })}>
        <option value="">All projects</option>
        {projects.map((project) => <option key={project}>{project}</option>)}
      </select></label>
      <label>Candidate review state <select value={filters.review} onChange={(event) => onChange({ ...filters, review: event.target.value as ReviewState | "" })}>
        <option value="">All review states</option>
        {Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
  );
}
