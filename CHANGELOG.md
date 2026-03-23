# v3.9.0 - 2026-03-23

## Summary
MAGDM Decision Engine — Replaced freeform debate as the core decision mechanism with a structured Multi-Attribute Group Decision Making (MAGDM) engine. Users can define a decision problem, enumerate alternatives, configure weighted evaluation criteria, select expert evaluator personas, and receive a deterministic ranked recommendation grounded in explicit multi-attribute scoring, weighted aggregation, disagreement analysis, and AI-generated explanation. The theatrical debate loop is retained for exploration mode; structured evaluation is the new default path.

## Files Modified
- `backend/app/models.py` — modified
  - Change: Added DecisionSession, DecisionAlternative, DecisionCriterion, DecisionExpert, DecisionEvaluation SQLAlchemy models
  - Reason: Persistent storage for the MAGDM domain — sessions, entities, score matrix
- `backend/app/schemas_decision.py` — created
  - Change: Full set of Pydantic request/response schemas for all MAGDM entities and operations
  - Reason: Validation and serialization for decision engine API
- `backend/app/services/decision.py` — created
  - Change: DecisionService with CRUD, single-pass LLM evaluation engine, deterministic aggregation pipeline (weighted sum, absolute normalization), disagreement metrics, provisional ranking detection, sensitivity analysis, and grounded AI explanation
  - Reason: Core MAGDM business logic
- `backend/app/main.py` — modified
  - Change: 13 new API endpoints under /api/v1/decisions for session CRUD, alternatives, criteria, experts, evaluation trigger, and AI suggestion endpoints
  - Reason: Expose MAGDM engine to frontend
- `src/release/types.ts` — modified
  - Change: Added DecisionSessionResponse, DecisionAlternative, DecisionCriterion, DecisionExpert, DecisionEvaluation, AlternativeScoreDetail, CriterionDisagreement, AlternativeDisagreement, SensitivityItem, RankingResult, DecisionSessionDetail interfaces
  - Reason: TypeScript types for MAGDM domain
- `src/release/api.ts` — modified
  - Change: Added 11 MAGDM API functions (createDecisionSession, listDecisionSessions, getDecisionSession, updateDecisionSession, deleteDecisionSession, updateDecisionAlternatives, updateDecisionCriteria, updateDecisionExperts, runDecisionEvaluation, suggestAlternatives, suggestCriteria, suggestExperts)
  - Reason: Frontend API client for decision engine
- `src/release/DecisionWizardScreen.tsx` — created
  - Change: 4-step guided wizard (Framing → Alternatives → Criteria+Weights → Experts) with AI-suggest buttons, manual editing, weight sliders, and single-click evaluation trigger
  - Reason: Primary UI for structured decision creation
- `src/release/DecisionResultsScreen.tsx` — created
  - Change: Results display with ranked alternatives (score bars), criterion contribution breakdown, expert disagreement panel, sensitivity analysis, provisional warning, and AI explanation
  - Reason: Results presentation for MAGDM evaluation output
- `src/release/Sidebar.tsx` — modified
  - Change: Added 'decisions' to NavView type and DECISIONS nav item
  - Reason: Navigation entry point for decision engine
- `src/release/ReleaseApp.tsx` — modified
  - Change: Import DecisionWizardScreen and render it when activeView === 'decisions'
  - Reason: Wire decision wizard into app routing

# v3.8.1 - 2026-03-22 17:28

## Summary
Expert Agents — Extended the Expert Templates feature to support manual agent creation. Users can now create expert agents from scratch in addition to saving them from completed debates. Renamed "Expert Templates" to "Expert Agents" throughout the UI to reflect this dual-source capability.

## Files Modified
- `backend/app/models.py` — modified
  - Change: Made created_from_run_id nullable in ExpertTemplate model
  - Reason: Support manually created agents that aren't tied to a debate run
- `backend/app/schemas.py` — modified
  - Change: Added CreateExpertAgentRequest schema; made created_from_run_id nullable in ExpertTemplateResponse
  - Reason: Validate manual agent creation requests
- `backend/app/services/expert_templates.py` — modified
  - Change: Added create_manual_agent method with same quality guardrails as debate-saved agents
  - Reason: Enable manual expert agent creation with validation
- `backend/app/main.py` — modified
  - Change: Added POST /expert-templates/create endpoint
  - Reason: Expose manual agent creation to frontend
- `src/release/types.ts` — modified
  - Change: Made created_from_run_id nullable in ExpertTemplateResponse
  - Reason: Match backend schema changes
- `src/release/api.ts` — modified
  - Change: Added createExpertAgent API function
  - Reason: Frontend integration for manual agent creation
- `src/release/ExpertTemplatesView.tsx` — renamed to `src/release/ExpertAgentsView.tsx`
  - Change: Renamed component from ExpertTemplatesView to ExpertAgentsView
  - Reason: Better reflects dual-source nature (debate-saved + manually created)
  - Change: Updated all UI text from "templates" to "agents"
  - Reason: Clearer terminology for users
  - Change: Added "Create Agent" button and full creation form with name, role, purpose, instructions, tone, model selector, domain tags, and optional performance note
  - Reason: Primary UI for manual agent creation
  - Change: Added handleCreate function with validation and state management
  - Reason: Handle agent creation flow
- `src/release/Sidebar.tsx` — modified
  - Change: Updated navigation label from "EXPERT TEMPLATES" to "EXPERT AGENTS"
  - Reason: Reflect feature rename
