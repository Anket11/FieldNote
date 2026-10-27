import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersChanged, packageSelectionChanged, selectFilteredPackages, selectProjects, selectSelectedPackages } from "@/store/researchSlice";
import PackageFilters from "./PackageFilters";
import PackageList from "./package-list/PackageList";

export default function SimilarPackagesSection() {
  const dispatch = useAppDispatch();
  const { result, filters, selectedPackageIds } = useAppSelector((state) => state.research);
  const packages = useAppSelector(selectFilteredPackages);
  const projects = useAppSelector(selectProjects);
  const selectedPackages = useAppSelector(selectSelectedPackages);
  if (!result) return null;

  const onSelectionChange = (id: string, selected: boolean) => dispatch(packageSelectionChanged({ id, selected }));
  return (
    <>
      <p>{result.packages.length} candidate comparison groups contain {result.packages.reduce((sum, item) => sum + item.awardHistory.length, 0)} award records. These are not verified independent tenders. Two original/leftover-work pairs are grouped provisionally; all histories are retained.</p>
      <PackageFilters projects={projects} filters={filters} onChange={(value) => dispatch(filtersChanged(value))} />
      <section>
        <h3>Selected packages ({selectedPackages.length})</h3>
        {selectedPackages.length === 0 && <p>Select candidates below to review them here.</p>}
        <PackageList items={selectedPackages} selectedIds={selectedPackageIds} onSelectionChange={onSelectionChange} />
      </section>
      <h3>Candidate packages ({packages.length})</h3>
      {packages.length === 0 && <p>No candidates match these filters. Try another project or review state.</p>}
      <PackageList items={packages} selectedIds={selectedPackageIds} onSelectionChange={onSelectionChange} />
    </>
  );
}
