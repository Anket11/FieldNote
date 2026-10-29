# Research Workspace: conversation-driven research workspace

Status: Implemented in the shared workspace on 2026-10-28. Workspace-level testing boundary approved. Scripted transport and browser flows verified; live Gemini output verification is left to the user. Issue-tracker setup remains unavailable.

## Problem Statement

The current application makes procurement officers navigate a description form, comparison workspace and procurement-planning tab to find information. It exposes entire result sections even when the user needs one answer. The desired experience is a research conversation: ask a question, receive a focused answer grounded in the available procurement records, and see an interactive component only when it helps answer that question.

A research topic must have its own chat. Follow-up questions must retain that conversation's context without inheriting another chat's filters, checklists or assumptions. Browsing a procurement must not silently turn a general question into a question about that procurement.

## Solution

Replace workflow-tab navigation with a chat workspace. Keep a persistent user-input composer at the top, a small chat-history sidebar with New chat, and the conversation in the main area. Requested lists, maps and checklists appear inside assistant messages. A contextual panel on the right shows procurement details or evidence when the user opens them; it is empty when a plain answer is sufficient. On narrow screens, contextual content opens in a dedicated view with a return action.

Each chat is a separate research workspace using the same supplied procurement library for the first version. Gemini answers the actual question through CopilotKit, using approved components and bounded application tools. There is no A2UI integration in this version. Preserve the current native controls and minimal Tailwind layout approach; do not perform a visual redesign.

Examples of the response contract:

- “Who won the Tuensang contract?” produces a concise supplier answer with its citation, without adding an unrequested map, overview or checklist.
- “Find similar procurements” produces a procurement-title list when the available records support an answer. Missing essential criteria trigger one focused clarification.
- “Show those procurements on a map” produces a map for the referenced records, with honest handling of missing or approximate locations.
- “What requirements should we consider?” produces the requested requirements with citations, without displaying the full research report.
- “Make a preparation checklist” produces an approved checklist component, distinguishing documented requirements from suggested actions.

## User Stories