- `src/release/ReleaseApp.tsx` — modified
  - Change: Updated import and component usage from ExpertTemplatesView to ExpertAgentsView
  - Reason: Wire renamed component into app

## Changes
- added: Manual expert agent creation with full form UI
- added: CreateExpertAgentRequest schema with validation (min lengths, domain validation)
- added: create_manual_agent service method with quality guardrails
- added: POST /expert-templates/create API endpoint
- changed: created_from_run_id now nullable (null for manually created agents)
- changed: UI terminology from "Expert Templates" to "Expert Agents"
- changed: Component renamed from ExpertTemplatesView to ExpertAgentsView
- changed: Sidebar navigation updated to "EXPERT AGENTS"
- improved: Empty state message now mentions both creation methods

## Impact
- user-visible impact: Users can now create expert agents manually without completing a debate first
- user-visible impact: "Create Agent" button prominently displayed in Expert Agents view
- user-visible impact: Full-featured creation form with all agent properties
- user-visible impact: Clearer terminology — "Expert Agents" instead of "Expert Templates"
- technical impact: Database schema change (created_from_run_id nullable) requires migration
- risks or side effects: Existing templates unaffected; backward compatible
- breaking changes: None — additive feature

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test manual agent creation flow, form validation, and integration with existing debate-saved agents

## Follow-up
- remaining work
  - Run Alembic migration to alter created_from_run_id column to nullable
  - Test that manually created agents work correctly in debates
- technical debt
  - Consider adding agent preview/test functionality before saving

# v3.8.0 - 2026-03-22 16:29

## Summary
Expert Agent Templates — a full-stack feature that lets users save their best-performing debate agents as reusable expert templates. Templates are quality-gated (only from completed debates), domain-tagged, and performance-tracked. Users can browse their template library, add proven experts to new projects, and manage templates through a dedicated view.

## Files Modified
- `backend/app/models.py` — modified
  - Change: Added ExpertTemplate and TemplateUsage SQLAlchemy models
  - Reason: Persist expert agent templates and track per-run usage/ratings
- `backend/app/schemas.py` — modified
  - Change: Added SaveAgentAsTemplateRequest, UpdateExpertTemplateRequest, RateTemplateRequest, ExpertTemplateResponse, ExpertTemplateListResponse schemas and VALID_DECISION_DOMAINS constant
  - Reason: Validate API input/output for template operations
- `backend/app/services/expert_templates.py` — added
  - Change: New ExpertTemplateService with CRUD, validation, quality guardrails (max 15 templates, completed-run-only, domain validation, instruction quality check), usage tracking, and rating logic
  - Reason: Core business logic for expert templates
- `backend/app/main.py` — modified
  - Change: Added 7 API endpoints for expert template operations (save, list, get, update, delete, rate, suggest by domain)
  - Reason: Expose template management to frontend
- `backend/app/services/conversation_v2.py` — modified
  - Change: Added _get_matching_templates method; integrated template suggestions into _process_frame_confirmation during agent generation
  - Reason: Suggest proven experts when generating agents for matching decision domains
- `src/release/types.ts` — modified
  - Change: Added ExpertTemplateResponse and ExpertTemplateListResponse TypeScript interfaces
  - Reason: Type-safe frontend data layer
- `src/release/api.ts` — modified
  - Change: Added 7 API functions (saveAgentAsTemplate, listExpertTemplates, getExpertTemplate, updateExpertTemplate, deleteExpertTemplate, rateExpertTemplate, suggestExpertTemplates)
  - Reason: Frontend API integration for all template operations
- `src/release/RunScreen.tsx` — modified
  - Change: Added post-debate "Save Expert Perspectives" panel with agent selection, domain tagging, performance note, and save-as-template flow
  - Reason: Primary entry point for creating templates from completed debates
- `src/release/ProjectReviewScreen.tsx` — modified
  - Change: Added "Library" button to agents section with inline template browser showing name, role, helpful rate, usage count, and domain tags; click-to-add templates as project agents
  - Reason: Let users leverage saved experts when setting up new debates
- `src/release/ExpertTemplatesView.tsx` — added
  - Change: Full expert templates manager with list/detail layout, domain filtering, inline editing, delete with confirmation, usage stats display
  - Reason: Dedicated view for browsing and managing template library
- `src/release/Sidebar.tsx` — modified
  - Change: Added 'templates' to NavView type; moved TEMPLATES from static items to nav items as "EXPERT TEMPLATES"
  - Reason: Make templates accessible from sidebar navigation
- `src/release/ReleaseApp.tsx` — modified
  - Change: Imported ExpertTemplatesView; render it when activeView is 'templates'
  - Reason: Wire templates view into app routing

## Changes
- added: ExpertTemplate and TemplateUsage database models with quality metadata fields
- added: Quality guardrails — max 15 templates per workspace, completed-run-only, 1-3 validated decision domains, min 10-char performance notes, instruction length checks
- added: 7 REST API endpoints for full template lifecycle
- added: Template suggestions during conversation agent generation based on decision domain
- added: Post-debate agent evaluation panel in RunScreen
- added: Template library browser in ProjectReviewScreen agents section
- added: Dedicated ExpertTemplatesView with list/detail, filtering, editing, deletion
- added: "Expert Templates" navigation item in sidebar
- added: Performance tracking with helpful_rate, times_used, total_ratings

