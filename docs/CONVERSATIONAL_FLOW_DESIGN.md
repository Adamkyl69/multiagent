# Conversational Project Builder - Design Specification

**Version:** 1.0  
**Date:** 2026-03-20  
**Status:** Draft for Review

---

## Executive Summary

Transform the Multi-Agent Debator from a single-prompt submission model into an **interactive, conversational experience** where users build debate projects through natural dialogue. The system guides users from a simple topic statement to a fully-configured debate project by asking intelligent follow-up questions and suggesting agents/flows based on context.

---

## Problem Statement

### Current Issues
- **High cognitive load**: Users must provide complete, well-structured prompts upfront
- **Unclear expectations**: Users don't know what information is needed
- **Rigid flow**: Clarification questions are structured forms, not natural conversation
- **Poor discoverability**: Users don't know what agents/flows are possible

### User Pain Points
- "I just want to decide on X, why do I need to write a detailed prompt?"
- "What kind of agents should I use?"
- "How many debate rounds do I need?"
- "I don't know what constraints matter"

---

## Design Goals

1. **Natural conversation**: Chat-like interface, not forms
2. **Progressive disclosure**: Collect information incrementally
3. **Smart suggestions**: System recommends agents/flows based on context
4. **Transparency**: Show what's been collected in real-time
5. **Flexibility**: Allow users to change/refine earlier answers
6. **Seamless generation**: Smooth transition from chat to project generation

---

## User Journey

### Ideal Flow Example

```
USER: I need to decide whether to expand to the UAE market

SYSTEM: Great! Let me help you set up a debate for this decision.
        Who will be making this decision?
        [Quick replies: CEO | Board | Product Team | Custom]

USER: Our CEO and CFO together

SYSTEM: Got it - executive decision-making context.
        What's driving this decision? Any specific goals or constraints?

USER: We have a $2M budget and need to decide in 3 months

SYSTEM: Perfect. I'll keep budget and timeline in mind.
        
        For UAE market expansion, I recommend these agents:
        ✓ Financial Analyst (evaluates costs & ROI)
        ✓ Market Research Expert (UAE market conditions)
        ✓ Regulatory Compliance Specialist (UAE laws)
        ✓ Risk Analyst (expansion risks)
        
        Should I add all of these, or would you like to customize?
        [Add all | Customize | Suggest more]

USER: Add all, and also someone who knows logistics

SYSTEM: Added Logistics & Operations Expert.
        
        Current agents (5):
        • Financial Analyst
        • Market Research Expert
        • Regulatory Compliance Specialist
        • Risk Analyst
        • Logistics & Operations Expert
        
        How many debate rounds should we run?
        [Quick replies: 2 rounds | 3 rounds | 4 rounds | Custom]

USER: 3 rounds

SYSTEM: Perfect! Here's your debate setup:
        
        📋 Decision: UAE market expansion
        👥 Decision makers: CEO & CFO
        💰 Budget: $2M
        ⏱️ Timeline: 3 months
        🤖 Agents: 5 specialized experts
        🔄 Flow: 3 rounds of debate
        
        Ready to generate your project?
        [Generate Project | Refine Setup]

USER: [clicks Generate Project]

SYSTEM: ✨ Generating your debate project...
        [Shows progress, then transitions to project review screen]
```

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ChatInterface                                              │
│  ├─ MessageList (user/system bubbles)                       │
│  ├─ InputBox (natural language)                             │
│  ├─ QuickReplies (suggested actions)                        │
│  └─ ContextSidebar (collected info)                         │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────┤
│  ConversationService                                        │
│  ├─ State Management (track conversation)                   │
│  ├─ Intent Recognition (understand user input)              │
│  ├─ Question Generator (ask smart follow-ups)               │
│  ├─ Agent Suggester (recommend agents)                      │
│  ├─ Flow Builder (construct debate flow)                    │
│  └─ Completion Detector (know when ready)                   │
│                                                             │
│  LLMService (Gemini)                                        │
│  └─ Conversation orchestration prompts                      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Database (SQLite)                        │
├─────────────────────────────────────────────────────────────┤
│  ConversationSession                                        │
│  ├─ id, workspace_id, user_id                               │
│  ├─ status (in_progress, ready, completed)                  │
│  ├─ collected_context (JSON)                                │
│  └─ created_at, updated_at                                  │
│                                                             │
│  ConversationMessage                                        │
│  ├─ id, session_id                                          │
│  ├─ role (user, system)                                     │
│  ├─ content (message text)                                  │
│  ├─ metadata (quick_replies, suggestions)                   │
│  └─ created_at                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

