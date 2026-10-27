"use client";

import { useAppSelector } from "@/store/hooks";
import ResultsWorkspace from "./results/ResultsWorkspace";
import SearchWorkspace from "./search/SearchWorkspace";

export default function ResearchWorkspace() {
  const showingEvidence = useAppSelector((state) => !!state.research.activeCitationId);
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className={showingEvidence ? "hidden lg:block" : undefined}>
        <h1>Procurement research</h1>
        <SearchWorkspace />
      </header>
      <ResultsWorkspace />
    </main>
  );
}
