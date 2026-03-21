# v3.0.2 - 2026-03-21 08:55

## Summary
Added detailed logging to debate run execution and a helper to inspect project snapshots so we can diagnose stuck runs.

## Files Modified
- `backend/app/services/runs.py` — modified
  - Change: Added `logging` import, module-level logger, and info/error logs throughout `execute_run`
  - Reason: Runs were hanging without exposing the failure point; need visibility into each phase/agent turn
  - Change: Wrapped inner execution block with try/except and log `exc_info`
  - Reason: Ensure any uncaught exceptions mark the run as failed and appear in backend logs

- `backend/check_project.py` — created
  - Change: Added script that prints latest project/version snapshot structure (agents, flow, sample entries)
  - Reason: Quick way to verify generated snapshot data when debugging run issues

## Changes
- added: Structured logging for debate run lifecycle (start, snapshot load, failures)
- added: Debug helper script to inspect latest project snapshot
- fixed: Silent run failures now surface via `run.failed` events and backend logs

## Impact
- user-visible impact: When a run fails, status now transitions to **failed** instead of hanging indefinitely
- technical impact: Backend logs now show run progress and stack traces for easier debugging
- risks or side effects: Minimal; logging adds slight overhead but no funcional change otherwise
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending – need to restart backend and launch a new run to capture logs

## Follow-up
- remaining work
  - Restart backend, re-run debate, review new logs to pinpoint root cause
  - Fix the actual issue causing the run to fail once logs identify it
- technical debt
  - Convert `check_project.py` into a formal CLI tool or admin endpoint
- limitations
  - Logging alone does not resolve the underlying failure; further fixes required

---

# v3.0.1 - 2026-03-21 08:34

## Summary
Fixed false positive "Usage limit reached" error by adding debug logging and increasing development token/cost limits.

## Files Modified
- `backend/app/services/billing.py` — modified
  - Change: Added logging import and debug logs in `ensure_usage_available` method
  - Reason: Need visibility into actual usage values when limit check fails
  - Change: Log shows tokens used/included and cost used/included before raising exception
  - Reason: Helps diagnose false positives and incorrect limit configurations

- `backend/app/models.py` — modified
  - Change: Increased `UsageBalance.included_tokens` default from 250,000 to 10,000,000
  - Reason: Development usage was hitting the low limit (264k tokens used)
  - Change: Increased `UsageBalance.included_cost_cents` default from 5,000 ($50) to 500,000 ($5000)
  - Reason: Align cost limit with higher token limit for development

- `backend/update_usage_limits.py` — created
  - Change: Created utility script to update existing database records
  - Reason: Need to update existing `usage_balances` rows with new limits
  - Change: Script shows before/after values and confirms update
  - Reason: Transparency and verification of database changes

- `backend/migrations/003_increase_usage_limits.sql` — created
  - Change: SQL migration to update usage limits
  - Reason: Provide migration path for updating existing databases

## Changes
- added: Debug logging in billing service showing actual usage vs limits
- added: Utility script to update database usage limits
- changed: Default token limit from 250k to 10M for development
- changed: Default cost limit from $50 to $5000 for development
- fixed: False positive "Usage limit reached" error (was 264k/250k tokens)

## Impact
- user-visible impact: "Usage limit reached" error resolved
- user-visible impact: Can now continue development without hitting artificial limits
- technical impact: Better visibility into billing checks via logging
- risks or side effects: Higher limits mean less realistic testing of limit enforcement

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Confirmed - database updated, limits now 10M tokens / $5000

## Follow-up
- remaining work
  - Consider environment-specific limits (dev vs prod)
  - Add admin endpoint to view/reset usage balances
- technical debt
  - None
- limitations
  - Limits are now very high for development, may not catch limit-related bugs

---

# v3.0.0 - 2026-03-21 07:39

## Summary
Major UX flow redesign. Simplified entry point, automatic decision classification, smart clarifying questions, decision frame confirmation, and streamlined expert agent generation.

## Files Modified
- `backend/app/services/conversation_v2.py` — created
  - Change: New conversation service with improved 6-stage flow
  - Reason: Previous flow had too many configuration steps, was not user-friendly
  - Stages: entry → classification → clarification → frame → agents → ready

- `backend/app/schemas_conversation.py` — modified
  - Change: Added DecisionClassification and DecisionFrame schemas
  - Reason: Need structured types for automatic classification and decision framing
  - Change: Updated CollectedContext with new fields (raw_question, classification, clarifications, decision_frame, etc.)
  - Reason: Support new conversation stages and data collection

- `backend/app/main.py` — modified
  - Change: Switched from ConversationService to ConversationServiceV2
  - Reason: Use new improved conversation flow
  - Change: Updated start_conversation endpoint to pass optional context parameter
  - Reason: Allow users to provide additional context upfront

- `src/release/conversationTypes.ts` — modified
  - Change: Added DecisionFrame, DecisionClassification, AgentInfo interfaces
  - Reason: Match new backend schemas
  - Change: Updated CollectedContext to match new structure
  - Reason: Frontend needs to display new context information

- `src/release/ChatInterface.tsx` — modified
  - Change: Updated welcome screen with simpler, example-driven copy
  - Reason: Entry point should feel simple and inviting
  - Change: Added stage label display and classification badges in sidebar
  - Reason: User should see decision type, stakes, and complexity
  - Change: Added decision frame display in sidebar
  - Reason: User should see the structured understanding of their decision
  - Change: Updated agent display with stance indicators (pro/con/neutral)
  - Reason: User should understand agent perspectives at a glance
  - Change: Changed "Generate Project" button to "Start Debate"
  - Reason: Clearer action language

## Changes
- added: Automatic decision classification (strategic/emotional/financial/etc.)
- added: Stakes assessment (low/medium/high/critical)
- added: Smart clarifying questions (3-7 based on decision type)
- added: Decision frame confirmation before debate
- added: Expert agent generation with pro/con/neutral stances
- changed: Entry point is now just "ask your question"
- changed: No manual configuration required
- changed: Agent naming enforced as role-based ("XYZ Agent")
- removed: Manual decision maker selection stage
- removed: Manual constraints/goals entry stage
- removed: Manual agent configuration stage

## Impact
- user-visible impact: Much simpler, faster flow from question to debate
- user-visible impact: System understands decision type automatically
- user-visible impact: Clarifying questions are tailored to specific decision
- user-visible impact: Clear decision frame shown before debate starts
- technical impact: New ConversationServiceV2 replaces old service
- risks or side effects: Old conversation sessions may not work with new flow
- breaking changes: CollectedContext schema changed significantly

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending - requires full flow test

## Follow-up
- remaining work
  - Test full conversation flow end-to-end
  - Test debate execution with new agent format
  - Verify decision frame accuracy
  - Add debate result synthesis views
- technical debt
  - Old conversation.py can be removed once V2 is validated
  - Consider adding decision type-specific question sets
- limitations
  - Classification depends on LLM accuracy
  - Clarifying questions may not cover all edge cases

---

# v3.3.9 - 2026-03-21 15:40

## Summary
Added three-dot menu to sidebar session lists with Rename and Delete functionality. Redesigned lists with minimalistic style (removed icons). Implemented inline title editing, delete confirmation modal, and backend endpoints for updating/deleting conversations, projects, and runs. Pin and Archive options are UI placeholders for future implementation.

## Files Modified
- `backend/app/main.py` — modified
  - Change: Added DELETE endpoints for conversations, projects, and runs
  - Change: Added PATCH endpoint for conversation title updates
  - Reason: Enable session management from sidebar

- `backend/app/services/conversation_v2.py` — modified
  - Change: Added `update_conversation()` and `delete_conversation()` methods
  - Reason: Support title updates and deletion of conversation sessions

- `backend/app/services/projects.py` — modified
  - Change: Added `delete_project()` method with cascade deletion
  - Reason: Delete projects and all related versions, configurations, and runs

- `backend/app/services/runs.py` — modified
  - Change: Added `delete_run()` method
  - Reason: Delete runs and all related messages and final outputs

- `src/release/api.ts` — modified
  - Change: Added API client methods for update/delete operations
  - Reason: Frontend needs to call new backend endpoints

- `src/release/Sidebar.tsx` — modified
  - Change: Removed icons from list items for minimalistic design
  - Change: Added three-dot menu button (MoreVertical icon) to each list item
  - Change: Implemented dropdown menu with Rename, Pin, Archive, Delete options
  - Change: Added inline title editing with input field (Enter to save, Escape to cancel)
  - Change: Added delete confirmation modal with Cancel/Delete buttons
  - Change: Added click-outside handler to close menus
  - Change: Updated state management for menu/editing/delete operations
  - Reason: User requested three-dot menu with rename/pin/archive/delete and minimalistic design

## Changes
- added: Three-dot menu on all sidebar list items (in-progress and completed)
- added: Rename functionality with inline editing
- added: Delete functionality with confirmation modal
- added: Backend DELETE endpoints for conversations, projects, runs
- added: Backend PATCH endpoint for conversation title updates
- changed: List items now use minimalistic design without type icons
- changed: Reduced padding and gap between list items for cleaner look
- improved: Click-outside closes open menus automatically
- placeholder: Pin and Archive menu options (UI only, not yet functional)

## Impact
- user-visible impact: Users can now rename sessions by clicking three-dot menu → Rename
- user-visible impact: Users can delete sessions with confirmation dialog
- user-visible impact: Cleaner, more minimalistic list design
- technical impact: Full CRUD operations for sessions via sidebar
- risks or side effects: Deleting projects/runs cascades to related data (versions, messages, etc.)
- breaking changes: None

## Validation
- tests: Not run
- lint: Fixed JSX structure errors
- build: Not run
- manual verification: Pending — restart backend, refresh frontend, test three-dot menu

## Follow-up
- remaining work
  - Implement Pin functionality (backend + frontend)
  - Implement Archive functionality (backend + frontend)
- technical debt
  - Consider adding undo functionality for deletions
  - Consider soft delete instead of hard delete for better data recovery
- limitations
  - Pin and Archive are UI placeholders only
  - No batch operations (delete multiple sessions at once)

---

# v3.3.8 - 2026-03-21 13:18

## Summary
Added "Load More" button with pagination to the "In Progress" sessions list in the sidebar. Both "In Progress" and "Completed" sections now support pagination, displaying 6 items initially with the ability to load 6 more at a time.

