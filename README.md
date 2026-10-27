# Procurement research skeleton

A single-page Next.js/React app for reviewing procurement research with its source evidence. Native controls and minimal Tailwind layout utilities only; no custom visual CSS or UI library.

## Run

Use Node.js 20.9 or newer and npm:

```sh
npm install
npm run dev
```

Open http://localhost:3000, choose **Use example query**, then **Search**. The mock currently serves the saved 132 kV substation / connecting-line scenario from `demo-data/query.json`. Only case and whitespace variations of that query are supported; other queries show an empty state. No backend endpoint was supplied, so no live request is made.

## Active data contract

The current source is **`demo-data/procurement_final.json`**. It supersedes the older frontend fixtures; the app does not merge the old evidence, awards, gaps or coverage records into this response. All supplied JSON files remain unchanged.

The response contains:

- A report title and overview (4 items).
- Similar packages (6 entries: 5 package candidates and 1 related finding).
- Procurement strategy (3 items).
- Tender requirements (4 items).
- Risks and lessons (4 items).
- Readiness checklist (5 tentative items).
- Historical awards (2 summaries).
- 24 passages grouped by 3 source projects, with passage text, supporting excerpts (`mentions`), internal source paths and 3 original URLs.

The interface has three work areas:

- **Research:** a clickable overview of result counts, expandable key findings, a filterable package table with expandable rows, and packaging, risk and historical-award examples. Additional response sections appear here using the common evidence list.
- **Prepare tender:** expandable requirements and action items with Add to review actions.
- **My review:** selected package examples, requirements and action items, grouped with source actions and Remove controls.

After searching, the query becomes a compact header with Edit search. The three work areas stay mounted so inline expansion and selection state survive navigation. Empty groups have a short empty state. Similar-package selection is available for the explicit `package:` records. The source-project filter derives context from attached citations, not verified package metadata. Tender and readiness items can be selected independently for review, without approving a requirement or marking readiness work complete.

`src/types/research.ts` describes both the backend response and the UI contracts. `adaptResearchResponse(unknown)` validates the response shape and IDs, copies item data, normalizes the project-grouped passages into a citation map, and retains exact source text and excerpts. Missing citations render as unavailable. Unsupported source URL schemes are omitted. Replace the mock body of `searchResearch` with a request passed through this adapter when the endpoint and request contract are available.

## Evidence limits

Summaries, relevance assessments, differences and tentative labels come from the backend. They are displayed separately from the source passages and are not presented as independently checked claims. Some sample assessments make terrain or scope inferences, use unrelated IT/metering examples, or interpret historical technical clauses. Users must inspect the source and review applicability before reuse.

The new response supplies no review statuses, source page numbers, verified package-level classifications, retrieval coverage, or structured award histories. The UI does not manufacture those fields or carry forward the old fixture's source-checked labels and counts. Historical award summaries remain separate from package candidates; opening/evaluated/signed prices, dates, durations, actual completion and final paid costs must not be conflated.

The shared evidence panel shows exact supplied excerpts and expandable full passage text, the source project context, the source filename/path when supplied, and an original-source link when available. Embedded JSON or HTML in passages is rendered as escaped text. Internal paths appear in collapsed provenance details, not as fabricated public links. A short View evidence action opens all sources for that finding, with a source selector when there are several. On desktop, evidence appears alongside the workspace; on mobile it is a dedicated view with Back to finding. Closing it restores the visible originating control and scroll position. The active work area, project filter and selections are preserved.

## Component ownership

```text
src/components/
  shared/
    citations/                 # compact evidence trigger and return focus/scroll
    evidence-details/          # summary, relevance, differences and unknowns
    evidence-list/             # expandable evidence items and lists
  research/
    ResearchWorkspace.tsx
    search/                    # compact query / editable SearchForm
    results/
      ResultsWorkspace.tsx
      ResearchTabs.tsx
      evidence-panel/          # excerpts, passage selection and full source text
      research/
        ResearchArea.tsx
        research-overview/ResearchOverview.tsx
        similar-packages/
          SimilarPackagesSection.tsx
          package-table/
            PackageTable.tsx
            PackageRow.tsx
      prepare-tender/PrepareTenderArea.tsx
      my-review/MyReviewArea.tsx
```

Components share explicit UI types and do not parse raw JSON. Feature-specific children stay with their parent; shared evidence and citation components are reused across features. The service adapts data, and a single Redux slice owns search state, active work area, filter, one list of review selections and active evidence IDs. Derived package lists use selectors. Each mounted Provider creates its own store; there is no persistence or shared mutable server store.

## Checks

```sh
npm run typecheck
npm test
npm run lint
npm run build -- --webpack
```

Tests cover exact source mapping, response validation, optional/missing evidence, three work areas, grouped sources, escaped source records, unsupported queries, filtering and selection preservation. Webpack is used for local production verification because the default Turbopack worker cannot bind its internal port in this sandbox.

Live retrieval, backend integration, supplier ranking, price/completion prediction, document generation, deployment and visual polish remain outside this skeleton.