1. As a procurement officer, I want to ask a procurement question in a top-of-workspace input, so that I can begin research without completing an extracted-fields form.
2. As a procurement officer, I want to create a new chat for a new research topic, so that unrelated procurement needs remain separate.
3. As a procurement officer, I want a small list of chats from the current page session, so that I can return to an earlier research conversation.
4. As a procurement officer, I want follow-up questions to retain the current conversation, so that I do not need to repeat an explicitly established procurement reference.
5. As a procurement officer, I want a new chat to start without another chat's filters, viewed procurement or checklist edits, so that answers do not inherit unrelated assumptions.
6. As a procurement officer, I want a response to address only my question, so that I do not have to scan unrelated findings.
7. As a procurement officer, I want plain questions answered in concise text, so that an interactive component is not created unnecessarily.
8. As a procurement officer, I want the agent to ask for clarification only when ambiguity blocks the requested task, so that research does not become a mandatory questionnaire.
9. As a procurement officer, I want missing information identified as unknown, so that the answer does not invent scope, suppliers, values, duration or terrain.
10. As a procurement officer, I want to research the supplied library using my own wording, so that I am not restricted to the example query's wording in chat.
11. As a procurement officer, I want the interface to distinguish using the existing library from conducting external research, so that I understand what was actually searched.
12. As a procurement officer, I want each chat to access the same supplied library initially, so that I can explore different questions without implying that new source records have been retrieved.
13. As a procurement officer, I want requested procurement results presented through the existing title-only list, so that I can scan them quickly.
14. As a procurement officer, I want to open a listed procurement's details in the contextual panel, so that I can inspect it without losing the conversation.
15. As a procurement officer, I want browsing a procurement to remain separate from directing the agent's answer, so that clicking a title does not silently narrow my next general question.
16. As a procurement officer, I want to ask explicitly about a procurement by name, reference or an established conversational reference, so that the intended subject is clear.
17. As a procurement officer, I want ambiguous procurement references clarified, so that information from different packages is not combined accidentally.
18. As a procurement officer, I want supplier, award value and stated contract duration drawn from the actual records, so that commercial information remains attributable.
19. As a procurement officer, I want awards linked to packages only when the existing source identity establishes that relationship, so that similar project names do not produce false associations.
20. As a procurement officer, I want the agent to update filters when I request it, so that I can refine results conversationally.
21. As a procurement officer, I want the requested list or map view rendered using the existing components, so that the interaction remains familiar.
22. As a procurement officer, I want switching List/Map within a procurement browser to preserve its detail view, so that changing presentation does not discard what I am inspecting.
23. As a procurement officer, I want records with missing locations to remain discoverable, so that map availability does not hide relevant records.
24. As a procurement officer, I want terrain and historical imagery shown when relevant to my request, so that geographic context is available without occupying every answer.
25. As a procurement officer, I want historical imagery to retain the existing one-image-per-year navigation, so that the geographic component stays simple.
26. As a procurement officer, I want factual answers to include numbered citations to available evidence, so that I can inspect their basis.
27. As a procurement officer, I want the same source passage to keep the same citation number within a chat, so that repeated references remain recognizable.
28. As a procurement officer, I want a citation to open the referenced passage, so that I do not have to search an entire document for the evidence.
29. As a procurement officer, I want relevant supplied excerpts before document metadata and expandable full text, so that the evidence panel answers my immediate question first.
30. As a procurement officer, I want original-document links when available, so that I can inspect the underlying document.
31. As a procurement officer, I want closing evidence to restore the originating citation and my reading position, so that source inspection does not disrupt research.
32. As a procurement officer, I want prior answers to remain unchanged when later filters or browsing context change, so that the conversation remains a reliable record of what was answered.
33. As a procurement officer, I want to revisit an earlier answer's associated output, so that I can inspect the records and evidence used in that answer.
34. As a procurement officer, I want a requested checklist rendered through an approved component, so that I can interact with it consistently.
35. As a procurement officer, I want documented requirements distinguished from agent-suggested preparation actions, so that suggestions do not appear to be contractual obligations.
36. As a procurement officer, I want to check or uncheck checklist items and add my own notes, so that I can record my preparation work separately from source material.
37. As a procurement officer, I want checklist changes made by the agent to follow my explicit instructions, so that discussing an action does not mark it complete.
38. As a procurement officer, I want checklist edits retained when moving between chats during the session, so that returning to a conversation restores my work.
39. As a procurement officer, I want progress indicators to reflect operations actually taking place, so that a completed progress display does not falsely imply verified sources.
40. As a procurement officer, I want clear loading, empty and error states, so that I can distinguish missing evidence from a failed request.
41. As a procurement officer, I want a failed agent request to retain my question and existing conversation, so that I can retry without rebuilding the context.
42. As a keyboard or mobile user, I want to operate the composer, chats, output controls and citations accessibly, so that the layout does not depend on mouse interaction or a wide screen.
43. As the application maintainer, I want Gemini credentials used only by the server runtime, so that no API key is included in browser code or agent-rendered content.
44. As the application maintainer, I want model-requested record IDs, citation IDs and UI actions validated, so that the model cannot render arbitrary components or reference nonexistent sources.

## Implementation Decisions