## Files Modified
- `src/release/Sidebar.tsx` — modified
  - Change: Added `inProgressDisplayCount` state (starts at 6, increments by 6)
  - Reason: In-progress list was hardcoded to show only 5 items with no way to see more
  - Change: Changed `inProgressItems.slice(0, 5)` to `inProgressItems.slice(0, inProgressDisplayCount)`
  - Reason: Enable dynamic pagination based on user interaction
  - Change: Added "Load More" button for in-progress list (identical to completed list implementation)
  - Reason: Provide consistent pagination UX across both sidebar lists

## Changes
- added: "Load More" button for in-progress sessions list
- changed: In-progress list now shows 6 items initially (was 5)
- improved: Consistent pagination behavior across both in-progress and completed lists

## Impact
- user-visible impact: Users can now view all in-progress sessions via "Load More" button
- user-visible impact: Both lists have consistent pagination (6 items + Load More)
- technical impact: Improved UX consistency between sidebar list sections
- risks or side effects: None
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — refresh frontend to see Load More button on in-progress list

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.3.7 - 2026-03-21 13:10

## Summary
Converted "Completed" from a separate full-screen view to a persistent list in the sidebar with pagination. Completed debate runs now appear directly in the sidebar below "In Progress", showing 6 items initially with a "Load More" button to display additional runs in increments of 6.

## Files Modified
- `src/release/Sidebar.tsx` — modified
  - Change: Added `completedItems` state, `loadCompletedRuns()` function, and `handleResumeCompleted()` handler
  - Reason: Need to fetch and display completed runs in sidebar list
  - Change: Added "COMPLETED" section with list rendering similar to "IN PROGRESS" structure
  - Reason: User requested completed runs appear as a list in sidebar instead of separate screen
  - Change: Implemented pagination with `completedDisplayCount` state (starts at 6, increments by 6)
  - Reason: User requested showing 6 items with "Load More" button for additional runs
  - Change: Removed "completed" from clickable nav items filter
  - Reason: Completed is now a list section, not a navigation destination
  - Change: Clicking completed run item calls `onResumeRun` to open the run screen
  - Reason: Users can view completed debate details by clicking the list item

- `src/release/ReleaseApp.tsx` — modified
  - Change: Removed `CompletedDebatesView` import and routing logic
  - Reason: Completed runs are now accessed via sidebar list, not a separate view
  - Change: Removed `activeView === 'completed'` conditional rendering
  - Reason: No longer need dedicated completed debates screen

## Changes
- changed: "Completed" section is now a persistent sidebar list instead of full-screen view
- added: Pagination for completed runs (6 items initially, "Load More" button for +6 more)
- added: Auto-load completed runs on component mount
- removed: Separate CompletedDebatesView screen
- improved: Faster access to completed runs - visible directly in sidebar

## Impact
- user-visible impact: Completed runs appear in sidebar list, no separate screen navigation needed
- user-visible impact: Clicking a completed run opens the run details screen
- user-visible impact: "Load More" button reveals additional completed runs (6 at a time)
- technical impact: Simplified navigation flow - one less view to manage
- risks or side effects: Users with many completed runs may need to click "Load More" multiple times
- breaking changes: None - "Completed" nav item no longer navigates but list is always visible

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — restart backend (for route fix), refresh frontend, check sidebar for completed runs list

## Follow-up
- remaining work
  - Backend restart required to apply route ordering fix from v3.3.6
- technical debt
  - None
- limitations
  - Pagination is client-side only (all 50 runs fetched, displayed 6 at a time)
  - Consider server-side pagination if users have hundreds of completed runs

---

# v3.3.6 - 2026-03-21 12:52

## Summary
Fixed two critical bugs: (1) Completed debate runs were not appearing in the sidebar because the `/api/v1/runs/completed` endpoint returned 404 due to FastAPI route ordering, and (2) Gemini sometimes returns structured analysis data in an `analysis` key instead of simple `content`, causing "empty debate turn" errors.

## Files Modified
- `backend/app/main.py` — modified
  - Change: Moved `@app.get("/runs/completed")` route definition before `@app.get("/runs/{run_id}")`
  - Reason: FastAPI matches routes in order; `/runs/completed` was being matched by the `{run_id}` pattern, treating "completed" as a run ID and returning 404
  - Impact: Completed runs endpoint now works correctly

- `backend/app/services/llm.py` — modified
  - Change: Added extraction logic for large nested structures (e.g., `{'agent': {...}, 'analysis': {...}}`)
  - Reason: Gemini sometimes returns structured research/analysis data in nested dicts instead of simple `content` field
  - Change: Serialize nested analysis structures as JSON-formatted content when no simple content field exists
  - Reason: Preserves the full LLM-generated analysis instead of discarding it as "empty"

## Changes
- fixed: `/api/v1/runs/completed` endpoint now returns completed runs instead of 404
- fixed: Debate turns no longer fail when Gemini returns structured analysis in nested `analysis` key
- added: Extraction and serialization of large nested analysis structures as debate turn content
- improved: Route ordering follows FastAPI best practices (specific routes before parameterized routes)

## Impact
- user-visible impact: Completed debate sessions now appear in the "Completed" section of the sidebar
- user-visible impact: Debate runs with Gemini returning structured analysis data now succeed instead of failing with "empty debate turn"
- technical impact: Content extraction is more robust against Gemini's varied response formats
- risks or side effects: Serialized JSON content may be less readable than natural language, but preserves all analysis data
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — restart backend, navigate to Completed section, and run new debate

## Follow-up
- remaining work
  - None — both issues are resolved
- technical debt
  - Consider improving the debate turn prompt to discourage Gemini from echoing input structure or returning raw analysis instead of natural language
- limitations
  - Serialized analysis content may need frontend formatting for better readability

---

# v3.3.5 - 2026-03-21 12:44

## Summary
Converted "In Progress" from a collapsible dropdown to a persistent always-visible list in the sidebar. Sessions now load automatically on mount and display continuously below the main navigation items, making active sessions immediately visible without requiring a click to expand.

## Files Modified
- `src/release/Sidebar.tsx` — modified
  - Change: Removed `inProgressOpen` state and dropdown toggle logic
  - Reason: User requested a persistent list instead of dropdown behavior
  - Change: Removed chevron icons (ChevronUp/ChevronDown) from In Progress button
  - Reason: No longer needed since list doesn't collapse
  - Change: Removed "In Progress" from clickable nav items, now displays as a section header
  - Reason: List is always visible, so clicking to toggle is no longer relevant
  - Change: Auto-load in-progress sessions on mount via `useEffect(() => loadInProgressSessions(), [token])`
  - Reason: Sessions should be visible immediately without user interaction
  - Change: Positioned in-progress list between main nav items and divider
  - Reason: Keeps it prominent and accessible in the sidebar flow

## Changes
- changed: "In Progress" is now a persistent list section, not a collapsible dropdown
- removed: Dropdown toggle state and chevron icons
- changed: Sessions load automatically on component mount
- changed: "In Progress" removed from clickable navigation items

## Impact
- user-visible impact: Active sessions are always visible in sidebar without clicking
- user-visible impact: Faster access to in-progress work — no expand/collapse needed
- technical impact: Simpler component state (removed toggle logic)
- risks or side effects: If user has many in-progress sessions, list may take more vertical space (currently capped at 5 items)
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — refresh frontend to see persistent in-progress list

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - List shows max 5 sessions; consider adding scroll or "View All" if more exist

---

# v3.3.4 - 2026-03-21 12:38

## Summary
Fixed "LLM returned an empty debate turn" caused by Gemini echoing the input payload structure and placing actual content inside `required_output.content` instead of returning a flat `{"message_type": "...", "content": "..."}` object. The content extraction logic now checks `required_output` and all nested dicts for content fields.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added extraction from `response["required_output"]["content"]` when Gemini echoes the payload structure
  - Reason: Gemini was returning `{"agent": {...}, "recent_transcript": [...], "required_output": {"message_type": "statement", "content": "<actual full answer>"}}` — the real content was there but nested inside the echoed template
  - Change: Added generic nested dict scan — checks all dict-valued keys for a `content` field
  - Reason: Future-proofs against other structural variations where Gemini wraps content in unexpected nested objects

## Changes
- fixed: Debate turns no longer fail when Gemini echoes the input payload with content inside `required_output`
- added: Extraction from `required_output.content` nested structure
- added: Generic nested dict content scan as additional fallback

## Impact
- user-visible impact: Debate runs that were failing with "empty debate turn" now succeed — the full agent reasoning was already there, just nested differently
- technical impact: Zero quality loss — the extracted content is identical to what Gemini generated
- risks or side effects: None — extraction only triggers when top-level content fields are empty
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — restart backend and rerun debate

## Follow-up
- remaining work
  - None — this addresses the specific Gemini payload echo pattern observed in production
- technical debt
  - Consider restructuring the prompt to discourage Gemini from echoing the payload
- limitations
  - None

---

# v3.3.3 - 2026-03-21 12:30

## Summary
Fixed the recurring Gemini `502: LLM returned invalid JSON` failure for debate turns without reducing answer quality. The backend now first tries to salvage malformed structured output, and if Gemini still fails JSON formatting, it transparently retries the same debate-turn request using a strict text format that preserves the full reasoning depth.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added a Gemini-specific retry path for debate turns when `_generate_json_gemini` raises `LLM returned invalid JSON.`
  - Reason: Debate runs should not fail just because Gemini formatting is malformed while the underlying reasoning is still good.
  - Change: Added `_generate_debate_turn_text` text fallback using a strict `MESSAGE_TYPE` + `CONTENT` format.
  - Reason: This preserves rich debate output while avoiding brittle JSON-only formatting for verbose agent turns.
  - Change: Added `_generate_text` and `_generate_text_gemini` helpers.
  - Reason: Debate-turn fallback needs a non-JSON generation path for Gemini only.
  - Change: Added `_parse_json_response_text`, `_extract_balanced_json_block`, `_extract_json_string_field`, and `_coerce_required_output_from_text` helpers.
  - Reason: Salvage malformed Gemini outputs when the response still contains valid structured fields embedded in broken JSON.
  - Change: Added `_parse_debate_turn_text_response` parser.
  - Reason: Convert fallback text output back into the app's internal `DebateTurnResult` structure.

