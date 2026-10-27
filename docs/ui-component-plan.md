# Procurement research UI: minimum component plan

Build one search page and one results page. Open source evidence beside the results. Use four result tabs: Overview, Similar packages, Tender requirements, and Risks & lessons.

Use **six feature components**. Reuse the design system's buttons, inputs, tabs, checkboxes, badges and drawer; do not create custom versions of those controls.

## User journey

```text
Search page
└── SearchForm
    └── User enters proposed procurement → Search

Results page
├── SearchForm — compact, keeps the submitted query editable
├── Overview | Similar packages | Tender requirements | Risks & lessons
├── Active tab content
│   ├── EvidenceItem — one finding, requirement, lesson or gap
│   └── PackageCard — one candidate package/scope
└── EvidencePanel — opens when the user selects a citation
```

On desktop, evidence opens beside the results. On mobile, use the same content in a full-width drawer with a close button.

## The six components

| Component | Purpose | Reused in |
|---|---|---|
| **SearchForm** | Query input and Search action. Keeps input, validation and loading together. | Search page, results header |
| **EvidenceItem** | One finding, requirement, reported problem, planning implication or evidence gap. | Overview, tender requirements, risks and lessons |
| **PackageCard** | Package scope, why it matches, differences and expandable award history. | Similar packages, selected comparison |
| **CitationButton** | Opens the exact supporting evidence. | EvidenceItem, PackageCard, comparison cells |
| **ReviewStatus** | Displays the evidence's review state with a text label. | Items, package claims, source excerpts |
| **EvidencePanel** | Shows a quotation, source, page/record locator, context and limitations. | Every result tab |

Do not create separate `RiskCard`, `LessonCard`, `RequirementCard`, `GapCard`, `SourceCard` and `OverviewCard`. Use `EvidenceItem` with the correct content and label. Keep `PackageCard` separate because it has scope and award history rather than one claim.

## Component contracts

### SearchForm

```ts
type SearchFormProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  loading: boolean;
  error?: string;
};
```

Use one component at both locations. The parent layout controls its width; no separate home-page and results-page search components.

- Visible label: **Describe your procurement**.
- Example: “132 kV substation and connecting line in hilly terrain; considering turnkey.”
- Keep the submitted query visible after search.
- Disable duplicate submission while loading. Preserve input after an error.

### EvidenceItem

```ts
type EvidenceKind =
  | 'finding'
  | 'requirement'
  | 'reported_problem'
  | 'source_lesson'
  | 'planning_implication'
  | 'gap';

type EvidenceItemProps = {
  item: {
    id: string;
    kind: EvidenceKind;
    title: string;
    text: string;
    level: 'package' | 'project' | 'general';
    packageId?: string;
    projectId?: string;
    reviewStatus: ReviewState;
    citationIds: string[];
  };
  selected?: boolean;
  onSelect?: (id: string) => void;
};
```

Use one quiet row/card layout:

```text
[Reported problem] [Project-level] [Needs review]
Substation capacity waited for connecting lines
The Jharkhand status report records completed capacity
that could not be used commercially.
[Source 1]
```

Render a planning implication as a separate item beneath the reported finding. Its citations can point to the same source, but label it **Planning implication**. Do not present it as a recommendation quoted from the report.

A gap can have no citation. Show **Not confirmed in reviewed evidence**; do not invent a source or infer that the information is absent everywhere.

### PackageCard

```ts
type PackageCardProps = {
  package: {
    id: string;
    reference: string;
    location: string;
    scope: string;
    matchReasons: string[];
    differences: string[];
    citationIds: string[];
    reviewStatus: ReviewState;
    awardHistory: AwardRecord[];
  };
  selected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
};
```

```text
[ ] NAG-SS-02A · Tuensang, Nagaland
132 kV GIS substation upgrade

Match: same voltage and turnkey substation scope.
Difference: full connecting-line scope is not established.
[Selected claims checked] [View sources]
▸ Award history
```

- Use one card per package or documented scope group. Distinct lots stay separate.
- Keep invitations, awards and overlapping remaining-work awards inside the appropriate history.
- When grouping is provisional, say so. Do not claim the current 34 comparison groups are 34 verified independent procurements.
- Do not invent match percentages.
- Reuse the same card when selected for comparison. Add a simple comparison table later if users need it; do not build a second package component now.

### CitationButton

```ts
type CitationButtonProps = {
  citationId: string;
  label: string; // Example: “Scope, p. 3”
  onOpen: (citationId: string) => void;
};
```

Use readable labels such as **Scope, p. 3**, not unexplained internal IDs. Opening a citation must preserve the active tab, scroll position and package selection.

### ReviewStatus

```ts
type ReviewState =
  | 'source_checked'
  | 'needs_review'
  | 'not_confirmed'
  | 'conflicting';
```

| State | Visible label |
|---|---|
| `source_checked` | Source checked |
| `needs_review` | Needs review |
| `not_confirmed` | Not confirmed |
| `conflicting` | Conflicting evidence |

This is a thin domain mapping over the existing Badge control. Keep the labels in one place. Use text as well as colour. “Source checked” applies to the selected claim, not the entire package, source document or supplier.

### EvidencePanel

```ts
type EvidencePanelProps = {
  citation: Citation | null;
  onClose: () => void;
};
```

Display:

1. Document title or record name.
2. Page, section or structured-record locator.
3. Exact supporting quotation.
4. Package/project context and ReviewStatus.
5. Limits or conflicting evidence.
6. Original-source link, when available.

Use a shared citation object:

```ts
type Citation = {
  id: string;
  sourceId: string;
  title: string;
  quote: string;
  reviewStatus: ReviewState;
  level: 'package' | 'project' | 'general';
  projectId?: string;
  packageId?: string;
  page?: number;
  section?: string;
  recordLocator?: string;
  passageId?: string;
  sourceUrl?: string;
  limitation?: string;
};
```

Quotation and locator are evidence data. Do not generate or guess them in the frontend. A PDF viewer is unnecessary for the first demo; show the excerpt and link to the original document.

## Page composition

| Result tab | Compose with |
|---|---|
| **Overview** | EvidenceItem findings, historical price/duration examples and gaps |
| **Similar packages** | PackageCard list; native project, voltage, terrain and contract filters when supported by the data |
| **Tender requirements** | EvidenceItem requirements; existing Checkbox controls for draft-review selection |
| **Risks & lessons** | EvidenceItem reported problems, source lessons and separate planning implications |

`ResultsPage` is the composition layer. Do not make a reusable component for every heading, section or small layout wrapper. Add pagination only when the result list needs it.

## Shared state

Keep this state at the results-page level:

```ts
{
  query,
  activeTab,
  filters,
  selectedPackageIds,
  selectedRequirementIds,
  activeCitationId
}
```

Store each citation once in `citationsById`. Result items reference citation IDs. Resolve `activeCitationId` for the single EvidencePanel. This avoids duplicated source text and inconsistent review labels across tabs.

Keep temporary control state, such as expanded award history, inside its component. No global state library is needed for this demo.

## Keep the first build small

**Build:** search, four result tabs, reusable result items, package selection, source evidence and clear evidence limits.

**Defer:** chat sidebar, charts, map, risk scores, supplier rankings, live monitoring, PDF annotation and document generation.

Use the same component props for mocked and live results. Replacing the mock data loader should not require rewriting the components. Mark the demo as saved evidence; editing the query must not imply that a live search ran.

The interface can be built now. Live Gold/search output and most candidate-package interpretations remain unverified.
