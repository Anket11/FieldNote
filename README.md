# Research Workspace

A conversation-driven procurement research app built with Next.js, React, Redux and CopilotKit. Native HTML controls and minimal Tailwind layout only. Gemini answers questions against the supplied procurement library; this app does not perform live tender discovery.

## Run

Use Node.js 20.9 or newer:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, add your server-only `GEMINI_API_KEY`, and restart the server. `GEMINI_MODEL` defaults to `gemini-3.8-flash`; set it to another supported Gemini model when needed. Never prefix the Gemini key with `NEXT_PUBLIC_`. `COPILOTKIT_TELEMETRY_DISABLED=true` opts out of runtime telemetry.

`NEXT_PUBLIC_MAPBOX_TOKEN` is the existing public Mapbox token for geographic outputs. Geography remains optional. Missing Gemini configuration is shown explicitly, and Send stays disabled until configuration is available; there are no fake AI replies.

Open http://localhost:3000 for the landing page. Its **Explore the workspace** CTA opens `/workspace`, where the procurement research app lives. The workspace logo returns to the landing page. **Use example query** fills a demo procurement request; edit it if needed, then select **Send**. You can also start with a question such as:

- Who won the Tuensang substation contract?
- Find similar 132 kV procurements.
- Show those procurements on a map.
- Show requirements to consider.
- Make a preparation checklist.
- Show 3D terrain near Tuensang, Nagaland, India.

## Conversation behavior

The top composer submits questions directly. Conversation turns appear newest first; each question stays above its response. The model still receives the conversation in chronological order. New chat starts a separate research topic; the sidebar switches between chats in the current page session. Chats and edits are not saved across refreshes.

The agent gives a brief, query-focused synthesis (normally 1–3 short sentences) explaining useful matches, material differences or unknowns, and where to look next. It leaves package-by-package narratives and identifiers in the collection/detail view rather than repeating them in the summary. It configures a reusable collection, checklist or geographic view only when requested or needed. Multi-topic requests use separate titled outputs (for example, Procurement packages, Risks, and Lessons), keeping package browsing separate from findings. Collections use one list/map renderer for procurement records, risks, requirements, lessons or actions, with optional titles and selected source fields. The old Define / Compare / Procurement Plan workflow tabs are removed. Earlier answers retain their own records, selection and view state. Procurement collections default to a split view: titles or map on the left, selected source details on the right. Selecting a record updates only that answer’s detail pane; switching List/Map preserves its selection. This does not silently scope the next question.

Each chat owns its own CopilotKit provider, thread-bound agent, Redux research library, messages and checklist edits. This matters because CopilotKit application context is provider-scoped. Returning to a chat preserves its work; a response arriving after switching chats stays with its original chat.

Checklist source requirements, source-based preparation actions and uncited suggestions are distinguished. Checkboxes and notes are user state, separate from original source records. The agent can edit existing checklist items only after explicit completion/uncompletion or note instructions. Discussing or generating a checklist does not mark work complete.

## Sources and data boundaries

The active response is `demo-data/procurement_final.json`. Its adapter preserves exact source text, differences, unknowns and excerpts, validates response shape and IDs, and normalizes citations. Read-only agent tools expose this adapted library for arbitrary questions without claiming fresh retrieval. The obsolete query-matching mock search is removed. The composer and live smoke check share one example-query constant.

`lookupLibrary` returns available records, section/project metadata and conservative package/award associations. `readSources` returns original supplied passages for known source IDs. These tools perform no external tender search. Award links require the existing unique source-notice identity; project/name similarity alone is insufficient.

The frontend `presentResearchAnswer` tool accepts a strict, bounded schema. Application validation rejects unknown component kinds, nonexistent records, unrelated citation IDs and mixed source/suggestion checklist items before rendering. Components resolve source facts from canonical records rather than accepting generated supplier, price or duration fields. This constrains references and UI shape; it does not independently verify every generated interpretation.