- Build one conversation-driven workspace in the existing React/Next.js application. Remove the Define the need, Compare and assess and Procurement Plan workflow tabs from the primary experience. Do not restore the removed extracted-need confirmation or empty plan editor.
- Use native HTML controls and existing Tailwind layout utilities. Reuse the existing procurement list, shared procurement details, map, geographic views, evidence items and citation panel. Keep components focused and colocate feature-specific children with their parent. Retain required existing map-vendor CSS; do not add a new visual theme or prebuilt chat stylesheet.
- Use CopilotKit for agent messaging, approved component rendering, application context and bounded frontend tools. Use its headless/custom UI route so the application controls the chat layout. A2UI is explicitly excluded from this implementation.
- Use a server-side CopilotKit runtime with Gemini in the existing Next.js application. The documented built-in Google model path avoids requiring a separate Python/ADK service. Select and verify compatible package versions during implementation; compatibility with the exact installed React/Next.js versions has not yet been tested.
- Configure the Gemini key through a server-only environment variable. Never require the user to paste the key into chat, never expose it through public environment variables, and do not render it in errors or logs.
- Keep existing research-response contracts, source fixtures, source text and validation intact. Provide the agent with server-side lookup tools over the current adapted dataset. Preserve the existing search service's interface and saved-query behavior; the chat library lookup must not pretend that arbitrary questions generated fresh retrieval results.
- Both the agent and renderer operate on approved records and source IDs. Existing components resolve those IDs to application-owned data rather than trusting generated suppliers, prices, durations, source URLs or geography. Model-generated summaries and suggestions must not overwrite the underlying source records.
- Reuse the existing conservative package/award association behavior. Do not infer a link from project identity, similar names or approximate location alone.
- Make chat identity the boundary for messages, conversation context, filters, displayed outputs, viewed procurement, checklist edits, pending requests and evidence-panel return position. Switching chats restores that chat's state. A late response must never be appended to a different chat simply because it became active.
- Retain chats and their edits for the current page session only. No refresh persistence, account storage or cross-device synchronization is required. Treat the history sidebar as a session chat switcher, not workflow navigation.
- Render requested interactive output inside its assistant message. The contextual panel is used for procurement details or evidence opened by the user. Do not automatically show an overview, map, checklist or all planning sections with every answer.
- Browsing a procurement and choosing the subject of an answer are distinct interactions. The latest user correction overrides the earlier proposal that clicking a title automatically scopes follow-up questions. The request and explicit conversational references determine the subject; a viewed record alone does not.
- Allow the agent to update filters and switch the requested List/Map presentation through validated application tools when that serves the user's request. Filter/view actions must have a bounded, explicit target and must not rewrite unrelated earlier answers or other chats.
- Preserve previous response text, citations and the data scope of its associated output when later context changes. Keep existing source numbering stable for the same passage within a chat. Referencing the same document through different supplied passages does not establish identical evidential support.
- Open citations in the shared contextual evidence panel. Show supplied relevant excerpts first when available; otherwise make the supplied full passage available without inventing a quotation. Include finding context, source/project information, expandable full text and an original link when supplied. Preserve escaped rendering of embedded JSON or HTML.
- Closing contextual evidence restores the originating citation and reading position. On mobile, use a dedicated contextual view with a return action while retaining the underlying conversation state.
- Add the smallest approved checklist component needed for checkboxes and user notes. Every item distinguishes source-backed requirements from suggested preparation actions. Source-backed items retain evidence references; suggestions must not present an attached citation as proof of a contractual obligation.
- User checklist notes and completion state are separate from immutable source material. The agent may change checklist content or completion only in response to an explicit user instruction. Generating, reading or discussing a checklist is not completing its work.
- Keep the existing map provider, Copernicus terrain source and annual satellite-imagery integration. Expose geographic outputs when requested; preserve honest missing-location, approximate-location, empty-imagery and service-error states. Do not invent transmission routes or infrastructure models.
- Show execution status only for real operations reported by the application or runtime. Do not expose fabricated thinking text, invented verification tasks, artificial completion graphs or claims that document support was verified merely because a lookup completed.
- Preserve the submitted question, prior replies and valid outputs on failure. Surface a usable retry path, prevent duplicate concurrent submission, and distinguish missing configuration, unavailable services, no matching evidence and an unsupported request.

## Testing Decisions