#### `conversation_sessions`
```sql
CREATE TABLE conversation_sessions (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- in_progress, ready_to_generate, completed
    collected_context JSON NOT NULL,  -- Partial project data
    project_id VARCHAR(36),  -- Links to generated project (nullable)
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### `conversation_messages`
```sql
CREATE TABLE conversation_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role VARCHAR(10) NOT NULL,  -- user, system
    content TEXT NOT NULL,
    metadata JSON,  -- quick_replies, suggestions, etc.
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
);
```

### `collected_context` JSON Structure
```json
{
  "topic": "UAE market expansion decision",
  "decision_makers": ["CEO", "CFO"],
  "constraints": {
    "budget": "$2M",
    "timeline": "3 months"
  },
  "goals": ["Evaluate ROI", "Assess risks", "Understand regulations"],
  "agents": [
    {
      "name": "Financial Analyst",
      "role": "Evaluate costs and ROI",
      "confirmed": true
    },
    {
      "name": "Market Research Expert",
      "role": "Analyze UAE market conditions",
      "confirmed": true
    }
  ],
  "flow": {
    "rounds": 3,
    "phases": ["opening_statements", "cross_examination", "synthesis"]
  },
  "stage": "flow_configuration",  -- Current conversation stage
  "completeness": 85  -- % of required info collected
}
```

---

## API Design

### New Endpoints

#### `POST /api/v1/conversations/start`
**Purpose**: Start a new conversation session

**Request**:
```json
{
  "initial_message": "I need to decide whether to expand to UAE market"
}
```

**Response**:
```json
{
  "session_id": "uuid",
  "message": {
    "role": "system",
    "content": "Great! Let me help you set up a debate for this decision.\nWho will be making this decision?",
    "quick_replies": ["CEO", "Board", "Product Team", "Custom"]
  },
  "context": {
    "topic": "UAE market expansion decision",
    "stage": "decision_makers",
    "completeness": 10
  }
}
```

---

#### `POST /api/v1/conversations/{session_id}/message`
**Purpose**: Send a message in an ongoing conversation

**Request**:
```json
{
  "content": "Our CEO and CFO together"
}
```

**Response**:
```json
{
  "message": {
    "role": "system",
    "content": "Got it - executive decision-making context.\nWhat's driving this decision? Any specific goals or constraints?",
    "quick_replies": null
  },
  "context": {
    "topic": "UAE market expansion decision",
    "decision_makers": ["CEO", "CFO"],
    "stage": "constraints",
    "completeness": 25
  }
}
```

---

#### `GET /api/v1/conversations/{session_id}`
**Purpose**: Retrieve conversation history and current state

**Response**:
```json
{
  "session_id": "uuid",
  "status": "in_progress",
  "messages": [
    {
      "role": "user",
      "content": "I need to decide whether to expand to UAE market",
      "created_at": "2026-03-20T16:00:00Z"
    },
    {
      "role": "system",
      "content": "Great! Let me help you...",
      "created_at": "2026-03-20T16:00:01Z"
    }
  ],
  "context": { /* collected_context */ },
  "can_generate": false
}
```

---

#### `POST /api/v1/conversations/{session_id}/generate`
**Purpose**: Generate project from completed conversation

**Request**: (empty body or optional overrides)

**Response**:
```json
{
  "project_id": "uuid",
  "project": { /* ProjectResponse */ }
}
```

---

## Conversation Stages

The system guides users through these stages sequentially:

### 1. **Topic Identification** (10% complete)
- Extract core decision/topic
- Validate it's debate-worthy
- **Exit**: `context.topic` populated

### 2. **Decision Makers** (25% complete)
- Who's making the decision?
- What's their role/context?
- **Exit**: `context.decision_makers` populated

### 3. **Constraints & Goals** (40% complete)
- Budget, timeline, resources
- Success criteria
- Key concerns
- **Exit**: `context.constraints` and `context.goals` populated

### 4. **Agent Selection** (70% complete)
- System suggests agents based on topic/constraints
- User confirms/customizes
- **Exit**: `context.agents` list finalized

### 5. **Flow Configuration** (85% complete)
- Number of rounds
- Debate phases
- Special rules
- **Exit**: `context.flow` configured

### 6. **Review & Generate** (100% complete)
- Show summary of collected info
- Allow refinements
- **Exit**: User confirms → generate project

---

## LLM Orchestration

### Conversation Orchestrator Prompt Template

```
You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: {stage}
COLLECTED CONTEXT: {context}
USER MESSAGE: {user_message}