Document icons in square brackets appear after the first supported mention of each source within an answer, and are suppressed in later claims or repeated detail fields. A source not already cited in the summary appears at its first relevant description or selected detail field. Passages sharing an explicit source URL or a genuine document path (PDF, Word, text or HTML) share one preview; shared JSON cache paths do not merge separate procurement or award records; matching titles alone never merge unknown documents. Hover, keyboard focus or a tap opens a reusable source preview with the supplied title, document/project context, excerpt (or full passage), and original source link when available. No author, page, URL or replacement quotation is invented. Each preview is 480 × 420 pixels, clamped to the viewport, with a fixed header and scrollable passage. It opens above or below its citation according to available space, stays open while using the preview, and closes on pointer exit, outside click or Escape. Keyboard users can Tab from the citation into its controls and scrollable passage. Opening a source does not move or resize the conversation. Source text remains escaped, and unavailable original links stay unavailable.

The Gemini key stays in the Node runtime. The browser calls the CopilotKit runtime route; no separate Python service, A2UI integration, arbitrary generated HTML or unrestricted component catalog is used. Progress is limited to actual request/output activity; no fabricated reasoning or verification graph is shown.

## Existing geographic views

Requested geographic outputs reuse Mapbox, Copernicus DEM GLO-30 and Sentinel-2 imagery. Named places remain approximate, and no infrastructure routes or models are invented. The package map keeps unmapped records selectable and has an explicit service/WebGL/token fallback.

Copernicus elevation uses the public OpenAerialMap Terrarium tile service. Historical RGB imagery uses the public Microsoft Planetary Computer catalog and Data API. Year buttons cover the rolling ten-year window, with one automatically selected capture per year: the clearest among the latest 100 captures, newest on ties. Service availability, cloud cover and coverage are not guaranteed. Terrain is a static 30 m surface model, not year-specific asset geometry.

The shared Mapbox loader retains its required vendor stylesheet; no prebuilt chat stylesheet or new visual theme is added.

## Component ownership

There are two component areas:

- `components/app`: composer, chat sidebar/history, CopilotKit bridge, source bindings and adapters from canonical research data to display props. Feature-specific children live in `answers`, `details` and `evidence`.
- `components/agent`: reusable `Collection`, `SplitView`, `List`, `Details`, `Checklist`, source citation preview, marker map and location/terrain/imagery views. These components do not read Redux or import procurement record types. They accept data, labels, content slots and callbacks.

The agent requests approved data and presentation settings rather than a procurement-specific component. A collection specifies `recordIds`, `view`, an optional `title` and inline `fields` (`text`, `relevance`, `differences`, `unknowns`). `layout: "split"` places the selected record beside the list/map; `layout: "list"` shows a standalone list. `selectedId` can choose an initial record from that answer. Optional `detailFields` controls the adjacent pane: `text`, `location`, `supplier`, `awardValue`, `duration`, `relevance`, `differences`, `unknowns`. Each collection owns its selected record and uniquely identified detail pane. The app resolves these against immutable source records. Titles, suppliers, awards and sources are never replaced with generated record fields. Checklist notes and completion remain user edits.

An answer may provide one `output` or an ordered `outputs` array, never both. Each section reuses the same components; procurement and finding records cannot share a collection. Sources are deduplicated across sections, and checklist item IDs remain unique within the answer.