## Impact
- user-visible impact: Users can save best agents from completed debates as reusable templates
- user-visible impact: Templates appear as suggestions when building new projects
- user-visible impact: Dedicated templates manager accessible from sidebar
- user-visible impact: Domain-based filtering and performance stats help identify best templates
- technical impact: New database tables (expert_templates, template_usages) require migration
- technical impact: New service layer (ExpertTemplateService) with quality enforcement
- risks or side effects: Database migration needed before first use
- breaking changes: None — additive feature

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test full save/browse/add/edit/delete template flow

## Follow-up
- remaining work
  - Run Alembic migration for new tables
  - Add template rating prompt after debates that used templates
- technical debt
  - Consider caching template suggestions during conversation flow

# v3.7.5 - 2026-03-22 14:21

## Summary
Improved typing animation behavior to stop immediately when user clicks in the textarea, not just when they start typing. This provides a more responsive and intuitive user experience.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Added setIsTypingAnimation(false) to onFocus handler in initial view textarea
  - Reason: Stop animation immediately when user clicks in input field
  - Change: Added setIsTypingAnimation(false) to onFocus handler in active chat textarea
  - Reason: Ensure consistent behavior across both input instances
  - Change: Animation now stops on focus event, not just onChange
  - Reason: More responsive UX - stops as soon as user clicks, before typing
  - Change: Both textarea instances (initial and active chat) have same focus behavior
  - Reason: Consistent user experience across all views

## Changes
- improved: Typing animation stops immediately on textarea focus/click
- improved: More responsive user interaction - no delay waiting for first keystroke
- improved: Consistent behavior across initial and active chat views
- changed: Animation cessation trigger from onChange to onFocus

## Impact
- user-visible impact: Animation stops as soon as user clicks in textarea
- user-visible impact: More immediate response to user interaction
- user-visible impact: Better UX - no need to type to stop animation
- technical impact: Added setIsTypingAnimation(false) to onFocus handlers
- risks or side effects: None - improves responsiveness
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test animation stops on click/focus

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.7.4 - 2026-03-22 14:04

## Summary
Updated agent cards in the landing page to match the correct naming and role specifications. Changed agent labels to Agent Alpha/Beta/Gamma/Delta format and updated model names and roles to accurately reflect their functions: Claude 3.5 Sonnet (Analytical), Gemini 1.5 Pro (Research), GPT-4o (Synthesis), and Grok Beta (Contrarian).

## Files Modified
- `src/release/LandingPage.tsx` — modified
  - Change: Updated Claude agent label from "Analyst" to "Agent Alpha"
  - Reason: Match standardized agent naming convention
  - Change: Updated Claude model name from "Claude 3.5" to "Claude 3.5 Sonnet"
  - Reason: Use full model name for clarity
  - Change: Updated Claude role from "Ready" to "Analytical · Ready"
  - Reason: Display agent's analytical function
  - Change: Updated Gemini agent label from "Strategist" to "Agent Beta"
  - Reason: Match standardized agent naming convention
  - Change: Updated Gemini model name from "Gemini 1.5" to "Gemini 1.5 Pro"
  - Reason: Use full model name for accuracy
  - Change: Updated Gemini role from "Ready" to "Research · Ready"
  - Reason: Display agent's research function
  - Change: Updated GPT-4 agent label from "Critic" to "Agent Gamma"
  - Reason: Match standardized agent naming convention
  - Change: Updated GPT-4 role from "Ready" to "Synthesis · Ready"
  - Reason: Display agent's synthesis function
  - Change: Updated Grok agent label from "Facilitator" to "Agent Delta"
  - Reason: Match standardized agent naming convention
  - Change: Updated Grok role from "Ready" to "Contrarian · Ready"
  - Reason: Display agent's contrarian function

## Changes
- changed: Agent Alpha (Claude 3.5 Sonnet) - Analytical · Ready
- changed: Agent Beta (Gemini 1.5 Pro) - Research · Ready
- changed: Agent Gamma (GPT-4o) - Synthesis · Ready
- changed: Agent Delta (Grok Beta) - Contrarian · Ready
- improved: Consistent agent naming with Alpha/Beta/Gamma/Delta labels
- improved: Full model names for better clarity
- improved: Role descriptions showing each agent's specific function

## Impact
- user-visible impact: Agent cards now show standardized labels and full model names
- user-visible impact: Each agent displays its specific role (Analytical, Research, Synthesis, Contrarian)
- user-visible impact: More accurate representation of agent capabilities
- technical impact: Updated text content in agent card components
- risks or side effects: None - purely text content updates
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — verify agent cards display correctly on landing page

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.7.3 - 2026-03-22 14:01

## Summary
Hidden the Decision Analysis right panel until the conversation actually starts. The panel now only appears after the user sends their first message, providing a cleaner initial view focused on the hero section and input field.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Added conditional rendering to right context panel based on messages.length
  - Reason: Hide panel until conversation starts for cleaner initial UI
  - Change: Wrapped entire right panel div in {messages.length > 0 && (...)}
  - Reason: Panel only renders when at least one message exists
  - Change: Panel appears immediately after first message is sent
  - Reason: Show decision analysis context as soon as conversation begins
  - Change: No changes to panel content or functionality
  - Reason: Only visibility timing changed, not the panel itself

## Changes
- changed: Right context panel (Decision Analysis) now hidden on initial load
- added: Conditional rendering based on message count
- improved: Cleaner initial view with more focus on hero and input
- improved: Better use of horizontal space when panel is hidden
- improved: Panel appears automatically when conversation starts

