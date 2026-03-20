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