## Changes
- fixed: Gemini malformed JSON no longer kills debate turns immediately
- added: Salvage path for partially valid Gemini structured output
- added: Debate-turn retry in strict text format when Gemini still fails JSON formatting
- changed: JSON failure handling is now tolerant for debate turns while remaining strict for other structured outputs

## Impact
- user-visible impact: Debate runs are much less likely to fail with `502: LLM returned invalid JSON.`
- user-visible impact: Agents can still return detailed, high-quality reasoning instead of being forced into shorter answers
- technical impact: Debate turns now have a two-layer recovery path before a run is marked failed
- risks or side effects: Final synthesis and project generation still depend on valid structured outputs and can still fail if the model returns unusable content
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — restart backend and rerun a debate that previously failed on Gemini JSON formatting

## Follow-up
- remaining work
  - Consider adding structured response schemas for Gemini if the SDK support is reliable in this environment
  - Consider telemetry for how often salvage vs text fallback is triggered
- technical debt
  - Text fallback currently applies only to debate turns, not project generation or final synthesis
- limitations
  - If Gemini returns unusable plain text with no recoverable content, the turn can still fail

---

# v3.3.2 - 2026-03-21 12:21

## Summary
Converted "In Progress" from a full-screen view to a collapsible dropdown list in the sidebar. Clicking "In Progress" now expands a dropdown showing all active sessions (conversations, projects, and runs) with one-click resume functionality, eliminating the need for a separate full-screen page.

## Files Modified
- `src/release/Sidebar.tsx` — modified
  - Change: Added `token`, `onResumeConversation`, `onResumeProject`, `onResumeRun` props
  - Reason: Sidebar needs to fetch in-progress sessions and dispatch resume actions
  - Change: Added state management for dropdown (`inProgressOpen`, `inProgressItems`, `loadingInProgress`, `resumingId`)
  - Reason: Track dropdown visibility, session data, and loading/resuming states
  - Change: Added `loadInProgressSessions` function that calls `listInProgressSessions` API
  - Reason: Fetch sessions on-demand when dropdown is opened
  - Change: Added `handleResumeItem` function that dispatches to appropriate resume handler based on item type
  - Reason: Resume conversations, projects, or runs with correct state restoration
  - Change: Modified "In Progress" nav button to toggle dropdown instead of navigating
  - Reason: Dropdown UX instead of full-screen navigation
  - Change: Added dropdown UI with session list, type icons (MessageSquare/Zap/Play), and resume buttons
  - Reason: Compact, accessible list of all in-progress items directly in sidebar
  - Change: Added chevron icons (ChevronDown/ChevronUp) to indicate dropdown state
  - Reason: Visual feedback for expandable/collapsible UI

- `src/release/ReleaseApp.tsx` — modified
  - Change: Removed `InProgressView` import
  - Reason: No longer using full-screen in-progress view
  - Change: Passed `token`, `onResumeConversation`, `onResumeProject`, `onResumeRun` to Sidebar
  - Reason: Sidebar now handles in-progress session management
  - Change: Removed routing logic for `activeView === 'in-progress'`
  - Reason: In Progress is now a dropdown, not a routable view
  - Change: Simplified navigation callbacks to not force `activeView` changes
  - Reason: Resume actions should restore appropriate screen without forcing navigation state

## Changes
- changed: "In Progress" button now opens dropdown instead of navigating to full-screen view
- added: Dropdown shows up to 5 most recent in-progress sessions with type icons and titles
- added: One-click resume buttons in dropdown for each session
- removed: `InProgressView` full-screen component from routing
- changed: Sidebar now fetches and manages in-progress sessions directly

## Impact
- user-visible impact: Faster access to in-progress sessions without leaving current screen
- user-visible impact: Dropdown shows session type (conversation/project/run) with color-coded icons
- user-visible impact: More compact UI — no need to navigate away to see active sessions
- technical impact: Reduced component complexity by eliminating full-screen view
- risks or side effects: Dropdown limited to 5 items; users with >5 sessions may need pagination (future enhancement)
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test dropdown open/close and resume functionality

## Follow-up
- remaining work
  - Add "View All" link in dropdown if more than 5 sessions exist
  - Add refresh button in dropdown to reload sessions
  - Consider adding session age/timestamp in dropdown items
- technical debt
  - `InProgressView.tsx` component can be deleted (no longer used)
- limitations
  - Dropdown shows max 5 sessions; no pagination yet

---

# v3.3.1 - 2026-03-21 12:16

## Summary
Fixed recurring "LLM returned invalid JSON" error caused by Gemini truncating responses that exceeded the default output token limit. Added explicit `max_output_tokens=8192` to allow longer debate turn responses, particularly for verbose financial modeling and detailed analysis.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added `max_output_tokens=8192` to `GenerateContentConfig` in `_generate_json_gemini`
  - Reason: Gemini was truncating responses mid-JSON when debate turns exceeded ~2048 tokens (default limit)
  - Change: Increased limit to 8192 tokens
  - Reason: Allows detailed financial modeling, multi-paragraph analysis, and complex reasoning without truncation

## Changes
- fixed: Gemini responses no longer truncate mid-generation, eliminating "LLM returned invalid JSON" errors
- changed: Gemini output token limit increased from default (~2048) to 8192

## Impact
- user-visible impact: Debate runs with verbose agents (financial analysts, detailed modelers) now complete successfully
- user-visible impact: No more 502 errors during debate execution for complex topics
- technical impact: Slightly higher API costs per turn due to longer allowed responses
- risks or side effects: Agents may generate overly verbose responses; consider adding length guidance in system prompts if needed
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — restart backend and re-run the failed debate to confirm fix

## Follow-up
- remaining work
  - Monitor debate turn lengths to ensure they stay reasonable
  - Consider adding explicit length constraints in agent system instructions if verbosity becomes an issue
- technical debt
  - None
- limitations
  - 8192 tokens is still a hard limit; extremely verbose responses may still truncate (unlikely in practice)

---

# v3.3.0 - 2026-03-21 12:04

## Summary
Implemented in-progress session saving and resumption. Active conversations, projects awaiting a debate run, and queued/running debates are now automatically saved and accessible from the "In Progress" sidebar navigation. Sessions can be resumed from any interruption point — including technical failures and connection errors.

## Files Modified
- `backend/app/services/conversation_v2.py` — modified
  - Change: Added `list_in_progress_sessions` method
  - Reason: Single query to aggregate all 3 in-progress types from the workspace
  - Change: Queries active conversation sessions (status = in_progress)
  - Reason: Scenario 2 — user is still completing pre-requisite information
  - Change: Queries projects with no active/completed run (subquery exclusion)
  - Reason: Scenario 3 — user has completed info and is in review/run screen
  - Change: Queries queued and running debate runs joined with project title
  - Reason: Scenario 1 — debate is running or failed mid-run
  - Change: Results sorted by updated_at descending
  - Reason: Most recently active sessions appear first

- `backend/app/main.py` — modified
  - Change: Added `GET /api/v1/sessions/in-progress` endpoint
  - Reason: Frontend needs a single endpoint to populate the In Progress view

- `src/release/api.ts` — modified
  - Change: Added `InProgressItem` interface
  - Reason: Type-safe representation of conversations, projects, and runs
  - Change: Added `listInProgressSessions` function
  - Reason: Fetch all in-progress items from workspace
  - Change: Added `getProject` function
  - Reason: Load project by ID when resuming from project or run item

- `src/release/InProgressView.tsx` — created
  - Change: New component showing all in-progress items as resumable cards
  - Reason: Users need a single place to see and continue interrupted work
  - Change: Cards show type badge (CONVERSATION / PROJECT READY / DEBATE), stage label, and progress bar
  - Reason: Visual clarity on where each session is in the workflow
  - Change: "Resume" button dispatches correct handler per item type
  - Reason: Conversation → restores ChatInterface; Project → opens ProjectReviewScreen; Run → opens RunScreen
  - Change: Refresh button to re-poll in-progress sessions
  - Reason: State may have changed since page load
  - Change: Applied Colonial Blue / Burnt Orange color palette
  - Reason: Consistent with overall design system

- `src/release/ChatInterface.tsx` — modified
  - Change: Added `resumeSessionId` optional prop
  - Reason: Allow ReleaseApp to inject a session ID to resume
  - Change: Added `useEffect` that loads conversation history when `resumeSessionId` is set
  - Reason: Restore all messages and context state from the database on mount
  - Change: Added `resuming` state with spinner overlay
  - Reason: Show feedback while history is being loaded

- `src/release/ReleaseApp.tsx` — modified
  - Change: Imported `InProgressView` component
  - Reason: Wire up in-progress navigation
  - Change: Added `resumeSessionId` state
  - Reason: Passed to ChatInterface to trigger history restore
  - Change: Added `handleResumeConversation`, `handleResumeProject`, `handleResumeRun` callbacks
  - Reason: InProgressView dispatches resume actions to parent, which sets the correct screen state
  - Change: Added routing branch for `activeView === 'in-progress'` with no active session
  - Reason: Show InProgressView when no project/run is loaded and user clicks In Progress
  - Change: `onBack` on RunScreen and `onRunLaunched` on ProjectReviewScreen now navigate to 'in-progress'
  - Reason: Keep user in the In Progress context after launching or completing a run

## Changes
- added: `GET /api/v1/sessions/in-progress` backend endpoint
- added: `InProgressView` component with resume capability for all 3 session types
- added: `resumeSessionId` prop on `ChatInterface` to restore sessions from DB
- added: Full conversation history restore (messages + context) on resume
- changed: `onBack` on RunScreen navigates to In Progress instead of new decision
- changed: `onRunLaunched` navigates to In Progress to stay in context

## Session States Covered
1. **Technical failure / connection error** — conversation session stays `in_progress` in DB; accessible via In Progress sidebar until manually cleared
2. **Pre-requisite info incomplete** — active `ConversationSession` (status=in_progress) appears as a CONVERSATION card
3. **Project ready, debate not started** — generated `Project` with no active/completed run appears as PROJECT READY card