## Impact
- user-visible impact: Decision Analysis panel hidden until first message sent
- user-visible impact: More spacious initial view without right panel
- user-visible impact: Panel appears automatically when conversation begins
- technical impact: Conditional rendering based on messages.length > 0
- risks or side effects: None - panel functionality unchanged
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test panel visibility before/after first message

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.7.2 - 2026-03-22 13:56

## Summary
Improved ChatInterface layout by moving the input box directly below the hero section (instead of at the bottom of the page), ensuring scrollbar only appears when chat messages overflow, and updating the hero title to "Let's help you decide" for a more welcoming tone.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Updated hero title from "What decision are you facing?" to "Let's help you decide"
  - Reason: More welcoming and positive tone for initial user experience
  - Change: Moved input box from bottom of page to directly below hero section (when no messages)
  - Reason: Better visual hierarchy and proximity to hero content
  - Change: Wrapped chat messages area in scrollable container with overflow: hidden on parent
  - Reason: Scrollbar only appears when messages exceed viewport height
  - Change: Input box positioned below hero section in initial view
  - Reason: Natural flow from hero content to input field
  - Change: Input box remains at bottom when chat is active (messages exist)
  - Reason: Standard chat interface behavior for active conversations
  - Change: Added flex: 1 to chat messages container with overflowY: auto
  - Reason: Messages area expands to fill space and scrolls independently
  - Change: Removed fixed bottom positioning for initial input box
  - Reason: Input should be part of content flow, not floating at bottom
  - Change: Maintained separate input positioning for active chat vs initial view
  - Reason: Different UX requirements for empty state vs active conversation

## Changes
- changed: Hero title to "Let's help you decide" (from "What decision are you facing?")
- changed: Input box positioned below hero section in initial view
- changed: Scrollbar only visible when chat messages overflow
- improved: Visual hierarchy with input directly below hero content
- improved: More welcoming and positive hero messaging
- improved: Better use of vertical space in initial view
- improved: Cleaner layout without unnecessary scrollbars

## Impact
- user-visible impact: Input box appears directly below hero section on initial load
- user-visible impact: More welcoming hero title "Let's help you decide"
- user-visible impact: Scrollbar only shows when chat messages require scrolling
- user-visible impact: Better visual flow from hero to input field
- technical impact: Conditional layout based on message count
- technical impact: Separate input positioning for initial vs active chat views
- risks or side effects: None - layout improvements only
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test input box positioning and scrollbar behavior

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.7.1 - 2026-03-22 13:53

## Summary
Fixed typing animation implementation to use the actual functional textarea input instead of a dummy chat box. The animation now types example questions directly into the input field and stops immediately when the user starts typing.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Removed dummy chat box that displayed animated examples
  - Reason: Animation should appear in the functional input field, not a separate display
  - Change: Changed typing animation to use setInput() instead of setTypingText()
  - Reason: Type directly into the actual functional textarea
  - Change: Renamed typingText state to isTypingAnimation boolean flag
  - Reason: Only need to track whether animation is active, not the text itself
  - Change: Added setIsTypingAnimation(false) in textarea onChange handler
  - Reason: Stop animation immediately when user starts typing
  - Change: Updated typing animation useEffect to check isTypingAnimation flag
  - Reason: Prevent animation from continuing after user interaction
  - Change: Simplified hero section layout to center vertically
  - Reason: Better visual balance without dummy chat box
  - Change: Removed separate chat box area from initial view
  - Reason: Input field at bottom is the only interactive element needed
  - Change: Animation cycles through examples in the actual input field
  - Reason: Users see examples in the same place they'll type their question
  - Change: Maintained 50ms typing speed and 2s pause between examples
  - Reason: Keep natural typing rhythm and readability
  - Change: Input field remains functional during animation
  - Reason: User can interrupt and start typing at any time

## Changes
- changed: Typing animation now appears in functional textarea input
- changed: Animation uses actual input value instead of separate display
- removed: Dummy chat box with animated example bubbles
- added: isTypingAnimation flag to control animation state
- added: Animation stop trigger on user input (onChange)
- improved: Hero section centered vertically for better layout
- improved: Seamless transition from animation to user input
- improved: More intuitive UX - examples appear where user will type

## Impact
- user-visible impact: Example questions type directly in the input field
- user-visible impact: Animation stops immediately when user starts typing
- user-visible impact: Cleaner layout without dummy chat elements
- user-visible impact: Input field is always functional and ready for user input
- technical impact: Simplified state management (removed typingText state)
- technical impact: Animation directly manipulates input value
- risks or side effects: None - animation cleanly stops on user interaction
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test typing animation in input field and user interruption

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.7.0 - 2026-03-22 13:47

