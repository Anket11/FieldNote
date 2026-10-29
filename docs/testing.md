# Testing

Use Node.js 22.13 or newer for the test toolchain. CI uses Node.js 22.

## Commands

- `npm test`: existing Node tests for domain validation, evidence handling, transport, persistence and static rendering.
- `npm run test:ui`: React Testing Library + Vitest interaction tests in jsdom.
- `npm run test:ui:watch`: interaction tests in watch mode.
- `npx playwright install chromium`: install browser binaries once.
- `npm run test:e2e`: Playwright desktop and mobile Chromium workflows.
- `npm run test:e2e:ui`: interactive browser test runner.
- `npm run test:all`: all three suites.
- `npx playwright show-report`: view the last browser report.

## Coverage

Interaction tests cover answer/source notes and tags, inline Notebook editing, cancel/save behavior, search/filtering, tasks, workspace creation and restoration, malformed storage, quota failures, composer input and keyboard controls, sources opening/collapsing, library search, list/map selection, safe source rendering, and selection toolbar placement, follow-up drafting, quoted notes and dismissal.

Browser tests cover landing navigation, workspace isolation and reload, complete research rendering and restoration, notes and tags across reload, editing within the Notebook card, source annotations and source reopening, selected-text follow-ups and quoted notes, research-history navigation, no-token map fallback, transient research retries, and viewport overflow/navigation. Each workflow runs on desktop Chromium and a mobile Chromium viewport.

## Isolation and failure artifacts

Playwright starts a separate Next dev server on port 3100, using `.next-e2e` so it does not disturb the development server on port 3000. The workspace route warms before tests start. Each test has its own browser context and local storage.

All CopilotKit requests are intercepted by `tests/e2e/fixtures.ts`. Research responses replay the existing `ScriptedAgent` and real AG-UI events; tests never use a real model key or make paid AI requests. The test server uses an intentionally invalid placeholder key solely to render configured UI. Do not run these tests against a production URL.

The browser suite deliberately disables the Mapbox token and verifies the accessible list fallback. It does not verify live Gemini/Databricks behavior, AI answer accuracy, real Mapbox rendering, or physical mobile devices. Existing live smoke scripts remain separate.

Screenshots and traces are retained on failure in `test-results`; the HTML report is in `playwright-report`. These outputs and `.next-e2e` are Git-ignored. GitHub Actions installs Chromium and uploads failure artifacts for seven days.