YOUR TASKS:
1. Understand the user's intent
2. Extract relevant information
3. Ask the next logical question OR suggest next steps
4. Provide quick reply options when appropriate
5. Be concise and friendly

STAGE-SPECIFIC GUIDANCE:
{stage_guidance}

RESPONSE FORMAT (JSON):
{
  "extracted_info": { /* new info from user message */ },
  "next_question": "string",
  "quick_replies": ["option1", "option2", ...] or null,
  "suggestions": { /* agent/flow suggestions */ } or null,
  "stage_complete": boolean,
  "next_stage": "stage_name" or null
}
```

### Stage-Specific Prompts

#### Topic Identification
```
The user just started. Extract:
- Core decision or topic
- Domain (business, technical, personal, etc.)
- Any initial context

Ask: "Who will be making this decision?"
```

#### Decision Makers
```
Extract:
- Decision maker roles (CEO, team, individual, etc.)
- Organizational context if mentioned

Ask: "What's driving this decision? Any specific goals or constraints?"
```

#### Constraints & Goals
```
Extract:
- Budget constraints
- Timeline
- Resources
- Success criteria
- Key concerns

If enough info, move to agent selection.
Otherwise ask: "Any other important constraints or goals?"
```

#### Agent Selection
```
Based on topic "{topic}" and constraints {constraints}:
1. Suggest 3-5 relevant agents
2. Explain why each is useful
3. Ask: "Should I add all of these, or would you like to customize?"

Provide quick replies: ["Add all", "Customize", "Suggest more"]
```

#### Flow Configuration
```
Ask: "How many debate rounds should we run?"
Provide quick replies: ["2 rounds", "3 rounds", "4 rounds", "Custom"]

Suggest phases based on complexity:
- Simple: opening_statements → synthesis
- Medium: opening_statements → cross_examination → synthesis
- Complex: opening_statements → cross_examination → rebuttal → synthesis
```

---

## Frontend Components

### ChatInterface (Main Component)

```typescript
interface ChatInterfaceProps {
  sessionId?: string;  // Resume existing or start new
}

interface Message {
  id: string;
  role: 'user' | 'system';
  content: string;
  quick_replies?: string[];
  suggestions?: AgentSuggestion[] | FlowSuggestion;
  created_at: string;
}