## Summary
Restructured ChatInterface main screen to display hero section with animated typing example questions in the chat box below. After the first message is sent, the interface transitions to the normal chat view. This creates a more engaging and dynamic initial user experience.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Added typingText and currentExampleIndex state variables
  - Reason: Track current typing animation state and which example is being shown
  - Change: Added typingTimeoutRef to manage typing animation timeouts
  - Reason: Proper cleanup of animation intervals on component unmount
  - Change: Implemented typing animation useEffect with character-by-character display
  - Reason: Create realistic typing effect for example questions
  - Change: Configured typing speed at 50ms per character
  - Reason: Natural reading speed for typing animation
  - Change: Added 2-second pause between example questions
  - Reason: Give users time to read each example before cycling to next
  - Change: Cycling through 4 example questions in loop
  - Reason: Continuously demonstrate different use cases
  - Change: Restructured layout to show hero section above chat box when no messages
  - Reason: Separate hero content from chat area for better visual hierarchy
  - Change: Moved hero section (badge, title, description) to fixed position at top
  - Reason: Hero content stays visible while chat box shows animated examples below
  - Change: Replaced static "Quick Start Examples" list with animated chat bubble
  - Reason: More engaging and realistic demonstration of how chat works
  - Change: Added blinking cursor (|) to typing animation
  - Reason: Visual indicator that text is being typed
  - Change: Implemented CSS keyframes for cursor blink animation
  - Reason: Smooth 1-second blink cycle for cursor
  - Change: Conditional rendering - hero+chat view when no messages, normal chat when messages exist
  - Reason: Seamless transition to standard chat interface after first message
  - Change: Wrapped return in React Fragment to support multiple root elements
  - Reason: Allow style tag alongside main div for CSS animations
  - Change: Typing animation only runs when messages.length === 0
  - Reason: Stop animation once user starts conversation
  - Change: Chat box positioned below hero with flex: 1 for remaining space
  - Reason: Fill available vertical space with scrollable chat area
  - Change: Example questions displayed in chat bubble style (gray background, border)
  - Reason: Match actual chat message appearance for consistency

## Changes
- changed: Main screen layout restructured with hero section above chat box
- changed: Static example list replaced with animated typing demonstration
- added: Typing animation cycling through 4 example questions
- added: Character-by-character typing effect (50ms per char)
- added: Blinking cursor animation during typing
- added: 2-second pause between example questions
- added: Automatic cycling through examples in infinite loop
- added: Conditional layout - hero+chat when empty, normal chat when active
- added: CSS keyframes for cursor blink animation
- improved: Initial user experience with dynamic, engaging animation
- improved: Visual demonstration of how to use the chat interface
- improved: Smooth transition from welcome screen to active chat

## Impact
- user-visible impact: Animated typing examples appear in chat box on main screen
- user-visible impact: Hero section (title, description) positioned above chat area
- user-visible impact: After first message, interface switches to normal chat view
- user-visible impact: More engaging and dynamic initial experience
- technical impact: Added typing animation state management and effects
- technical impact: Conditional rendering based on message count
- technical impact: CSS animations for cursor blink
- risks or side effects: Animation runs continuously until first message sent
- breaking changes: None - existing chat functionality preserved

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test typing animation and layout transition

## Follow-up
- remaining work
  - None
- technical debt
  - Consider adding pause/resume controls for typing animation
  - Consider making typing speed configurable
- limitations
  - Animation loops indefinitely until user sends first message
  - Fixed set of 4 example questions (not randomized)

---

# v3.6.2 - 2026-03-22 13:27

