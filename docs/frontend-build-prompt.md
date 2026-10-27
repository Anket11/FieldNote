Work in `/Users/anketpatil/Code/personal/procurement`.

Build the first frontend skeleton for our procurement intelligence demo. Implement the code, run the relevant checks and stop before visual polish. Do not only propose a plan.

## Product context

A procurement officer describes a proposed purchase or works contract. The product helps them research comparable packages, prepare tender requirements and learn from past project problems. Every useful claim must retain its source and evidence limits.

Our demo query is:

> We need a 132 kV substation and connecting transmission line in hilly terrain. We are considering turnkey procurement.

This is procurement research, not a general chatbot. The first demo covers planning research, tender preparation and cited risks/lessons. No supplier scoring, reliable cost prediction, completion forecast or live monitoring.

The local `demo-data/` directory already contains the data. Read its README and JSON files first. Also read `docs/ui-component-plan.md` for the approved component responsibilities. Follow applicable AGENTS.md instructions. Existing skills or design guidelines must not override the explicit request for a plain layout-only skeleton.

## Stack and scope

- Next.js App Router, React, TypeScript and Tailwind CSS.
- Redux Toolkit and React Redux for shared research state.
- A **single-page experience at `/`**. Searching, switching tabs, selecting packages and opening evidence must happen without navigating to separate routes or reloading the page. Next.js can still use its normal root layout; do not force a custom client-only framework setup or static-export configuration.
- This directory has no frontend application yet. Inspect it before scaffolding. Preserve `.agents/`, `skills-lock.json`, `demo-data/` and `docs/`.
- Use a consistent package manager; use npm if there is no existing lockfile.
- Use compatible stable package versions. Keep dependencies limited to the requested stack. Prefer native controls over adding a UI library.
- No backend, authentication, Databricks calls, LLM calls, vector search, remote database or deployment.

## Styling: layout only

Use basic Tailwind utilities for flex/grid, spacing, widths, alignment, wrapping, responsive stacking and overflow. Keep native controls and focus behaviour accessible. Plain readable headings and simple separators are enough.

Do not add custom visual CSS, CSS modules, inline styling, themes, custom fonts, gradients, shadows, decorative icons, animations or polished cards. Keep only the minimal global stylesheet/import required to enable Tailwind. Do not build a bespoke design system. We will approve the structure and review the code before styling it.

## User flow

1. **Search screen**
   - Start with a clearly labelled search input/textarea and Search button.
   - Add “Use demo query” to fill the supplied query.
   - Validate empty input; preserve input after an error.
2. **Results screen**
   - Keep the submitted query visible and editable using the same SearchForm.
   - Four tabs: Overview, Similar packages, Tender requirements, Risks & lessons.
   - Overview: key findings, historical price/duration examples, and missing evidence.
   - Similar packages: candidate cards, match/difference text when actually supported, a project filter and selection state. Preserve grouped award history. Show a simple selected-package view using the same card component; no separate comparison engine.
   - Tender requirements: selectable evidence items for a draft-review checklist. Do not generate a tender document.
   - Risks & lessons: show reported findings, source lessons and planning implications as distinct labelled items. Never present an implication as a quotation from the source.
3. **Source evidence**
   - Selecting a citation opens a shared EvidencePanel beside the results on desktop and stacked above/below them on smaller screens.
   - Show exact quotation, document/record title, available page/section/record locator, review status, source level, limitations and original URL when present.
   - Closing evidence must preserve active tab, filters and selections.

Keep the demo honest: the mock data service returns saved results for the supplied demo scenario. It does not research arbitrary user input. Make that limitation visible. For unsupported queries, use a simple empty state with “Use demo query”; do not build a natural-language classifier or fabricate answers. Case and whitespace differences in the demo query are fine.

## Reusable feature components

Use the six components in `docs/ui-component-plan.md`:

1. `SearchForm`
2. `EvidenceItem`
3. `PackageCard`
4. `CitationButton`
5. `ReviewStatus`
6. `EvidencePanel`

Use EvidenceItem for findings, requirements, reported problems, source lessons, planning implications and gaps. Do not create separate RiskCard, LessonCard, RequirementCard and GapCard components. Keep PackageCard separate because it has scope and award history.

