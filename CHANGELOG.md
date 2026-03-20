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