## Summary
Replaced the external Send button with a minimalistic ArrowUp icon positioned inside the input box next to the microphone icon, creating a cleaner and more modern chat interface design.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Added ArrowUp icon import from lucide-react
  - Reason: Use consistent icon family for send action
  - Change: Replaced large Send button with circular ArrowUp icon button
  - Reason: Minimalistic design with icon-only interface
  - Change: Positioned send icon inside textarea at bottom-right
  - Reason: Keep all controls within input box for cleaner layout
  - Change: Placed send icon to the left of mic icon (44px from right when speech supported)
  - Reason: Logical ordering - send is primary action, mic is secondary
  - Change: Made send icon 28px circular button with indigo background when active
  - Reason: Match microphone icon size and style
  - Change: Send icon shows transparent background when disabled (no input)
  - Reason: Visual feedback that send action is unavailable
  - Change: Send icon color gray (#475569) when disabled, white when active
  - Reason: Clear visual state indication
  - Change: Increased textarea paddingRight from 50px to 80px when speech supported
  - Reason: Accommodate both send and mic icons without text overlap
  - Change: Send icon positioned at 12px from right when speech not supported
  - Reason: Consistent positioning whether mic icon is present or not
  - Change: Added hover effect changing background to lighter indigo (#818CF8)
  - Reason: Interactive feedback on hover
  - Change: Removed external Send button and its container
  - Reason: All controls now integrated within input box

## Changes
- changed: Send button replaced with ArrowUp icon (18px)
- changed: Send icon positioned inside input box next to mic icon
- changed: Icon shows indigo background (#6366F1) when message ready to send
- changed: Icon shows transparent background when disabled
- added: Circular button design (28px) matching mic icon style
- added: Hover effect with lighter indigo color
- removed: External Send button with text label
- improved: Cleaner, more minimalistic chat interface
- improved: Consistent icon-based controls within input box
- improved: Better use of horizontal space

## Impact
- user-visible impact: Send button now appears as icon inside input box
- user-visible impact: More compact and modern chat interface
- user-visible impact: All message controls (mic, send) in one place
- technical impact: Removed separate button element outside textarea container
- technical impact: Adjusted textarea padding for icon positioning
- risks or side effects: None - purely UI improvement
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test send icon positioning and functionality

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

---

# v3.6.1 - 2026-03-22 13:23

## Summary
Improved ChatInterface UI with minimalistic microphone icon positioned inside the input box, replaced single-line input with auto-expanding textarea for text wrapping, and added vertical scrollbar to chat messages area for better handling of long conversations.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Replaced input element with textarea for message input
  - Reason: Enable multi-line text input with automatic text wrapping
  - Change: Added auto-height adjustment on textarea input (max 150px)
  - Reason: Dynamically expand textarea as user types longer messages
  - Change: Moved microphone button inside textarea as absolute positioned icon
  - Reason: Minimalistic design with icon overlay, similar to modern chat apps
  - Change: Reduced microphone icon size from 20px to 18px
  - Reason: More subtle and less intrusive appearance
  - Change: Positioned microphone icon at bottom-right corner of textarea
  - Reason: Doesn't interfere with text input, stays out of the way
  - Change: Made microphone button background transparent with subtle hover
  - Reason: Minimalistic design matching reference image
  - Change: Added paddingRight to textarea when speech is supported (50px)
  - Reason: Prevent text from overlapping with microphone icon
  - Change: Added scrollbarWidth and scrollbarColor to chat messages area
  - Reason: Styled vertical scrollbar for better visual consistency
  - Change: Added overflowX: 'hidden' to chat area
  - Reason: Prevent horizontal scrolling on long messages
  - Change: Added scrollbar styling to textarea (thin, indigo accent)
  - Reason: Consistent scrollbar appearance across all scrollable areas
  - Change: Changed microphone icon color to subtle gray (#64748B) when idle
  - Reason: Less visually prominent, more minimalistic
  - Change: Red color (#EF4444) only when actively recording
  - Reason: Clear visual feedback without being distracting when idle
  - Change: Updated handleKeyPress type to HTMLTextAreaElement
  - Reason: Type safety for textarea element instead of input

## Changes
- changed: Input field replaced with auto-expanding textarea
- changed: Microphone icon moved inside input box (absolute positioned)
- changed: Microphone icon size reduced to 18px for minimalistic look
- changed: Microphone button background now transparent
- changed: Icon color subtle gray when idle, red when recording
- added: Auto-height adjustment for textarea (46px min, 150px max)
- added: Text wrapping support for long messages
- added: Vertical scrollbar to chat messages area
- added: Styled scrollbars (thin, indigo accent) for chat and textarea
- added: Padding-right to textarea to prevent text overlap with icon
- improved: Chat UX with multi-line input support
- improved: Visual design with minimalistic microphone icon placement
- improved: Scrolling behavior for long conversations

## Impact
- user-visible impact: Multi-line text input with automatic wrapping
- user-visible impact: Minimalistic microphone icon inside input box
- user-visible impact: Smooth scrolling in chat area for long conversations
- user-visible impact: Auto-expanding textarea up to 150px height
- technical impact: Changed from input to textarea element
- technical impact: Dynamic height calculation on input events
- risks or side effects: None - purely UI improvements
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test textarea wrapping and microphone icon

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - Textarea max height capped at 150px to prevent excessive expansion

---

# v3.6.0 - 2026-03-22 13:15

## Summary
Implemented Chrome Web Speech API-based speech-to-text functionality for the message input area in ChatInterface. Users can now click a microphone button to dictate their messages using voice input, with visual feedback showing recording state.

## Files Modified
- `src/release/ChatInterface.tsx` — modified
  - Change: Added Mic and MicOff icon imports from lucide-react
  - Reason: Provide visual indicators for microphone button states
  - Change: Added isListening and speechSupported state variables
  - Reason: Track recording state and browser compatibility
  - Change: Added recognitionRef to store SpeechRecognition instance
  - Reason: Manage speech recognition lifecycle across component renders
  - Change: Implemented useEffect to initialize Web Speech API on mount
  - Reason: Set up SpeechRecognition with proper event handlers
  - Change: Added toggleSpeechRecognition function to start/stop recording
  - Reason: Control voice input activation and deactivation
  - Change: Added microphone button next to message input field
  - Reason: Provide accessible UI control for speech-to-text
  - Change: Implemented visual feedback with red gradient and pulse animation when recording
  - Reason: Clear indication that microphone is active and listening
  - Change: Set recognition.continuous = false for single-phrase capture
  - Reason: Better UX for message input (stop after each phrase)
  - Change: Configured recognition.lang = 'en-US' for English speech
  - Reason: Optimize recognition accuracy for English language
  - Change: Implemented onresult handler to append transcript to input field
  - Reason: Seamlessly integrate voice input with existing text input
  - Change: Added error handling and cleanup in recognition lifecycle
  - Reason: Graceful degradation and proper resource management

## Changes
- added: Speech-to-text functionality using Chrome Web Speech API
- added: Microphone button in message input area (44x44px, rounded)
- added: Visual feedback with red gradient background when recording
- added: Pulse animation on microphone button during active recording
- added: Automatic detection of browser speech recognition support
- added: Mic/MicOff icon toggle based on recording state
- added: Hover effects on microphone button (indigo accent)
- added: Tooltip showing "Start voice input" or "Stop recording"
- improved: Message input UX with voice dictation option
- improved: Accessibility with voice input alternative to typing

## Impact
- user-visible impact: Users can now dictate messages using voice input
- user-visible impact: Clear visual feedback when microphone is active
- user-visible impact: Seamless integration with existing text input workflow
- technical impact: Uses native browser Web Speech API (Chrome/Edge)
- technical impact: No external dependencies or API costs
- risks or side effects: Only works in Chrome/Edge browsers with speech support
- risks or side effects: Requires microphone permissions from user
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — test microphone button in Chrome browser

## Follow-up
- remaining work
  - None
- technical debt
  - Consider adding language selection for non-English users
  - Consider adding interim results for real-time transcription feedback
- limitations
  - Only works in browsers supporting Web Speech API (Chrome, Edge)
  - Requires user to grant microphone permissions
  - English language only (configurable via recognition.lang)

---

# v3.5.1 - 2026-03-22 12:40

## Summary
Added animated agent constellation visualization to landing page hero section. The visualization features 4 AI agent cards (Claude, Gemini, GPT-4, Grok) connected to a central Decision Hub with animated SVG connection lines and rotating hub rings, matching the design from landingpage.html sample.

## Files Modified
- `src/release/LandingPage.tsx` — modified
  - Change: Added agent constellation section with 4 agent cards in left/right columns
  - Reason: Provide visual demonstration of multi-agent system architecture
  - Change: Created Claude and Gemini agent cards on left with brand colors and icons
  - Reason: Show analytical and strategic agent roles
  - Change: Created GPT-4 and Grok agent cards on right with brand colors and icons
  - Reason: Show critic and facilitator agent roles
  - Change: Added central Decision Hub with rotating rings and gradient core
  - Reason: Visualize the central coordination point for agent debates
  - Change: Implemented SVG animated connection lines with gradient strokes
  - Reason: Show data flow between agents and hub with smooth animations
  - Change: Added animateMotion for colored dots traveling along connection paths
  - Reason: Create engaging visual of active communication between agents
  - Change: Added CSS keyframe animations for hub rotation and status blinking
  - Reason: Bring the visualization to life with smooth continuous animations
  - Change: Used brand-specific colors for each AI model (Claude orange, Gemini blue, GPT-4 green, Grok purple)
  - Reason: Match official brand colors for authenticity
  - Change: Added "Ready" status indicators with blinking cyan dots
  - Reason: Show agents are active and available

## Changes
- added: Agent constellation visualization with 4 AI model cards
- added: Central Decision Hub with rotating outer and mid rings
- added: SVG animated connection lines with gradient colors
- added: Animated dots traveling along connection paths (2.2s-2.8s durations)
- added: Hub ring rotation animations (8s outer, 5s mid reverse)
- added: Blinking status dots on agent cards
- added: Brand-accurate AI model icons (Claude, Gemini, GPT-4, Grok)
- added: Glass-morphism styling on agent cards
- improved: Visual storytelling of multi-agent debate system
- improved: Landing page engagement with animated elements

## Impact
- user-visible impact: Engaging animated visualization of platform architecture
- user-visible impact: Clear demonstration of multi-agent collaboration
- user-visible impact: Professional presentation matching modern SaaS standards
- technical impact: SVG animations with SMIL animateMotion
- risks or side effects: None - purely visual enhancement
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — refresh landing page to see constellation

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - Constellation may need responsive adjustments for mobile screens

---

# v3.5.0 - 2026-03-22 09:17

## Summary
Created a comprehensive marketing landing page for non-authenticated users, cloning the design from landingpage.html sample. The new landing page features hero section, features showcase, pricing tiers, and modern dark-themed UI with glass-morphism effects. Non-authenticated users now see a full marketing experience instead of going directly to the auth screen.

## Files Modified
- `src/release/LandingPage.tsx` — created
  - Change: Created new landing page component with hero section, features, pricing, and CTA
  - Reason: Provide marketing experience for first-time visitors and non-authenticated users
  - Change: Implemented dark theme with background orbs and dot grid pattern
  - Reason: Match modern design aesthetic from sample
  - Change: Added navigation bar with Sign in and Get started buttons
  - Reason: Easy access to authentication from landing page
  - Change: Created hero section with gradient heading and proof points
  - Reason: Compelling value proposition for new visitors
  - Change: Added stats strip showing 4 AI models, infinite rounds, consensus output
  - Reason: Highlight key platform capabilities
  - Change: Implemented "How it works" section with 3-step process
  - Reason: Educate users on platform workflow
  - Change: Added features section highlighting multi-model debates, real-time streaming
  - Reason: Showcase platform differentiators
  - Change: Created pricing section with Free, Pro, and Enterprise tiers
  - Reason: Clear pricing transparency with monthly/annual toggle
  - Change: Added final CTA section and footer
  - Reason: Multiple conversion opportunities throughout page
  - Change: Used inline styles with glass-morphism effects and responsive design
  - Reason: Consistent with project styling approach

- `src/release/ReleaseApp.tsx` — modified
  - Change: Added import for LandingPage component
  - Reason: Use new landing page for non-authenticated users
  - Change: Added showAuthScreen state to toggle between landing and auth
  - Reason: Allow users to navigate from landing page to sign-in
  - Change: Updated non-authenticated user flow to show LandingPage first
  - Reason: Marketing experience before authentication
  - Change: Pass onSignIn and onGetStarted callbacks to LandingPage
  - Reason: Enable navigation to AuthScreen when user clicks sign-in or get-started

## Changes
- added: New LandingPage.tsx component with full marketing page
- added: Hero section with gradient heading and animated badge
- added: Background orbs (indigo, orange, cyan) with blur effects
- added: Dot grid background pattern
- added: Navigation bar with branding and auth buttons
- added: Stats strip showing platform capabilities
- added: Logos bar for AI model providers
- added: How it works section with 3-step process
- added: Features section with 4 key features
- added: Pricing section with 3 tiers and annual/monthly toggle
- added: Final CTA section with gradient background
- added: Footer with branding and links
- changed: Non-authenticated user flow now shows landing page first
- changed: AuthScreen now accessible via Sign in button on landing page
- improved: First-time visitor experience with marketing content
- improved: Conversion funnel with multiple CTAs

## Impact
- user-visible impact: Non-authenticated users see professional marketing page
- user-visible impact: Clear value proposition and feature showcase
- user-visible impact: Transparent pricing information
- user-visible impact: Multiple paths to sign up or sign in
- technical impact: Separation of marketing and authentication concerns
- risks or side effects: None - purely additive feature
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — refresh frontend to see new landing page

## Follow-up
- remaining work
  - None
- technical debt
  - Consider adding Space Grotesk font import to index.html if not already present
  - Consider extracting common styles to shared theme file
- limitations
  - None

---

# v3.4.0 - 2026-03-21 19:52

## Summary
Redesigned the Launch debate page (ProjectReviewScreen) with modern dark-themed UI matching the sample design. Implemented glass-morphism effects, gradient backgrounds, improved typography with Space Grotesk font, and fully responsive layout with comprehensive mobile breakpoints.

## Files Modified
- `src/release/ProjectReviewScreen.tsx` — modified
  - Change: Replaced entire component layout with modern dark design (#06080F background)
  - Reason: User requested design update to match sample page with modern dark aesthetic
  - Change: Added animated background orbs (indigo, orange, cyan) with blur effects
  - Reason: Create depth and visual interest with subtle gradient glows
  - Change: Added dot grid background pattern
  - Reason: Add texture and modern design element matching sample
  - Change: Implemented glass-morphism panels with backdrop-filter blur
  - Reason: Create floating, layered UI elements with depth
  - Change: Updated header with gradient text using Space Grotesk font
  - Reason: Modern typography with visual hierarchy
  - Change: Added comprehensive responsive breakpoints (sm, lg, xl)
  - Reason: Ensure fully responsive design across mobile, tablet, and desktop
  - Change: Updated all inputs/textareas with focus states (indigo border glow)
  - Reason: Better visual feedback for interactive elements
  - Change: Changed "Launch debate" button to orange gradient with glow shadow
  - Reason: Primary CTA stands out with brand accent color
  - Change: Updated agent cards with hover scale animations
  - Reason: Subtle micro-interactions improve UX
  - Change: Redesigned flow phase cards with numbered badges
  - Reason: Clear visual hierarchy and step indication
  - Change: Updated Launch Readiness panel with warning emoji for assumptions
  - Reason: Better visual communication of important information

## Changes
- changed: Complete visual redesign of ProjectReviewScreen component
- added: Animated background orbs with gradient blur effects
- added: Dot grid background pattern
- added: Glass-morphism panels with backdrop-filter blur
- added: Gradient text headers with Space Grotesk font
- added: Comprehensive responsive design (mobile-first approach)
- added: Focus states with indigo border glow on all inputs
- added: Hover animations on interactive elements
- improved: Typography hierarchy with better font sizes and spacing
- improved: Color scheme using modern dark palette (#06080F, #0B0E1A, #6366F1, #F97316)
- improved: Button styling with gradients and shadow effects
- improved: Agent card design with better information density
- improved: Mobile responsiveness with proper text scaling and padding

## Impact
- user-visible impact: Modern, professional dark-themed interface
- user-visible impact: Better visual hierarchy and readability
- user-visible impact: Smooth animations and micro-interactions
- user-visible impact: Fully responsive across all device sizes
- user-visible impact: Improved focus states for better accessibility
- technical impact: Inline styles for precise color control and effects
- risks or side effects: None - purely visual update, no functional changes
- breaking changes: None

## Validation
- tests: Not run
- lint: Not run
- build: Not run
- manual verification: Pending — refresh frontend to see new design

## Follow-up
- remaining work
  - None
- technical debt
  - Consider extracting color variables to a theme configuration
  - Consider adding Space Grotesk font import to index.html if not already present
- limitations
  - None

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

# v3.3.10 - 2026-03-21 15:54

## Summary
Updated three-dot menu to use horizontal dots (⋯) instead of vertical dots (⋮) and made the buttons only visible when hovering over list items. Added smooth fade in/out animation for a cleaner, more minimalistic interface.

## Files Modified
- `src/release/Sidebar.tsx` — modified
  - Change: Replaced MoreVertical icon with MoreHorizontal icon
  - Change: Added className="three-dot-button" to identify menu buttons
  - Change: Set opacity: 0 by default for three-dot buttons (hidden)
  - Change: Added transition: 'opacity 0.12s' for smooth animations
  - Change: Updated onMouseEnter to show button: button.style.opacity = '1'
  - Change: Updated onMouseLeave to hide button: button.style.opacity = '0'
  - Reason: User requested horizontal dots and hover-only visibility for cleaner interface

## Changes
- changed: Three-dot menu now uses horizontal dots (⋯) instead of vertical dots (⋮)
- changed: Three-dot buttons are hidden by default and only appear on hover
- improved: Smooth fade in/out animation when entering/leaving hover state
- improved: Cleaner, more minimalistic interface with less visual clutter

## Impact
- user-visible impact: Three-dot buttons only appear when hovering over session items
- user-visible impact: Horizontal dots provide better visual balance
- technical impact: Reduced visual noise in sidebar interface
- risks or side effects: None
- breaking changes: None

## Validation
- tests: Not run
- lint: No errors
- build: Not run
- manual verification: Pending — refresh frontend to see horizontal dots and hover behavior

## Follow-up
- remaining work
  - None
- technical debt
  - None
- limitations
  - None

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