`services/chatLibrary` validates output schemas and source bindings; `services/chatActions` validates explicit checklist changes. Existing procurement lookup, source and geographic integrations are retained.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build -- --webpack
```

Tests cover source immutability, data validation, award association, requested-only output rendering, citation binding, per-chat source-library isolation, checklist intent/item validation, escaped notes and sources, map fallbacks and annual imagery behavior. The scripted transport also exercises real AG-UI events, delayed response isolation and retry behavior. Earlier browser verification covered the actual CopilotKit flow for cited answers, inline lists, checklist typing/edits, chat switching, retry/draft preservation and citation-preview placement, dismissal and keyboard scrolling. Temporary browser-test routes were removed afterward. Live Gemini validation requires a configured key and is separate from these deterministic checks.

With the server running, check the real Gemini request and validate its rendered output contract:

```sh
node --import tsx --env-file=.env.local scripts/check-chat-agent.ts
```

The chat distinguishes depleted prepaid credits, quota limits, invalid keys and unavailable models. For depleted credits, add credits to the key's project in Google AI Studio before retrying; changing the prompt cannot resolve billing failures.

## CSS management

- Edit `src/app/theme.css` for app-wide design changes. All design tokens live on `:root`, including those used by portaled source previews.
- Edit `src/app/globals.css` for shared element defaults. It imports the theme and Tailwind theme/utilities without Preflight.
- Edit the adjacent `ComponentName.module.css` for a specific component’s appearance and layout. Consume theme variables; keep runtime map and preview positioning in code. Avoid utilities that compete with properties owned by a module.

Responsive modules use fixed breakpoints for split views and the workspace; CSS variables cannot be used in media query conditions. Fonts are served locally from `public/fonts` with their license notices.


### Chat design lookup

The center chat follows the Nouswise reference: warm surfaces, a rounded composer, source cards, and open reading space. No reference stylesheet is imported wholesale.

| Change | File |
| --- | --- |
| Colors, fonts, spacing, radii, shadows, motion settings | `src/app/theme.css` |
| Element defaults and shared animation keyframes | `src/app/globals.css` |
| Composer | `src/components/app/ChatComposer.module.css` |
| Questions and answers | `src/components/app/ChatMessages.module.css` |
| Plan, activity, and live status | `src/components/app/ResearchProgress.module.css` |
| Sources and source reader | Adjacent modules under `src/components/app/evidence/` |
| Citation chips and previews | `src/components/agent/sources/SourceCitation.module.css` |
| Agent collections, lists, details, and checklists | Adjacent modules under `src/components/agent/` |

Geist controls and Manrope answers are served locally from `public/fonts/`, with their OFL notices. Components consume semantic theme variables. Shared motion recipes disable themselves for reduced-motion preferences. Enter sends a question; Shift+Enter adds a line.

### Research loop and library search

Each submitted question gets up to three attempts. Retry attempts stay under the same question, retain activity and known sources, and stop when the user presses Stop. Invalid keys, depleted credits, quota/rate limits, and unavailable models need user action and are not automatically retried. Each attempt retains the runtime's 12-step limit.

The agent checks source coverage with `assessEvidence`. If coverage is insufficient, the tool performs a focused library search and reports the remaining gaps. The agent reads matching sources and can refine its search; it must state limitations when the supplied library cannot answer. This is a model assessment of the supplied evidence, not independent verification or web retrieval.

The composer magnifier opens `LibrarySearch`. It starts with the current draft, ranks matching titles and source text, tolerates common single-character typos, and opens stored source passages. This is local text matching, not an embedding search. Search behavior lives in `src/services/librarySearch.ts`; presentation lives beside `LibrarySearch.tsx` in its CSS Module.

### Header and source presentation

The reference header SVG is served locally at `public/brand/world-bank-institute.svg` (downloaded from the Nouswise CDN). `WorkspaceHeader` owns the centered brand and accessible sidebar toggle; `ChatSidebar` keeps existing chat controls in a compact icon rail. Header accents remain in the root theme.

`src/services/sourceText.ts` converts serialized document bodies, HTML/XML fragments and entities into plain display text. Citation previews and the document reader share it. Raw source records and their IDs remain unchanged; source markup is never rendered as HTML.

### Workspace chat list and names

Click Workspace to open or close the adjacent chat list. New chat lives in that panel. The header toggle hides the entire left navigation without unmounting chat providers. Escape closes the chat-list panel and returns focus to Workspace.

The first question supplies a temporary title. The agent is instructed to include a short `chatTitle` in its first `presentResearchAnswer`; the validated name replaces the temporary title once, within its own chat. Later answers cannot rename it. Naming uses the existing answer request and adds no model call. Chat state remains in memory, as before.

### Icons, map targets, and turn navigation

`ChatIcon` uses the Lucide set already installed in the project. Map targets share `targetMarker.ts` and `TargetMarker.module.css`: a labelled blue pin, anchored at its coordinates, facing the viewport and kept visible over terrain and imagery. Package maps include the explicit question target in their fitted bounds; follow-up answers retain the last explicit target within that chat. The target remains an approximate area unless the user supplied coordinates. The terrain tab is named 3D; elevation attribution is retained.

The generic partial-map-data warning is suppressed; initialization failures and failures of specifically requested elevation or historical layers still have actionable messages. Turn history is merged by message ID so partial transport snapshots cannot remove previous questions or duplicate streamed responses. The question navigator renders one line marker per turn in a rounded rail, with longer active/adjacent lines, question previews on hover or keyboard focus, and scrolling for long chats.

## Automated tests

See [Testing](docs/testing.md) for React Testing Library and Playwright coverage, setup, commands, isolation, and failure reports. Run `npm run test:all` for all suites.
