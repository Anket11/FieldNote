"use client";

import ResultsWorkspace from "./results/ResultsWorkspace";
import SearchWorkspace from "./search/SearchWorkspace";

export default function ResearchWorkspace() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <h1>Procurement research demo</h1>
      <SearchWorkspace />
      <ResultsWorkspace />
    </main>
  );
}
