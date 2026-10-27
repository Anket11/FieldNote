# Procurement demo data

These files support a local frontend demo. They are saved evidence and candidate comparison groups, not live RAG output. Gold/search has not run successfully in Databricks. No API credentials are needed.

| File | Contents |
|---|---|
| `query.json` | Proposed procurement and requested attributes |
| `evidence.json` | 40 selected items: 20 prior source-checked NAG claims and 20 selected interpretations from saved Silver quotations |
| `procurements.json` | 34 candidate comparison groups containing 36 award records; not34 confirmed independent tenders |
| `gaps.json` | 12 evidence gaps/retrieval limits |
| `coverage.json` | Partial cache coverage:1044 cached fact candidates out of36022 total Silver facts |

## Evidence rules

- NAG-SS-02A is the detailed reviewed example. Other comparison cards are candidates.
- Two original/leftover-work scope pairs are grouped conservatively. Formal replacement-contract links remain unverified. Keep every award history.
- The requested hilly terrain is not verified for every comparison. Altitude is not a slope classification.
- Project-level findings must not be attributed to a package or supplier without evidence.
- Separate a reported finding, a source-stated lesson and a planning implication.
- Preserve exact quotations and available source/page/record identifiers. Do not fabricate missing citation fields.
- `source_checked_selected_claim` maps to Source checked. Other selected evidence still needs review; the presence of a quote does not establish expert approval.
- Award-feed amounts have no verified currency. Do not infer INR/USD or compare them with explicitly denominated notice prices.
- NAG's published signed price is INR693401152. Its15month duration starts from an unconfirmed effective date. Actual completion and final paid cost remain unconfirmed.
- Historical criteria and clauses are examples for review, not requirements automatically recommended for a new tender.

Keep these source JSON files unchanged. Adapt them into UI types in the service/data layer.