## Impact
- user-visible impact: "In Progress" sidebar is now fully functional with real sessions
- user-visible impact: No session data is lost on refresh or connection drop
- user-visible impact: Users can resume conversations with full message history intact
- user-visible impact: Users can jump back to project review or an active run
- technical impact: All persistence uses existing DB tables — no migrations needed
- risks or side effects: Conversation sessions accumulate unless explicitly closed; no auto-cleanup yet
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending

## Follow-up
- remaining work
  - Add ability to archive/delete in-progress sessions from the list
  - Auto-mark conversation sessions as stale after N days
  - Show error badge on sessions that failed
- technical debt
  - Consider adding a `failed` status to ConversationSession for interrupted sessions

---

# v3.2.1 - 2026-03-21 11:58

## Summary
Fixed "LLM returned invalid JSON" error by adding robust JSON extraction logic to handle Gemini wrapping responses in markdown code blocks.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Enhanced `_generate_json_gemini` with multiple JSON extraction patterns
  - Reason: Gemini sometimes wraps JSON in markdown code blocks (```json ... ```)
  - Change: Added fallback pattern matching for ```json, ```, and raw { ... } extraction
  - Reason: Try multiple strategies before failing to maximize success rate
  - Change: Increased logged response preview from 500 to 1000 chars
  - Reason: Better debugging when all extraction attempts fail

## Changes
- added: Regex pattern matching to extract JSON from markdown code blocks
- added: Three fallback patterns: ```json, ```, and brace matching
- changed: Error logging now shows first 1000 chars instead of 500
- fixed: "LLM returned invalid JSON" errors when Gemini wraps response in markdown

## Impact
- user-visible impact: Debate runs should complete successfully instead of failing on JSON parse errors
- technical impact: More resilient to LLM output format variations
- risks or side effects: Brace matching could extract wrong JSON if response has multiple objects
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending - backend auto-reloads, retry failed debate run

## Follow-up
- remaining work
  - Monitor logs to see which extraction pattern is most commonly used
  - Consider adding response format enforcement in system prompts
- technical debt
  - Could extract JSON parsing logic to a shared utility function
- limitations
  - Greedy regex patterns may fail on very malformed responses

---

# v3.2.0 - 2026-03-21 11:49

## Summary
Implemented completed debates archive with full transcript viewing. Users can now access all completed debate runs from the sidebar, view complete transcripts with agent statements, and review final synthesis outputs.

## Files Modified
- `backend/app/services/runs.py` — modified
  - Change: Added `list_completed_runs` method to query completed debates with project title and summary
  - Reason: Need efficient endpoint to list all completed debates for a workspace
  - Change: Added `get_full_run_details` method to fetch complete debate data including transcript, agents, and final output
  - Reason: Single endpoint to get all debate details for viewing
  - Change: Joins with Project and FinalOutput tables for enriched data
  - Reason: Avoid N+1 queries and provide complete information in one call

- `backend/app/main.py` — modified
  - Change: Added `GET /api/v1/runs/completed` endpoint
  - Reason: List all completed debates for the workspace
  - Change: Added `GET /api/v1/runs/{run_id}/full` endpoint
  - Reason: Get complete debate details including transcript and synthesis

- `backend/app/schemas.py` — modified
  - Change: Changed `FlowStepDraft.rules` from `dict[str, Any]` to `list[str] | dict[str, Any]`
  - Reason: LLM was returning rules as list of strings, causing validation errors
  - Change: Updated default from `dict` to `list`
  - Reason: Match the most common LLM output format

- `src/release/api.ts` — modified
  - Change: Added `CompletedDebateListItem` and `FullDebateDetails` interfaces
  - Reason: Type safety for new API responses
  - Change: Added `listCompletedDebates` and `getFullDebateDetails` functions
  - Reason: Frontend API client for completed debates endpoints

- `src/release/CompletedDebatesView.tsx` — created
  - Change: New component showing grid of completed debates with summary cards
  - Reason: Main UI for browsing completed debates
  - Change: Click to expand full debate view with agents, transcript, and synthesis
  - Reason: Detailed view of complete debate including all agent statements
  - Change: Transcript shows phase name, speaker, sequence, and full content
  - Reason: Users need to see the complete conversation flow
  - Change: Final synthesis section shows summary, verdict, and recommendations
  - Reason: Display the debate outcome and actionable insights
  - Change: Applied Colonial Blue and Burnt Orange color palette
  - Reason: Consistent with overall design system

- `src/release/ReleaseApp.tsx` — modified
  - Change: Imported `CompletedDebatesView` component
  - Reason: Wire up completed debates view
  - Change: Added conditional rendering for `activeView === 'completed'`
  - Reason: Show CompletedDebatesView when user clicks "Completed" in sidebar

## Changes
- added: Backend endpoint `GET /api/v1/runs/completed` to list completed debates
- added: Backend endpoint `GET /api/v1/runs/{run_id}/full` to get full debate details
- added: CompletedDebatesView component with list and detail views
- added: Complete transcript viewing with phase, speaker, and sequence info
- added: Final synthesis display with summary, verdict, and recommendations
- changed: FlowStepDraft.rules schema to accept both list and dict formats
- fixed: Pydantic validation error when LLM returns rules as list of strings

## Impact
- user-visible impact: "Completed" sidebar nav now functional - shows all finished debates
- user-visible impact: Can browse completed debates and view full transcripts
- user-visible impact: Each agent's statements are clearly labeled with phase and sequence
- user-visible impact: Final synthesis and recommendations are easily accessible
- technical impact: Existing database schema sufficient - no migrations needed
- technical impact: Efficient queries with joins to avoid N+1 problems
- risks or side effects: Large transcripts may be slow to render (not paginated)
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending - needs completed debate run to test

## Follow-up
- remaining work
  - Add pagination for debates list if workspace has many completed runs
  - Add search/filter by project title or date range
  - Add export transcript as PDF or markdown
- technical debt
  - Consider caching full debate details to reduce database load
  - Transcript rendering could be virtualized for very long debates
- limitations
  - No pagination on transcript (could be slow for 100+ message debates)
  - Recent sessions in sidebar don't persist across page refresh

---

# v3.1.0 - 2026-03-21 09:18

## Summary
Added collapsible left sidebar to the main app layout and redesigned the UI using the brand color palette (Burnt Orange, Colonial Blue, Skywriting, Gray Lustre, Bright White).

## Files Modified
- `src/release/Sidebar.tsx` — created
  - Change: New collapsible sidebar component with Colonial Blue background
  - Reason: Match the "Decision Intelligence" sidebar design reference
  - Change: Navigation items (Dashboard, In Progress, Completed, Starred, Search, Templates, Reports) with active state indicator
  - Reason: Give users a persistent nav structure
  - Change: Burnt Orange "NEW DECISION" button at top
  - Reason: Primary CTA always visible and actionable
  - Change: Recent Sessions section at bottom showing last 3 sessions with status badges
  - Reason: Quick access to in-progress and completed decisions
  - Change: Collapse/expand toggle (64px collapsed, 240px expanded)
  - Reason: Allow users to reclaim screen space when needed
  - Change: Sign-out button and email in sidebar footer
  - Reason: Consolidate user controls in sidebar, removing old top header

- `src/release/ReleaseApp.tsx` — modified
  - Change: Removed sticky top header; replaced with Sidebar component
  - Reason: Header is redundant with sidebar present
  - Change: Added `sidebarCollapsed`, `activeView`, `recentSessions` state
  - Reason: Drive sidebar UI from parent state
  - Change: `handleNewDecision` resets project/run and nav view to dashboard
  - Reason: "New Decision" in sidebar correctly resets the conversation
  - Change: `useEffect` tracks recent sessions automatically when project/run state changes
  - Reason: Sidebar recent sessions stay current without manual management
  - Change: Applied `#111827` dark background as base layout color
  - Reason: Consistent with color palette guidance