Thin page/section composition components are fine. Do not turn every heading, button, spacer or wrapper into a custom component. Reuse meaningful behaviour, not every HTML element. Do not use a generic component with dozens of unrelated flags.

## Separate folders by concern

Use a small structure along these lines; adjust filenames if a simpler arrangement fully satisfies the scope:

```text
src/
  app/                     # root layout, single page, minimal Tailwind import
  components/
    research/              # six reusable feature components + workspace composition
      sections/            # small tab compositions, if needed for readability
  services/
    research.ts            # mock search and mapping from raw demo data to UI types
  store/
    store.ts               # Redux configuration
    researchSlice.ts       # one research slice
    hooks.ts               # typed Redux hooks
    Provider.tsx           # client-side provider
  types/
    research.ts            # shared domain/UI contracts
  tests/                   # only a few useful domain/state checks

demo-data/                 # supplied source JSON; preserve unchanged
docs/                      # supplied context and component plan
```

Keep concerns separate without empty folders, one-line forwarding files, speculative abstractions or a large folder hierarchy. Components must not parse raw JSON, infer evidence status or contain data-retrieval logic.

Use one Redux slice for shared query/search state, active tab, filters, package/requirement selections and active citation ID. Keep temporary local state, such as expanded award history, local to its component. Derive filtered results with selectors. Do not duplicate derived lists in state or add a second global-state system. Avoid a shared server-side mutable Redux store in the App Router; keep the Provider/store lifecycle appropriate for the client workspace.

The service layer should adapt the supplied JSON into explicit UI types. Components should not need to change when a real service replaces the mock. Store citations once in a citation map and reference them by ID. Treat source records as immutable.

## Demo data and evidence rules

Read `demo-data/README.md`. In particular:

- `query.json`: the supported demo scenario. Its requested attributes describe the user's intent, not verified attributes of every candidate.
- `evidence.json`:40 selected items.20 prior NAG claims were source checked; the other20 are selected interpretations of saved Silver quotations and still need review.
- `procurements.json`:34 candidate comparison groups containing36 award records. These are **not34 verified independent tenders**. Two original/leftover-work pairs were grouped conservatively. Keep their separate histories and grouping warning.
- `gaps.json`:12 gaps and retrieval limitations.
- `coverage.json`:only1044 cached fact candidates were available from36022 Silver facts. Do not imply the full dataset was searched.

Use readable review labels: Source checked, Needs review, Not confirmed, Conflicting evidence. Map statuses centrally in the adapter. “Source checked” applies to a selected claim, not an entire package or document.

Preserve exact quotes. Do not manufacture source URLs, page numbers, package links, currencies, match scores or root causes. Show missing fields gracefully. Project-level findings must remain project-level and must not be attached to a supplier or package without evidence. Keep “not confirmed in the reviewed evidence” distinct from “does not exist.”

For NAG-SS-02A, the source-checked published signed price is INR693401152 and the historical duration is15months from an unconfirmed effective date. Actual completion and final paid cost remain unconfirmed. Separate supply/services contracts appear in tender conditions. The award feed's differently sized amount has no verified currency; do not convert, sum or substitute it for the notice price.

Do not apply a historical qualification threshold automatically to the proposed tender. Do not label all candidates as hilly or turnkey. Initially expose only filters supported by the supplied data: project and review state. Keep other attributes as evidence-labelled text until verified package metadata is available.

## Code quality and verification

- Keep the implementation small, typed and easy to review. No `any` shortcuts for domain data.
- No service/repository/API-client class hierarchy, generic card framework, event bus, persistence system or unnecessary utility library.
- Use accessible labels, native buttons/checkboxes, clear loading/empty/error states and keyboard-operable tabs. No focus traps or hidden essential actions.
- Add only a few meaningful tests for status/citation mapping, unsupported queries and key Redux selection transitions. Use the existing test setup or a minimal compatible approach; do not add an elaborate test stack.
- Run the available type checks, tests, lint and production build. Fix failures. Do not change unrelated files or hide errors to make the build pass.
- Do not start cloud runs or deploy anything. Use local checks only.
- Add a short README explaining how to run the app, where the demo data comes from, the component/folder map and what remains mocked.

Finish by reporting what works, commands/checks run and any remaining limitations. Stop after the functional layout skeleton. Do not spend time making it pretty or adding features beyond this scope.