interface CollectedContext {
  topic?: string;
  decision_makers?: string[];
  constraints?: Record<string, string>;
  goals?: string[];
  agents?: AgentDraft[];
  flow?: FlowDraft;
  stage: ConversationStage;
  completeness: number;
}
```

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Multi-Agent Debator                          [User Menu]   │
├──────────────────────────────┬──────────────────────────────┤
│                              │  Context Sidebar             │
│  Message List                │  ┌────────────────────────┐  │
│  ┌────────────────────────┐  │  │ 📋 Topic               │  │
│  │ USER: I need to decide │  │  │ UAE market expansion   │  │
│  │ whether to expand...   │  │  │                        │  │
│  └────────────────────────┘  │  │ 👥 Decision Makers     │  │
│                              │  │ • CEO                  │  │
│  ┌────────────────────────┐  │  │ • CFO                  │  │
│  │ SYSTEM: Great! Let me  │  │  │                        │  │
│  │ help you...            │  │  │ 💰 Constraints         │  │
│  │ [CEO] [Board] [Custom] │  │  │ Budget: $2M            │  │
│  └────────────────────────┘  │  │ Timeline: 3 months     │  │
│                              │  │                        │  │
│  ┌────────────────────────┐  │  │ 🤖 Agents (5)          │  │
│  │ USER: Our CEO and CFO  │  │  │ • Financial Analyst    │  │
│  └────────────────────────┘  │  │ • Market Research...   │  │
│                              │  │ [View all]             │  │
│  ┌────────────────────────┐  │  │                        │  │
│  │ SYSTEM: Got it...      │  │  │ 🔄 Flow                │  │
│  │ What's driving this... │  │  │ 3 rounds               │  │
│  └────────────────────────┘  │  │                        │  │
│                              │  │ ━━━━━━━━━━━━━━━━━━━━  │  │
│  [Scroll for more messages]  │  │ Completeness: 85%      │  │
│                              │  │                        │  │
├──────────────────────────────┤  │ [Generate Project]     │  │
│  Type your message...    [→] │  └────────────────────────┘  │
└──────────────────────────────┴──────────────────────────────┘
```

### Key UI Elements

#### Message Bubble
```typescript
<MessageBubble 
  role="system"
  content="Great! Let me help you..."
  quickReplies={["CEO", "Board", "Custom"]}
  suggestions={agentSuggestions}
/>
```

#### Quick Reply Chips
```typescript
<QuickReplies 
  options={["CEO", "Board", "Product Team", "Custom"]}
  onSelect={(option) => sendMessage(option)}
/>
```

#### Agent Suggestion Card
```typescript
<AgentSuggestion
  name="Financial Analyst"
  role="Evaluate costs and ROI"
  reason="Critical for budget-constrained decisions"
  onAdd={() => confirmAgent("Financial Analyst")}
  onSkip={() => skipAgent("Financial Analyst")}
/>
```

#### Context Sidebar
```typescript
<ContextSidebar
  context={collectedContext}
  completeness={85}
  onEdit={(field) => editContext(field)}
  canGenerate={context.completeness === 100}
  onGenerate={() => generateProject()}
/>
```

---

## Backend Service Design

### ConversationService

```python
class ConversationService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.stage_handlers = {
            "topic": TopicStageHandler(),
            "decision_makers": DecisionMakersStageHandler(),
            "constraints": ConstraintsStageHandler(),
            "agents": AgentSelectionStageHandler(),
            "flow": FlowConfigurationStageHandler(),
            "review": ReviewStageHandler(),
        }
    
    async def start_conversation(
        self,
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        initial_message: str,
    ) -> ConversationResponse:
        """Start a new conversation session"""
        
    async def process_message(
        self,
        session: AsyncSession,
        session_id: str,
        user_message: str,
    ) -> ConversationResponse:
        """Process user message and generate system response"""
        
    async def generate_project_from_conversation(
        self,
        session: AsyncSession,
        session_id: str,
    ) -> ProjectResponse:
        """Convert completed conversation to project"""
```

### Stage Handlers

Each stage has a handler that:
1. Validates collected info
2. Extracts new info from user message
3. Generates next question/suggestion
4. Determines if stage is complete

```python
class StageHandler(ABC):
    @abstractmethod
    async def process(
        self,
        context: CollectedContext,
        user_message: str,
        llm_service: LLMService,
    ) -> StageResult:
        """Process user message for this stage"""
        
    @abstractmethod
    def is_complete(self, context: CollectedContext) -> bool:
        """Check if stage has enough info"""
        
    @abstractmethod
    def get_next_stage(self) -> str | None:
        """Return next stage name"""
```

---

## Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)
- Build new conversation tables/models
- Implement conversation service
- Create new chat UI (separate route)
- **Keep existing prompt flow intact**

### Phase 2: Feature Flag (Week 3)
- Add feature flag: `ENABLE_CONVERSATIONAL_FLOW`
- Show toggle in UI: "Try new conversational mode"
- Collect user feedback