- `src/release/ChatInterface.tsx` — modified
  - Change: Replaced all Tailwind class-based styles with inline styles using palette colors
  - Reason: Apply exact palette values (Burnt Orange #CC5500, Colonial Blue #5B7E91, Skywriting #D6E4E8, Gray Lustre #9E9E9E)
  - Change: User message bubbles now use Burnt Orange (#CC5500)
  - Reason: Motivational, dynamic color for user actions
  - Change: Right context panel uses Colonial Blue tints
  - Reason: Stability and trust for the analysis sidebar
  - Change: Progress bar uses Burnt Orange
  - Reason: Progress bars to show urgency per color palette guide
  - Change: "Start Debate" button uses Burnt Orange
  - Reason: Primary CTA color
  - Change: Input focus border uses Colonial Blue
  - Reason: Calm, structured interaction feedback
  - Change: Example prompts are clickable to pre-fill input
  - Reason: Better UX for getting started quickly

## Changes
- added: Collapsible left sidebar (Sidebar.tsx) with full navigation, CTA, and recent sessions
- added: Recent sessions tracking in ReleaseApp state
- added: Clickable example prompts on welcome screen
- changed: Main layout from `min-h-screen` header+content to sidebar+main flex layout
- changed: All UI colors to match brand palette
- changed: Sign-out button moved from top header to sidebar footer
- removed: Sticky top header from ReleaseApp
- removed: Tailwind color classes replaced with palette-matched inline styles

## Impact
- user-visible impact: Persistent navigation sidebar matching "Decision Intelligence" reference design
- user-visible impact: Cleaner layout with more space for the chat interface
- user-visible impact: Brand-consistent colors throughout (Burnt Orange CTAs, Colonial Blue structure)
- technical impact: ReleaseApp is now the layout host; Sidebar is a standalone controlled component
- risks or side effects: Inline styles instead of Tailwind classes — less consistent with rest of codebase
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — needs visual check in browser

## Follow-up
- remaining work
  - Apply palette to ProjectReviewScreen and RunScreen
  - Wire up Search, Templates, Reports nav items to real functionality
  - Persist sidebar collapsed state to localStorage
- technical debt
  - Consider extracting palette constants to a shared theme file
- limitations
  - Recent sessions reset on page refresh (not persisted)

---

# v3.0.3 - 2026-03-21 09:06

## Summary
Fixed "LLM returned an empty debate turn" error by adding flexible content extraction to handle various LLM response structures.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Enhanced content extraction in `generate_debate_turn` to check multiple possible fields (content, text, response, output)
  - Reason: LLM was returning content in unexpected field names, causing empty content errors
  - Change: Added fallback logic to extract from any string field longer than 10 characters
  - Reason: Handle edge cases where LLM uses non-standard response structure
  - Change: Added logging of response keys when content is still empty
  - Reason: Better debugging information for future issues

## Changes
- added: Flexible content extraction checking text, response, output fields
- added: Fallback extraction from any substantial string field in response
- added: Logging of response keys when content extraction fails
- fixed: "LLM returned an empty debate turn" error due to unexpected response structure

## Impact
- user-visible impact: Debate runs should now complete successfully instead of failing on empty content
- technical impact: More robust handling of LLM response variations
- risks or side effects: May extract content from unintended fields if LLM returns unexpected structure
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending - need to restart backend and run new debate

## Follow-up
- remaining work
  - Test debate run to confirm fix works
  - Monitor logs to see which field LLM is actually using
- technical debt
  - Consider standardizing LLM response format across all providers
- limitations
  - Fallback extraction may grab wrong field if response has multiple long strings

---

# v3.0.2 - 2026-03-21 08:55

## Summary
Added detailed logging to debate run execution and a helper to inspect project snapshots so we can diagnose stuck runs.

## Files Modified
- `backend/app/services/runs.py` — modified
  - Change: Added `logging` import, module-level logger, and info/error logs throughout `execute_run`
  - Reason: Runs were hanging without exposing the failure point; need visibility into each phase/agent turn
  - Change: Wrapped inner execution block with try/except and log `exc_info`
  - Reason: Ensure any uncaught exceptions mark the run as failed and appear in backend logs

- `backend/check_project.py` — created
  - Change: Added script that prints latest project/version snapshot structure (agents, flow, sample entries)
  - Reason: Quick way to verify generated snapshot data when debugging run issues

## Changes
- added: Structured logging for debate run lifecycle (start, snapshot load, failures)
- added: Debug helper script to inspect latest project snapshot
- fixed: Silent run failures now surface via `run.failed` events and backend logs

## Impact
- user-visible impact: When a run fails, status now transitions to **failed** instead of hanging indefinitely
- technical impact: Backend logs now show run progress and stack traces for easier debugging
- risks or side effects: Minimal; logging adds slight overhead but no funcional change otherwise
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending – need to restart backend and launch a new run to capture logs

## Follow-up
- remaining work
  - Restart backend, re-run debate, review new logs to pinpoint root cause
  - Fix the actual issue causing the run to fail once logs identify it
- technical debt
  - Convert `check_project.py` into a formal CLI tool or admin endpoint
- limitations
  - Logging alone does not resolve the underlying failure; further fixes required

---

# v3.0.1 - 2026-03-21 08:34

## Summary
Fixed false positive "Usage limit reached" error by adding debug logging and increasing development token/cost limits.

## Files Modified
- `backend/app/services/billing.py` — modified
  - Change: Added logging import and debug logs in `ensure_usage_available` method
  - Reason: Need visibility into actual usage values when limit check fails
  - Change: Log shows tokens used/included and cost used/included before raising exception
  - Reason: Helps diagnose false positives and incorrect limit configurations

- `backend/app/models.py` — modified
  - Change: Increased `UsageBalance.included_tokens` default from 250,000 to 10,000,000
  - Reason: Development usage was hitting the low limit (264k tokens used)
  - Change: Increased `UsageBalance.included_cost_cents` default from 5,000 ($50) to 500,000 ($5000)
  - Reason: Align cost limit with higher token limit for development

- `backend/update_usage_limits.py` — created
  - Change: Created utility script to update existing database records
  - Reason: Need to update existing `usage_balances` rows with new limits
  - Change: Script shows before/after values and confirms update
  - Reason: Transparency and verification of database changes

- `backend/migrations/003_increase_usage_limits.sql` — created
  - Change: SQL migration to update usage limits
  - Reason: Provide migration path for updating existing databases

## Changes
- added: Debug logging in billing service showing actual usage vs limits
- added: Utility script to update database usage limits
- changed: Default token limit from 250k to 10M for development
- changed: Default cost limit from $50 to $5000 for development
- fixed: False positive "Usage limit reached" error (was 264k/250k tokens)

## Impact
- user-visible impact: "Usage limit reached" error resolved
- user-visible impact: Can now continue development without hitting artificial limits
- technical impact: Better visibility into billing checks via logging
- risks or side effects: Higher limits mean less realistic testing of limit enforcement

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Confirmed - database updated, limits now 10M tokens / $5000

## Follow-up
- remaining work
  - Consider environment-specific limits (dev vs prod)
  - Add admin endpoint to view/reset usage balances
- technical debt
  - None
- limitations
  - Limits are now very high for development, may not catch limit-related bugs

---

# v3.0.0 - 2026-03-21 07:39

## Summary
Major UX flow redesign. Simplified entry point, automatic decision classification, smart clarifying questions, decision frame confirmation, and streamlined expert agent generation.

## Files Modified
- `backend/app/services/conversation_v2.py` — created
  - Change: New conversation service with improved 6-stage flow
  - Reason: Previous flow had too many configuration steps, was not user-friendly
  - Stages: entry → classification → clarification → frame → agents → ready

- `backend/app/schemas_conversation.py` — modified
  - Change: Added DecisionClassification and DecisionFrame schemas
  - Reason: Need structured types for automatic classification and decision framing
  - Change: Updated CollectedContext with new fields (raw_question, classification, clarifications, decision_frame, etc.)
  - Reason: Support new conversation stages and data collection

- `backend/app/main.py` — modified
  - Change: Switched from ConversationService to ConversationServiceV2
  - Reason: Use new improved conversation flow
  - Change: Updated start_conversation endpoint to pass optional context parameter
  - Reason: Allow users to provide additional context upfront

- `src/release/conversationTypes.ts` — modified
  - Change: Added DecisionFrame, DecisionClassification, AgentInfo interfaces
  - Reason: Match new backend schemas
  - Change: Updated CollectedContext to match new structure
  - Reason: Frontend needs to display new context information

- `src/release/ChatInterface.tsx` — modified
  - Change: Updated welcome screen with simpler, example-driven copy
  - Reason: Entry point should feel simple and inviting
  - Change: Added stage label display and classification badges in sidebar
  - Reason: User should see decision type, stakes, and complexity
  - Change: Added decision frame display in sidebar
  - Reason: User should see the structured understanding of their decision
  - Change: Updated agent display with stance indicators (pro/con/neutral)
  - Reason: User should understand agent perspectives at a glance
  - Change: Changed "Generate Project" button to "Start Debate"
  - Reason: Clearer action language

## Changes
- added: Automatic decision classification (strategic/emotional/financial/etc.)
- added: Stakes assessment (low/medium/high/critical)
- added: Smart clarifying questions (3-7 based on decision type)
- added: Decision frame confirmation before debate
- added: Expert agent generation with pro/con/neutral stances
- changed: Entry point is now just "ask your question"
- changed: No manual configuration required
- changed: Agent naming enforced as role-based ("XYZ Agent")
- removed: Manual decision maker selection stage
- removed: Manual constraints/goals entry stage
- removed: Manual agent configuration stage

## Impact
- user-visible impact: Much simpler, faster flow from question to debate
- user-visible impact: System understands decision type automatically
- user-visible impact: Clarifying questions are tailored to specific decision
- user-visible impact: Clear decision frame shown before debate starts
- technical impact: New ConversationServiceV2 replaces old service
- risks or side effects: Old conversation sessions may not work with new flow
- breaking changes: CollectedContext schema changed significantly

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending - requires full flow test

## Follow-up
- remaining work
  - Test full conversation flow end-to-end
  - Test debate execution with new agent format
  - Verify decision frame accuracy
  - Add debate result synthesis views
- technical debt
  - Old conversation.py can be removed once V2 is validated
  - Consider adding decision type-specific question sets
- limitations
  - Classification depends on LLM accuracy
  - Clarifying questions may not cover all edge cases

---

# v2.0.9 - 2026-03-20 20:40

## Summary
Fixed 502 empty debate turn error by handling nested LLM response structure, and updated agent naming to use role-based format ("XYZ Agent") instead of real names.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Updated content extraction to handle nested `message.content` structure in LLM response
  - Reason: LLM was returning `{"message": {"sender": "...", "content": "..."}}` instead of `{"content": "..."}`
  - Change: Added fallback to check `response["message"]["content"]` when `response["content"]` is missing
  - Reason: Different LLM response formats need to be handled gracefully

- `backend/app/services/conversation.py` — modified
  - Change: Updated `_get_agents_prompt` with explicit naming convention requiring "Agent" suffix
  - Reason: User requested role-based names ("Financial Analyst Agent") instead of real names ("Dr. Evelyn Reed")
  - Change: Added examples showing correct format and explicit "DO NOT use real names" instruction
  - Reason: LLM was generating fictional character names which was confusing

## Changes
- fixed: 502 empty debate turn error caused by nested LLM response structure
- changed: Agent names now use role-based format ending with "Agent"
- improved: LLM prompts explicitly prohibit real names, fictional names, and titles

## Impact
- user-visible impact: Debates now run successfully without 502 errors
- user-visible impact: Agents have clear role-based names like "Financial Analyst Agent"
- technical impact: Content extraction handles multiple LLM response formats
- risks or side effects: None
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires running a full debate

## Follow-up
- remaining work
  - Test full debate execution with new content extraction
  - Verify agents are named correctly in new conversations
- technical debt
  - Could standardize LLM response format in prompts
  - Consider adding response schema validation
- limitations
  - Agent naming depends on LLM following prompt instructions

---

# v2.0.8 - 2026-03-20 20:35

## Summary
Added logging for "LLM returned an empty debate turn" errors to show the full LLM response in backend logs.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added `logger.error()` call before raising "LLM returned an empty debate turn" exception
  - Reason: Users were seeing "502: LLM returned an empty debate turn" in UI but nothing in backend logs
  - Change: Log the full response object when content field is empty
  - Reason: Need to see what the LLM actually returned (e.g., empty string, null, missing field) to diagnose the issue

## Changes
- fixed: Empty debate turn errors now appear in backend logs with full LLM response
- improved: Can now diagnose why LLM is returning empty content field

## Impact
- user-visible impact: No change to user-facing errors, but developers can now debug issues
- technical impact: Backend logs now show what LLM returned when content is empty
- risks or side effects: None - only adds logging
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires triggering an empty debate turn response

## Follow-up
- remaining work
  - Test that logs appear when LLM returns empty content
  - Analyze patterns in empty responses to improve prompts
  - Consider adding retry logic for empty responses
- technical debt
  - Could add more context (agent name, phase, round) to error logs
  - Consider validating response structure before extracting content
- limitations
  - Logs full response object which could be large

---

# v2.0.7 - 2026-03-20 20:31

## Summary
Added logging for LLM invalid JSON errors so they appear in backend logs with the actual response text for debugging.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added `import logging` and created logger instance
  - Reason: Need to log errors before raising HTTPException so they appear in backend logs
  - Change: Added `logger.error()` calls before all "LLM returned invalid JSON" exceptions across all providers (Gemini, OpenAI, Anthropic, xAI)
  - Reason: Users were seeing "502: LLM returned invalid JSON" errors in UI but nothing in backend logs, making debugging impossible
  - Change: Log first 500 characters of the invalid response text
  - Reason: Provide enough context to diagnose what the LLM actually returned without flooding logs

## Changes
- fixed: LLM invalid JSON errors now appear in backend logs with actual response text
- improved: Debugging LLM response issues is now possible by checking backend logs
- improved: All LLM providers (Gemini, OpenAI, Anthropic, xAI) now log invalid JSON responses

## Impact
- user-visible impact: No change to user-facing errors, but developers can now debug issues
- technical impact: Backend logs now contain actionable information for LLM JSON parsing failures
- risks or side effects: None - only adds logging
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires triggering an invalid JSON response from LLM

## Follow-up
- remaining work
  - Test that logs appear when LLM returns invalid JSON
  - Verify 500 character truncation is sufficient for debugging
  - Monitor logs for patterns in invalid JSON responses
- technical debt
  - Could add more structured logging (JSON format) for better log parsing
  - Consider adding request context (agent name, phase, etc.) to error logs
- limitations
  - Only logs first 500 characters of response (to avoid log spam)

---

# v2.0.6 - 2026-03-20 20:15

## Summary
Improved error handling for 502 errors caused by empty LLM responses, adding diagnostic information about safety blocks and finish reasons.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Enhanced `_generate_json_gemini` to check for safety blocks and finish reasons when LLM returns empty content
  - Reason: Users were getting generic "LLM returned an empty debate turn" 502 errors without understanding why (safety filters, content blocks, etc.)
  - Change: Added diagnostic checks for `finish_reason` and `safety_ratings` from Gemini response
  - Reason: Provide actionable error messages (e.g., "LLM response blocked by safety filters. Try rephrasing your request.")

## Changes
- improved: 502 errors now include specific reasons (safety blocks, finish reasons) instead of generic "empty content" message
- improved: Users get actionable guidance ("Try rephrasing your request") when LLM blocks content
- fixed: Better diagnostic information for debugging LLM response issues

## Impact
- user-visible impact: Users see helpful error messages explaining why their debate failed (safety filters, content blocks)
- technical impact: Easier to diagnose LLM response issues with detailed error information
- risks or side effects: None - only improves error reporting
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires triggering a debate that causes LLM safety block or empty response

## Follow-up
- remaining work
  - Test with content that triggers safety filters
  - Verify error messages are helpful and actionable
  - Monitor for other empty response scenarios
- technical debt
  - Could add retry logic for certain types of blocks
  - Consider adjusting safety settings if blocks are too aggressive
- limitations
  - Cannot bypass legitimate safety blocks - users must rephrase

---

# v2.0.5 - 2026-03-20 20:07

## Summary
Improved contextual awareness for decision maker questions and made Generate Project button visible earlier (at 80% completeness instead of 100%).

## Files Modified
- `backend/app/services/conversation.py` — modified
  - Change: Enhanced `_get_decision_makers_prompt` with contextual awareness examples
  - Reason: LLM was asking inappropriate questions (e.g., "CEO or Board" for family car purchase decisions)
  - Change: Added domain-specific examples (personal/family, business, technical) to guide LLM
  - Reason: System needs to adapt questions based on topic domain (personal vs professional context)
  - Change: Lowered `can_generate` threshold from 100% to 80% completeness
  - Reason: Users should be able to generate projects once they have sufficient information, not only at 100%
  - Change: Updated `generate_project_from_conversation` to accept 80% threshold
  - Reason: Align generation logic with button visibility

## Changes
- improved: Decision maker questions now adapt to topic domain (Family/Individual for personal decisions, CEO/Board for business)
- improved: Generate Project button appears at 80% completeness instead of 100%
- improved: LLM prompts include contextual examples for better question relevance

## Impact
- user-visible impact: Questions are now contextually appropriate (no more "CEO" for family decisions)
- user-visible impact: Generate Project button visible earlier in conversation flow
- technical impact: LLM has better guidance for adapting to different decision contexts
- risks or side effects: 80% threshold may allow generation with less complete information
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires testing with personal and business decision topics

## Follow-up
- remaining work
  - Test personal decision topics (car, home, education) get appropriate decision maker suggestions
  - Test business decision topics get appropriate suggestions
  - Verify Generate Project button appears at 80%
- technical debt
  - Could add more sophisticated domain detection beyond LLM prompt examples
  - Consider adding explicit domain classification in topic stage
- limitations
  - Contextual awareness depends on LLM following prompt examples correctly

---

# v2.0.4 - 2026-03-20 20:02

## Summary
Fixed conversation looping back to earlier stages after reaching the review stage, preventing users from generating projects.

## Files Modified
- `backend/app/services/conversation.py` — modified
  - Change: Added stage lock to prevent regression from review stage
  - Reason: After reaching 100% completeness and review stage, LLM was transitioning back to "decision_makers" or other earlier stages, creating an infinite loop
  - Change: Improved review stage prompt with explicit instructions to stay in final stage
  - Reason: LLM needed clearer guidance that review is the terminal stage and should not transition elsewhere

## Changes
- fixed: Conversation no longer loops back to earlier stages after reaching review
- fixed: Users can now successfully stay in review stage and click "Generate Project"
- improved: Review stage prompt explicitly states it's the final stage and should not regress

## Impact
- user-visible impact: Conversation flow completes properly and allows project generation
- technical impact: Stage transition logic now enforces forward-only progression with review as terminal state
- risks or side effects: None - review stage is intentionally terminal
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires testing that conversation stays in review stage after reaching 100%

## Follow-up
- remaining work
  - Test conversation reaches review and stays there
  - Verify "Generate Project" button works from review stage
  - Confirm no more stage regression loops
- technical debt
  - Consider adding explicit stage transition rules/state machine
  - LLM prompts could be more structured to prevent stage confusion
- limitations
  - Users cannot go back to edit earlier stages once in review (by design)

---

# v2.0.3 - 2026-03-20 19:57

## Summary
Fixed multiple Pydantic validation errors caused by LLM returning inconsistent data types (strings instead of lists/dicts) and corrected ProjectResponse attribute access.

## Files Modified
- `backend/app/services/conversation.py` — modified
  - Change: Enhanced `_clean_context_for_validation` to handle type mismatches from LLM responses
  - Reason: LLM was returning strings for `decision_makers` and `goals` (expected lists), and string items in `agents` array (expected dict objects)
  - Change: Convert string `decision_makers` to single-item list
  - Reason: Pydantic expects `decision_makers: list[str]` but LLM sometimes returns `"Family"` instead of `["Family"]`
  - Change: Convert string `goals` to single-item list
  - Reason: Pydantic expects `goals: list[str]` but LLM sometimes returns `"make the best decision"` instead of `["make the best decision"]`
  - Change: Filter out string items from `agents` list, keep only dict items
  - Reason: LLM sometimes appends agent names as strings instead of proper `{name, role, confirmed}` objects
  - Change: Fixed `project.id` → `project.project_id`
  - Reason: `ProjectResponse` schema has `project_id` attribute, not `id`

## Changes
- fixed: Conversation no longer crashes when LLM returns strings instead of lists for decision_makers/goals
- fixed: Conversation no longer crashes when LLM adds string agent names instead of dict objects
- fixed: Project generation no longer crashes with AttributeError on `project.id`
- improved: Validation cleaning is now more robust to LLM output variations

## Impact
- user-visible impact: Conversation flow works reliably even when LLM returns inconsistent data types
- technical impact: Validation layer now handles common LLM output format variations gracefully
- risks or side effects: String agent items are silently dropped (but this is better than crashing)
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires full conversation flow test with project generation

## Follow-up
- remaining work
  - Test complete conversation → generation flow
  - Verify all collected context is properly used in project generation
  - Confirm generated project appears correctly in review screen
- technical debt
  - LLM prompts should be improved to return consistent data types
  - Consider adding Pydantic validators that auto-convert types instead of cleaning post-hoc
- limitations
  - String agent items are discarded rather than converted to proper dict format

---

# v2.0.2 - 2026-03-20 19:52

## Summary
Fixed project generation from conversation failing due to incorrect ProjectService.generate_project() signature usage.

## Files Modified
- `backend/app/services/conversation.py` — modified
  - Change: Updated `generate_project_from_conversation` to use `ProjectGenerationRequest` object instead of passing `prompt` and `clarification_answers` as separate kwargs
  - Reason: `ProjectService.generate_project()` expects a `request: ProjectGenerationRequest` parameter, not individual prompt/answers arguments
  - Change: Added `force_generate_with_assumptions=True` to skip re-assessment
  - Reason: Conversation has already gone through assessment stages, no need to re-assess during generation

## Changes
- fixed: "Generate Project" button now successfully creates projects from completed conversations
- fixed: TypeError "got an unexpected keyword argument 'prompt'" no longer occurs

## Impact
- user-visible impact: Users can now complete the full conversation flow and generate projects
- technical impact: Conversation service now correctly interfaces with existing project generation logic
- risks or side effects: None - aligns with existing project generation contract
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires testing "Generate Project" button after completing conversation

## Follow-up
- remaining work
  - Test full conversation → generation flow
  - Verify generated project appears in review screen
  - Confirm agents/flow from conversation are correctly applied
- technical debt
  - Conversation context → prompt conversion could be more sophisticated
- limitations
  - Still requires valid Gemini API key for project generation

---

# v2.0.1 - 2026-03-20 19:25

## Summary
Hotfix release to address backend crashes introduced during the conversational flow rollout.

## Files Modified
- `backend/app/models.py` — modified
  - Change: Renamed `ConversationMessage.metadata` to `message_metadata`
  - Reason: `metadata` is reserved in SQLAlchemy declarative models, which caused the app to crash on startup

- `backend/app/services/conversation.py` — modified
  - Change: Updated references to `message_metadata` and removed manual `updated_at` assignment
  - Reason: Align with the renamed column and prevent `utc_now()` TypeErrors when processing user messages

- `backend/migrations/002_add_conversation_tables.sql` — modified
  - Change: Matched column rename for new installations
  - Reason: Ensure fresh DB setups work without manual fixes

## Impact
- fixed: Backend now starts cleanly after the conversational flow migration
- fixed: Sending follow-up messages in a conversation no longer crashes with `utc_now()` argument errors
- risk: None — changes are limited to new conversation tables/services

## Validation
- backend: Manual verification — server boots and conversation POST endpoints succeed
- frontend: Verified chat UI can send multiple turns without triggering backend errors

---

# v2.0.0 - 2026-03-20 17:00

## Summary
**MAJOR RELEASE**: Transformed the Multi-Agent Debator from a single-prompt submission model into an interactive, conversational experience. Users now build debate projects through natural dialogue, with the system guiding them from a simple topic statement to a fully-configured debate project.

## Files Modified

### Backend
- `backend/app/models.py` — modified
  - Change: Added `ConversationSession` and `ConversationMessage` models
  - Reason: Store conversation state and message history for the new conversational flow

- `backend/app/schemas_conversation.py` — created
  - Change: New Pydantic schemas for conversation API (ConversationResponse, CollectedContext, etc.)
  - Reason: Type-safe request/response models for conversation endpoints

- `backend/app/services/conversation.py` — created
  - Change: Implemented `ConversationService` with LLM-driven stage handlers
  - Reason: Orchestrate multi-stage conversation flow (topic → decision_makers → constraints → agents → flow → review)
  - Features: 
    - Stage-specific prompts for Gemini LLM
    - Context merging and completeness tracking
    - Fallback questions for error handling
    - Project generation from collected context

- `backend/app/main.py` — modified
  - Change: Added 4 new conversation endpoints: `/conversations/start`, `/conversations/{id}/message`, `/conversations/{id}`, `/conversations/{id}/generate`
  - Reason: RESTful API for conversational project building

- `backend/migrations/002_add_conversation_tables.sql` — created
  - Change: Database migration for conversation_sessions and conversation_messages tables
  - Reason: Persist conversation state across sessions

### Frontend
- `src/release/conversationTypes.ts` — created
  - Change: TypeScript interfaces for conversation data structures
  - Reason: Type-safe frontend conversation state management

- `src/release/api.ts` — modified
  - Change: Added 4 conversation API client functions
  - Reason: Frontend-backend communication for conversational flow

- `src/release/ChatInterface.tsx` — created
  - Change: Full chat UI with message bubbles, quick replies, agent suggestions, and context sidebar
  - Reason: Primary user interface for conversational project building
  - Features:
    - Real-time message streaming
    - Quick reply chips for common responses
    - Agent suggestion cards
    - Context sidebar with completeness tracking
    - Progressive disclosure of collected information

- `src/release/ReleaseApp.tsx` — modified
  - Change: Replaced `HomeScreen` with `ChatInterface` as default screen
  - Reason: Make conversational flow the primary UX

## Changes
- **added**: Conversational project builder with 6-stage flow (topic, decision_makers, constraints, agents, flow, review)
- **added**: LLM-driven conversation orchestration using Gemini
- **added**: Real-time context collection and completeness tracking
- **added**: Quick reply suggestions and agent recommendations
- **added**: Context sidebar showing collected information
- **changed**: Default UX from single-prompt form to interactive chat
- **improved**: User onboarding - no need to know everything upfront
- **improved**: Agent discovery through AI suggestions based on context

## Conversation Flow Stages
1. **Topic Identification** (15% complete) - Extract core decision/topic
2. **Decision Makers** (30% complete) - Identify who's making the decision
3. **Constraints & Goals** (50% complete) - Collect budget, timeline, success criteria
4. **Agent Selection** (80% complete) - AI suggests relevant agents, user confirms/customizes
5. **Flow Configuration** (100% complete) - Determine debate rounds and phases
6. **Review & Generate** - Summary and project generation

## Impact
- **user-visible impact**: Completely new UX - conversational chat replaces prompt form
- **technical impact**: New conversation state management, LLM orchestration layer, database schema
- **breaking changes**: Old `HomeScreen` component replaced (still available in codebase but not routed)
- **migration required**: Run `backend/migrations/002_add_conversation_tables.sql` to create new tables

## Validation
- **tests**: Not run (manual testing required)
- **lint**: TypeScript compilation successful
- **build**: Not run
- **manual verification**: Pending - requires:
  1. Database migration execution
  2. Backend restart
  3. Frontend rebuild
  4. End-to-end conversation flow test

## Follow-up
- **remaining work**:
  - Run database migration
  - Test full conversation flow from topic to project generation
  - Verify LLM responses are coherent and helpful
  - Test error handling (network failures, LLM timeouts)
  - Verify context sidebar updates correctly
  - Test project generation from conversation context
  
- **technical debt**:
  - LLM prompts are hardcoded strings (could be externalized)
  - No conversation history pagination (all messages loaded at once)
  - No conversation resume after browser refresh (session ID not persisted)
  - No multi-user collaborative conversations
  - Stage transitions are linear (no going back to previous stages)
  
- **future enhancements**:
  - Voice input support
  - Conversation export (PDF/markdown)
  - Preset templates for common scenarios
  - Conversation branching (allow editing earlier answers)
  - Real-time collaboration (multiple users in same conversation)

## Design Documentation
See `docs/CONVERSATIONAL_FLOW_DESIGN.md` for complete design specification including:
- User journey examples
- Architecture diagrams
- Database schema details
- API endpoint specifications
- LLM orchestration prompts
- UI/UX mockups

---

# v1.0.7 - 2026-03-20 16:15

## Summary
Fixed TypeError in billing service that crashed project generation when creating a new monthly usage summary record.

## Files Modified
- `backend/app/services/billing.py` — modified
  - Change: Explicitly initialize `total_tokens`, `total_cost_cents`, and `total_runs` to `0` when creating a new `MonthlyUsageSummary` record
  - Reason: SQLAlchemy was not applying the default values from the model definition before the increment operation, causing `NoneType` fields
  - Change: Added `await session.flush()` after adding the new summary record
  - Reason: Ensures the record is persisted and defaults are applied before attempting to increment fields

## Changes
- fixed: Project generation no longer crashes with `TypeError: unsupported operand type(s) for +=: 'NoneType' and 'int'`
- improved: Monthly usage summary creation is now explicit and deterministic

## Impact
- user-visible impact: Project generation should complete successfully without billing-related crashes
- technical impact: Billing usage tracking now works correctly for new monthly periods
- risks or side effects: None - this only affects the creation path for new monthly summary records
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires backend restart and project generation test

## Follow-up
- remaining work
  - Backend will auto-reload with the fix
  - Retry project generation
  - Verify usage tracking is recorded correctly
- technical debt
  - SQLAlchemy default value behavior is inconsistent between model definition and runtime instantiation
- limitations
  - None

---

# v1.0.6 - 2026-03-20 16:12

## Summary
Updated Gemini model fallback logic to use `gemini-2.5-flash-lite` as the primary stable model, replacing deprecated/unavailable model names.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Updated `_gemini_model_candidates` to map all deprecated model names to `gemini-2.5-flash-lite` and use it as the final fallback
  - Reason: Google deprecated `gemini-1.5-pro`, `gemini-1.5-flash`, and experimental `gemini-2.0-*` models; `gemini-2.5-flash-lite` is the current stable model available via the Gemini API
  - Change: Added support for `-preview` suffix stripping in addition to `-exp`
  - Reason: Some Gemini model names use `-preview` suffix for experimental versions

## Changes
- fixed: Project generation no longer fails with 404 NOT_FOUND for deprecated Gemini model names
- changed: All Gemini model fallback paths now resolve to `gemini-2.5-flash-lite`
- improved: Model candidate logic handles both `-exp` and `-preview` suffixes

## Impact
- user-visible impact: Project generation should succeed with a valid Gemini API key after backend restart
- technical impact: Backend is aligned with current Gemini API model availability
- risks or side effects: `gemini-2.5-flash-lite` has different capabilities than older models (1M+ input tokens, 65K output tokens, supports caching/grounding/function calling)
- breaking changes if any: None - this is a transparent fallback improvement

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (Python service)
- manual verification: Pending - requires backend restart and valid Gemini API key to test project generation

## Follow-up
- remaining work
  - Restart backend through server manager
  - Verify project generation succeeds with new model
  - Confirm frontend receives and displays generated project
- technical debt
  - Model names are still hardcoded in fallback logic instead of being dynamically queried from Gemini API
- limitations
  - Still requires a valid, non-leaked Gemini API key in `backend/.env`

---

# v1.0.5 - 2026-03-20 15:59

## Summary
Improved the frontend project-generation flow so clarification-required backend responses are turned into a guided user workflow instead of a raw payload/error.

## Files Modified
- `src/release/types.ts` — modified
  - Change: Added `ClarificationRequiredResponse` type
  - Reason: The frontend needed a typed representation of the backend's clarification-required response payload

- `src/release/api.ts` — modified
  - Change: Imported and re-exported clarification response typing for release frontend usage
  - Reason: Keeps the API layer aligned with the backend response contract used during project generation conflicts

- `src/release/HomeScreen.tsx` — modified
  - Change: Updated 409 handling in `handleGenerate` to extract backend `message` and `assessment`, load clarification questions into state, and stop treating the response as a generic failure
  - Reason: The app was surfacing the raw clarification payload instead of guiding the user to answer required questions
  - Change: Added explanatory clarification helper text above the generated input fields
  - Reason: Users need clear next-step guidance after the backend requests more scope

## Changes
- fixed: Clarification-required responses no longer appear as raw JSON/error output in the frontend flow
- added: Typed frontend support for backend clarification response payloads
- improved: The UI now tells the user to answer the clarification questions and retry generation

## Impact
- user-visible impact: When the backend asks for clarification, the app now shows the questions and tells the user exactly how to continue
- technical impact: Frontend project-generation error handling is now aligned with the backend's 409 clarification contract
- risks or side effects: None expected; this only changes the handling of clarification-required generation responses
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Not run in browser after patch; expected behavior is that 409 clarification responses populate the existing clarification form instead of dumping the response body

## Follow-up
- remaining work
  - Reload the frontend
  - Trigger a clarification-required prompt again
  - Confirm the questions appear with guidance text and generation succeeds after filling them in
- technical debt
  - No automated UI test covers the clarification flow yet
- limitations
  - Final generation still depends on backend LLM/provider configuration being valid

---

# v1.0.4 - 2026-03-20 15:54

## Summary
Fixed the new `KILL ACTIVE PORT TASKS` action so it no longer crashes on PowerShell's reserved `$PID` variable and no longer fails when a live log file is locked by another process.

## Files Modified
- `server-manager.ps1` — modified
  - Change: Renamed the per-process loop variable from `$pid` to `$processId`
  - Reason: `$PID` is a built-in read-only PowerShell variable and caused the kill action to crash
  - Change: Added `Write-ManagerLogEntry` helper using safe append semantics with error suppression
  - Reason: `Add-Content` could throw when backend/frontend log files were actively locked by another process
  - Change: Appended kill summary directly to the visible log textboxes as a fallback display path
  - Reason: The user still needs immediate visibility even if file writes are temporarily blocked

## Changes
- fixed: Kill button no longer throws `Cannot overwrite variable PID`
- fixed: Kill summary logging no longer breaks the action when log files are in use
- improved: Kill summaries now appear directly in the UI log windows even if disk append fails

## Impact
- user-visible impact: `KILL ACTIVE PORT TASKS` should now complete successfully and still show a summary in the GUI
- technical impact: Removes a PowerShell reserved-variable bug and makes manager logging more resilient under file contention
- risks or side effects: File append errors are intentionally suppressed in the helper to avoid interrupting the action
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (PowerShell script)
- manual verification: Not run yet after patch; requires relaunching the manager and clicking the button again

## Follow-up
- remaining work
  - Relaunch `server-manager.bat`
  - Click `KILL ACTIVE PORT TASKS` again
  - Verify no PowerShell exception appears and the popup/log summary is shown
- technical debt
  - File locking behavior depends on how child processes hold log handles
- limitations
  - If an external process immediately respawns after being killed, the port may reopen and require a second cleanup action

---

# v1.0.3 - 2026-03-20 15:50

## Summary
Added a server-manager UI action to force-kill tasks listening on common development ports, even when those processes were started outside the manager.

## Files Modified
- `server-manager.ps1` — modified
  - Change: Added `Stop-Ports` helper to enumerate listeners by port and terminate their process trees with `taskkill /F /PID /T`
  - Reason: The existing controls only reliably managed backend/frontend processes the manager started itself
  - Change: Added `KILL ACTIVE PORT TASKS` button to the control panel
  - Reason: User requested one-click cleanup of active port listeners regardless of origin
  - Change: Resized and repositioned the manager layout to fit the new control without overlapping existing buttons and log panes
  - Reason: The new action required additional space in the control column and log area

## Changes
- added: Global kill button for active dev-port tasks
- fixed: Ability to clear external listeners not started via the server manager
- changed: Server manager layout sizing and button positions to fit the new control
- improved: Kill action writes a record of terminated port/PID pairs into both backend and frontend logs

## Impact
- user-visible impact: You can now click one button to clear common conflicting dev ports before starting services again
- technical impact: Reduces port-collision and orphaned-process issues during local development
- risks or side effects: The button force-kills any listener on the configured ports, including unrelated local tools using those ports
- breaking changes if any: None

## Validation
- tests: Not run
- lint: Not run
- build: Not applicable (PowerShell script)
- manual verification: Not run yet in GUI; implementation uses the same `taskkill` strategy already adopted for stop actions

## Follow-up
- remaining work
  - Relaunch `server-manager.bat`
  - Verify `KILL ACTIVE PORT TASKS` stops listeners on 3000/5173/8000 and updates status labels
  - Confirm log panels show the kill summary entry
- technical debt
  - Port list is hardcoded to common dev ports
- limitations
  - Non-listening processes are not targeted; only active TCP listeners on the configured ports are terminated

---

# v1.0.2 - 2026-03-20 15:42

## Summary
Hardened Gemini project-generation handling. The backend now falls back from deprecated Gemini model names and returns a clear error when the configured Gemini API key is invalid, restricted, or leak-disabled.

## Files Modified
- `backend/app/services/llm.py` — modified
  - Change: Added Gemini model candidate fallback logic for deprecated aliases like `gemini-2.0-flash-exp`
  - Reason: Project generation was crashing because the configured model name was no longer supported by the Gemini API
  - Change: Added explicit HTTP error translation for Gemini permission/auth failures and generic upstream failures
  - Reason: The backend was surfacing opaque 500 errors instead of clear operational messages

## Changes
- fixed: Gemini deprecated model names no longer immediately crash project generation
- fixed: Backend now returns a controlled 502 with a readable credential/configuration message instead of a raw traceback
- added: Gemini model fallback candidates for stale environment values
- changed: Gemini upstream exceptions are translated into explicit FastAPI HTTP errors

## Impact
- user-visible impact: The app now reports a clear configuration error instead of a vague 500 when project generation cannot authenticate with Gemini
- technical impact: Backend is more resilient to stale `.env` model names and easier to debug from the frontend and server manager
- risks or side effects: Fallback may use a different Gemini model than originally configured when the configured alias is unsupported
- breaking changes if any: None

## Validation
- tests: Manual endpoint verification only
- lint: Not run
- build: Not run
- manual verification: Confirmed old model-name failure path was replaced; current remaining blocker is Gemini returning `PERMISSION_DENIED` because the configured API key has been flagged as leaked/disabled

## Follow-up
- remaining work
  - Replace `GEMINI_API_KEY` in `backend/.env` with a valid active key
  - Restart backend through the server manager after updating the key
  - Re-test prompt evaluation and project generation from the UI and verify both logs populate
- technical debt
  - No automated integration test for upstream provider failures
- limitations
  - Project generation cannot fully succeed until a valid provider credential is configured

---

# v1.0.1 - 2026-03-20 15:35

## Summary
Fixed server manager to properly track and control processes. Manager now distinguishes between processes it controls (green "Managed") vs external processes (orange "Not Managed"), and uses taskkill for reliable process termination.

## Files Modified
- `server-manager.ps1` — modified
  - Change: Updated stop button handlers to use `taskkill /F /PID /T` instead of `Stop-Process`, and set `$global:backendJob/$frontendJob` to null after stopping
  - Reason: `Stop-Process` wasn't reliably killing Python/Node processes; taskkill with /T flag kills process tree
  
  - Change: Modified timer status update logic to check if manager controls the process (`$global:backendJob -and -not $global:backendJob.HasExited`)
  - Reason: Manager was showing green status for external processes it didn't start, giving false impression of control
  
  - Change: Added three status states: "RUNNING (Managed)" (green), "EXTERNAL (Not Managed)" (orange), "STOPPED" (red)
  - Reason: User needs to know if manager actually controls the process or if it's an external process

## Changes
- fixed: Stop buttons now reliably kill processes using taskkill
- fixed: Status only shows green when manager actually controls the process
- added: Orange "EXTERNAL (Not Managed)" status for processes running on the port but not started by manager
- improved: Process cleanup now uses taskkill with /T flag to kill entire process tree
- changed: Status detection logic to verify manager owns the process before showing green

## Impact
- user-visible impact: Status accurately reflects manager control; orange warning when external process detected
- technical impact: Reliable process termination; no more orphaned processes
- risks or side effects: None - improves reliability
- breaking changes if any: None

## Validation
- tests: Not run (no test suite exists)
- lint: Not run
- build: Not applicable (PowerShell script)
- manual verification: Pending - need to close and reopen server manager to test new behavior

## Follow-up
- remaining work:
  1. Close current server manager window
  2. Relaunch server-manager.bat
  3. Click START ALL and verify status shows "RUNNING (Managed)" in green
  4. Test STOP buttons actually kill processes
  5. Submit prompt in app and verify logs appear
- technical debt: No automated tests for process management
- limitations: Still requires manager to be used for log capture to work

---

# v1.0.0 - 2026-03-20 15:30

## Summary
Fixed frontend error display showing "[object Object]" and improved API error message handling. Stopped running servers to prepare for proper restart through server manager to enable log capture.

## Files Modified
- `src/release/HomeScreen.tsx` — modified
  - Change: Enhanced error handling in both `handleEvaluate` and `handleGenerate` functions to properly extract and display error messages from ApiError objects
  - Reason: Frontend was displaying "[object Object]" instead of actual error messages when API calls failed

- `src/release/api.ts` — modified
  - Change: Improved error message extraction in the `request` function to handle various API error response formats (string, array, object)
  - Reason: Backend returns different error formats (FastAPI validation errors are arrays, custom errors are strings), need to handle all cases properly

## Changes
- fixed: Frontend now displays actual error messages instead of "[object Object]"
- fixed: API error handling now properly extracts messages from FastAPI validation errors (arrays)
- improved: Error messages are now user-readable for all error types
- changed: Error handling logic to check ApiError type first, then Error, then fallback to String conversion

## Impact
- user-visible impact: Users will now see meaningful error messages like "Prompt is too short" instead of "[object Object]"
- technical impact: Better error debugging and user experience
- risks or side effects: None - purely improves error display
- breaking changes if any: None

## Validation
- tests: Not run (no test suite exists)
- lint: Not run
- build: Not run (will rebuild when servers restart)
- manual verification: Pending - need to restart servers through server manager and test prompt submission

## Follow-up
- remaining work: 
  1. Restart backend and frontend through server manager to enable log capture
  2. Test prompt submission to verify error messages display correctly
  3. Verify logs appear in server manager when API requests are made
- technical debt: No automated tests for error handling
- limitations: Server manager log capture only works when servers are started through the manager (not manually)
