export interface AuthMeResponse {
  user_id: string;
  auth_subject: string;
  email?: string | null;
  workspace_id: string;
  workspace_name: string;
  plan_code: string;
  subscription_status: string;
}

export interface ClarificationQuestionItem {
  key: string;
  question: string;
  rationale: string;
}

export interface PromptIntakeAssessment {
  status: string;
  domain: string;
  prompt_quality_score: number;
  is_high_risk: boolean;
  clarification_questions: ClarificationQuestionItem[];
  assumptions: string[];
  warnings: string[];
}

export interface ClarificationRequiredResponse {
  message: string;
  clarification_session_id?: string;
  assessment: PromptIntakeAssessment;
}

export interface AgentCapabilities {
  ask: boolean;
  challenge: boolean;
  cite: boolean;
  score: boolean;
  recommend: boolean;
}

export interface AgentDraft {
  name: string;
  role: string;
  purpose: string;
  instructions: string;
  tone: string;
  tools: string[];
  capabilities: AgentCapabilities;
  model_provider: string;
  model_name: string;
}

export interface FlowStepDraft {
  name: string;
  description: string;
  rules: Record<string, unknown>;
}

export interface ProjectResponse {
  project_id: string;
  workspace_id: string;
  title: string;
  objective: string;
  prompt: string;
  intake_status: string;
  prompt_quality_score: number;
  generated_with_assumptions: boolean;
  status: string;
  latest_version_id: string;
  latest_version_number: number;
  assumptions: string[];
  warnings: string[];
  agents: AgentDraft[];
  flow: FlowStepDraft[];
  created_at: string;
  updated_at: string;
}

export interface RunResponse {
  run_id: string;
  project_id: string;
  project_version_id: string;
  status: string;
  estimated_cost_cents: number;
  actual_cost_cents: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface TranscriptMessageResponse {
  id: string;
  phase_name: string;
  speaker_name: string;
  message_type: string;
  content: string;
  sequence: number;
  created_at: string;
}

export interface RunEventResponse {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  sequence: number;
  created_at: string;
}

export interface FinalOutputResponse {
  run_id: string;
  summary: string;
  verdict: string;
  recommendations: string[];
  raw_output: Record<string, unknown>;
  created_at: string;
}