### Phase 3: Default Switch (Week 4)
- Make conversational flow the default
- Keep old flow as "Advanced mode"

### Phase 4: Deprecation (Week 5+)
- Remove old prompt flow
- Clean up unused code

---

## Edge Cases & Error Handling

### User Changes Mind
**Scenario**: User wants to change earlier answers
**Solution**: 
- Allow editing context sidebar fields
- System asks: "I see you changed X. Should I adjust the agents/flow accordingly?"

### Ambiguous Input
**Scenario**: User message is unclear
**Solution**:
- LLM extracts best guess
- System confirms: "Just to clarify, you mean [interpretation]?"

### Conversation Timeout
**Scenario**: User abandons conversation
**Solution**:
- Save state for 7 days
- Show "Resume conversation" option on return

### Invalid Agent Combination
**Scenario**: User selects conflicting agents
**Solution**:
- System warns: "Agent X and Y have overlapping roles. Recommend keeping only one."

### Insufficient Information
**Scenario**: User tries to generate with <70% completeness
**Solution**:
- Block generation
- Highlight missing required fields in sidebar

---

## Success Metrics

### Quantitative
- **Conversation completion rate**: % of started conversations that reach generation
- **Time to generation**: Average time from start to project generation
- **Message count**: Average messages per successful conversation
- **Edit rate**: % of users who edit context after collection

### Qualitative
- **User satisfaction**: Post-generation survey
- **Clarity**: Do users understand what's being asked?
- **Confidence**: Do users feel confident in the generated project?

---

## Open Questions for Review

1. **Agent suggestion depth**: Should we suggest specific agent configurations (tools, capabilities) or just names/roles?

2. **Context editing**: Should users be able to edit context mid-conversation, or only in review stage?

3. **Conversation branching**: Should we support "go back" to previous stages, or only forward progress?

4. **Multi-turn clarification**: If LLM needs clarification on user's answer, how many back-and-forth turns before escalating?

5. **Preset templates**: Should we offer conversation templates for common scenarios (e.g., "Business decision", "Technical architecture")?

6. **Voice input**: Future consideration for voice-to-text input?

7. **Conversation export**: Should users be able to export conversation history as PDF/markdown?

8. **Collaborative conversations**: Multiple users contributing to same conversation session?

---

## Next Steps

1. **Review this design doc** - Provide feedback on:
   - Overall approach
   - Database schema
   - API design
   - UI/UX flow
   - Missing considerations

2. **Prioritize features** - Which parts are MVP vs. nice-to-have?

3. **Approve for implementation** - Once design is finalized, proceed with Phase 1

---

## Appendix: Example Conversation Flows

### Simple Flow (Personal Decision)
```
USER: Should I buy a Tesla or a Toyota?
SYSTEM: Let me help you think through this. What's most important to you?
USER: Cost and reliability
SYSTEM: I'll set up a debate with:
        • Financial Advisor (cost analysis)
        • Automotive Expert (reliability data)
        2 rounds of debate. Ready?
USER: Yes
SYSTEM: [Generates project]
```

### Complex Flow (Business Strategy)
```
USER: We're considering a merger with CompanyX
SYSTEM: Major decision! Who's involved in this decision?
USER: Board of directors and executive team
SYSTEM: What's the primary goal of this merger?
USER: Market expansion and technology acquisition
SYSTEM: Any constraints? Budget, timeline, regulatory concerns?
USER: Must close within 6 months, regulatory approval needed
SYSTEM: I recommend these agents:
        • M&A Financial Analyst
        • Legal/Regulatory Expert
        • Technology Assessment Specialist
        • Market Strategy Advisor
        • Integration Planning Expert
        Add all?
USER: Yes, and add a cultural fit analyst
SYSTEM: Added Cultural Integration Specialist.
        For a decision this complex, I suggest 4 rounds:
        1. Initial assessment
        2. Deep dive analysis
        3. Risk evaluation
        4. Final recommendation
        Proceed?
USER: Yes
SYSTEM: [Generates project with 6 agents, 4 rounds]
```

---

**End of Design Document**