- **Approved primary seam:** exercise the complete chat workspace through user-visible actions and rendered outputs, with a scripted agent transport replacing nondeterministic Gemini responses in automated tests. Include tool requests and their validation at this boundary rather than testing each component's internal hooks.
- A good test asserts the external behavior promised to a procurement officer: the requested answer/component appears, unrelated output does not, citations resolve, explicit actions affect the correct output, and another chat is unaffected. Do not assert implementation details, component nesting, internal tool names, speculative model reasoning or exact generated prose.
- Prefer existing project testing patterns: the current tests already render the workspace through its Redux provider and exercise search, evidence state, source escaping, response validation and package/award matching. Reuse their fixtures and trusted-source assertions. Add interactive workspace coverage where required to exercise the conversation lifecycle and user actions; do not replace it with one unit test per small component.
- Script the following acceptance conversations: a supplier-only question; a similar-procurements list; an explicitly requested map; a cited requirement answer; a checklist containing clearly distinguished source requirements and suggestions; an ambiguous procurement reference; and a question the available records cannot answer.
- Verify that clicking a procurement title opens details but does not implicitly bind the next general question to it. Verify that an explicitly named or conversationally established procurement can be addressed.
- Verify New chat isolation, switching back to a chat, preservation of previous answers and checklist edits, filter actions targeting the intended output, and late agent responses arriving after a chat switch.
- Verify that invalid record IDs, unrelated citation IDs, unsupported component requests and arbitrary generated HTML cannot become trusted rendered output. Verify original source content remains unchanged after chat and checklist actions.
- Verify real loading/error/empty transitions, retry without losing the question, no duplicate submission, and no fabricated completed verification state.
- Verify keyboard operation, citation focus/scroll restoration and the mobile contextual return flow at the workspace boundary. Retain existing focused validation tests for research data and geographic-service adapters.
- Perform a separate live Gemini smoke check after the user supplies the server-side key. Confirm a cited answer, an approved rendered component and a requested filter action. This validates real integration and context delivery, not universal factual accuracy. Do not require a live paid model for routine deterministic tests.
- Run the existing type, lint, test and production-build checks. Recheck affected browser flows after integration. Existing tests for the removed workflow-tab experience must be updated around the conversation contract rather than retained as requirements for obsolete screens.

## Out of Scope

- Live tender discovery, external web research, new procurement retrieval infrastructure or claims that Gemini alone adds those capabilities.
- Changing the backend research-response schema, editing supplied source content or inventing verified coverage, award associations, supplier information or completion outcomes.
- A2UI, a separate Python agent service, arbitrary model-generated HTML, an unrestricted component catalog or dynamic code execution.
- A visual redesign, decorative CSS, a new design system, generated video/audio outputs or a reproduction of every visual element in the reference screenshot.
- Workflow-tab navigation, the removed extracted-fields confirmation, a full procurement-plan document editor, tender generation or plan export.
- Saved accounts, refresh-persistent chat storage, authentication, shared workspaces and cross-device history.
- Unrequested proactive research, background actions spanning chats or automatic checklist completion.
- New map providers, custom infrastructure geometry, survey-grade terrain, annual elevation changes, historical-image mosaics or two-date image comparison.
- Deployment and production operational setup beyond the local server-side agent integration.

## Further Notes

- The reference screenshot informs the conversation/input/contextual-output arrangement, not styling or unsupported product features. Its contradiction between completed verification tasks and an answer saying no tenders were verified must not be reproduced.
- The current repository has no chat agent, runtime API route, CopilotKit dependency or Gemini integration. Its research source is a local supplied dataset. Geographic integrations already exist and must be reused.
- Clarification from the latest user reply: procurement-specific information is requested by the user; browsing alone does not silently select the subject of the next answer.
- Detailed mechanics for reopening historical interactive outputs and request cancellation were not separately settled during the interview. Preserve the agreed invariants above; do not treat a particular interaction mechanism as user-approved. Any consequential remaining choice should be made explicit before implementation.
- This specification supersedes the earlier form-and-tabs UI direction for the chat experience. The user subsequently authorized implementation.
- The invoked to-spec skill requires user agreement on testing seams before publication. The user confirmed that boundary before authorizing implementation.
- No issue tracker, repository remote or project triage setup was found. Run `/setup-matt-pocock-skills` to configure the destination. Once configured and the testing boundary is agreed, publish this specification with the `ready-for-agent` label. Do not infer a repository or publish to an unrelated project.

Official integration references reviewed during specification:

- [CopilotKit Next.js quickstart](https://docs.copilotkit.ai/quickstart)
- [Gemini model selection and server credentials](https://docs.copilotkit.ai/model-selection)
- [Headless custom UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui)
- [Approved component registration](https://docs.copilotkit.ai/reference/v2/hooks/useComponent)
- [Validated frontend tools](https://docs.copilotkit.ai/reference/hooks/useFrontendTool)
- [Agent application context](https://docs.copilotkit.ai/reference/hooks/useAgentContext)
- [Server tools over existing application data](https://docs.copilotkit.ai/server-tools)
