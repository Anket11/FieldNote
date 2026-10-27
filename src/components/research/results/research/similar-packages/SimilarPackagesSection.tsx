import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { projectFilterChanged, reviewSelectionChanged, selectFilteredPackages, selectPackageProjects } from "@/store/researchSlice";
import type { Evidence } from "@/types/research";
import EvidenceList from "@/components/shared/evidence-list/EvidenceList";
import PackageTable from "./package-table/PackageTable";

export default function SimilarPackagesSection({ items }: { items: Evidence[] }) {
  const dispatch = useAppDispatch();
  const { projectFilter, selectedIds } = useAppSelector((state) => state.research);
  const packages = useAppSelector(selectFilteredPackages);
  const projects = useAppSelector(selectPackageProjects);
  const related = items.filter((item) => item.kind !== "package");
  return (
    <section className="space-y-3">
      <h3 id="research-similar_procurements" tabIndex={-1}>Comparable packages</h3>
      <label>Source project <select value={projectFilter} onChange={(event) => dispatch(projectFilterChanged(event.target.value))}>
        <option value="">All source projects</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.title} ({project.id})</option>)}
      </select></label>
      {packages.length ? <PackageTable items={packages} selectedIds={selectedIds} onSelectionChange={(id, selected) => dispatch(reviewSelectionChanged({ id, selected }))} /> : <p>No packages match this project.</p>}
      {related.length > 0 && <details><summary>Related findings</summary><EvidenceList items={related} /></details>}
    </section>
  );
}
