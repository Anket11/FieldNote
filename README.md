# Procurement intelligence demo

A plain functional frontend skeleton for procurement research, running entirely on saved local evidence. All interactions stay at `/`.

## Run

Use Node.js 20.9 or newer and npm:

```sh
npm install
npm run dev
```

Open http://localhost:3000, choose **Use demo query**, then **Search**. The saved scenario is a 132 kV substation and connecting transmission line in hilly terrain, considering turnkey procurement. Only case and whitespace variations of this query are supported. Other queries show an empty state. Nothing is sent to a remote service.

## Included

- Editable search, validation, loading, error and unsupported-query states.
- Overview, similar packages, tender requirements, and risks/lessons tabs. Arrow keys, Home and End operate the tabs.
- Project and candidate review-state filters, package selection, and all grouped award histories. Selected packages use the same component as candidates.
- Selectable historical evidence for a draft-review checklist, without tender document generation.
- A shared source panel with exact quotation, available locators, claim-level review status, evidence context, limitations and original URL when supplied. Closing it preserves filters, tab and selections.
- Native controls and layout-only Tailwind utilities. No custom visual theme or design system.

## Data and evidence limits

`demo-data/` is supplied, unchanged source material; see [its README](demo-data/README.md). The adapter uses all 40 selected evidence items, 34 candidate comparison groups with 36 award histories, 12 gaps and the partial-cache coverage record. Only 20 selected claims are source checked. Package candidates remain labelled Needs review even when some attached claims are checked.

The 1044 cached fact candidates do not represent an exhaustive search of 36022 Silver facts. Original/leftover-work groups preserve separate records and provisional-link warnings. Project findings stay at project level. Planning implications are explicitly labelled interpretations; the supplied selection has no explicit source-stated lesson items.

NAG-SS-02A's published notice price (INR 693401152) stays separate from the differently sized award-feed amount, whose currency is unverified. The 15-month historical duration starts from an unconfirmed effective date. Actual completion and final paid cost are unconfirmed. Historical qualification thresholds require review before reuse.

## Folder and component map

- `src/app/`: normal App Router root layout, single page and minimal Tailwind imports. Tailwind preflight is omitted to retain native control appearance.
Components shared across features live in `shared/`. Feature-specific children live under their parent feature, with local imports. Shared components do not import feature components. No forwarding files or barrel exports are needed.

```text
src/components/
  shared/
    citations/
      CitationButton.tsx
      CitationList.tsx
    evidence-list/
      EvidenceList.tsx
      EvidenceItem.tsx
    review-status/
      ReviewStatus.tsx
  research/
    ResearchWorkspace.tsx
    search/
      SearchWorkspace.tsx
      SearchForm.tsx
    results/
      ResultsWorkspace.tsx
      ResearchTabs.tsx
      EvidencePanel.tsx
      overview/
        OverviewSection.tsx
      similar-packages/
        SimilarPackagesSection.tsx
        PackageFilters.tsx
        package-list/
          PackageList.tsx
          package-card/
            PackageCard.tsx
            AwardHistory.tsx
      tender-requirements/
        RequirementsSection.tsx
        ReviewChecklist.tsx
      risks-and-lessons/
        RisksSection.tsx
```

Search and results own their workspace state connections. Each result feature composes small components; reusable evidence/citation components work across those features. Raw data adaptation stays in the service layer.

- `src/services/research.ts`: saved-query matching and immutable JSON-to-UI adaptation, review labels and citation map. Replace `searchResearch` with a real service returning the same typed result to change data sources.
- `src/types/research.ts`: explicit UI/domain contracts.
- `src/store/`: one Redux slice, derived selectors, typed hooks, and a separate store per mounted Provider. No persistence or server-side shared mutable store.
- `src/tests/`: Node tests for quotation/status mapping, supported queries, grouping counts, selection/evidence state transitions and composed feature rendering.

## Checks

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

Type checking, all four tests, lint and the production build with `npm run build -- --webpack` pass. The default Turbopack build cannot bind its internal worker port in the restricted sandbox; webpack verifies the production app without that restriction. Browser interaction checks have not been run.

The UI uses small focused React components within one app, with one Redux store. These are component boundaries, not separately deployed microfrontends.

## Still mocked / deferred

The service returns saved results for one scenario. There is no live retrieval, backend, authentication, LLM, database, supplier scoring, cost prediction, completion forecast, monitoring, document generation, or deployment. Selections are in memory and reset after a successful new search. Visual polish is deliberately deferred.
