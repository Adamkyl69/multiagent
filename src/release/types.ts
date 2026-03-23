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

export interface ExpertTemplateResponse {
  id: string;
  workspace_id: string;
  created_from_run_id: string | null;
  name: string;
  role: string;
  purpose: string;
  instructions: string;
  tone: string;
  model_provider: string;
  model_name: string;
  decision_domains: string[];
  performance_note: string | null;
  times_used: number;
  helpful_count: number;
  total_ratings: number;
  helpful_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ExpertTemplateListResponse {
  templates: ExpertTemplateResponse[];
  count: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// MAGDM Decision Engine types
// ---------------------------------------------------------------------------

export interface DecisionSessionResponse {
  id: string;
  workspace_id: string;
  title: string;
  problem_statement: string;
  domain: string;
  mode: 'exploration' | 'structured_decision';
  status: 'draft' | 'structuring' | 'evaluating' | 'ranked' | 'archived';
  aggregation_method: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionAlternative {
  id: string;
  session_id: string;
  label: string;
  description: string;
  status: 'active' | 'removed';
  position: number;
}

export interface DecisionCriterion {
  id: string;
  session_id: string;
  name: string;
  description: string;
  direction: 'benefit' | 'cost';
  weight: number;
  weight_normalized: number;
  position: number;
}

export interface DecisionExpert {
  id: string;
  session_id: string;
  name: string;
  role: string;
  description: string;
  expert_type: 'system' | 'user_saved' | 'human';
  weight_normalized: number;
  status: 'active' | 'removed';
  position: number;
}

export interface DecisionEvaluation {
  id: string;
  session_id: string;
  expert_id: string;
  alternative_id: string;
  criterion_id: string;
  raw_score: number;
  normalized_score: number;
  confidence: 'low' | 'medium' | 'high';
  justification: string;
  source: 'ai' | 'human';
}

export interface AlternativeScoreDetail {
  alternative_id: string;
  alternative_label: string;
  group_score: number;
  rank: number;
  expert_scores: Record<string, number>;
  criterion_contributions: Record<string, number>;
  is_provisional: boolean;
}

export interface CriterionDisagreement {
  criterion_id: string;
  criterion_name: string;
  stddev: number;
  contested: boolean;
}

export interface AlternativeDisagreement {
  alternative_id: string;
  alternative_label: string;
  mean_disagreement: number;
  contested_criteria: string[];
}

export interface SensitivityItem {
  criterion_id: string;
  criterion_name: string;
  weight_normalized: number;
  impact_rank: number;
}

export interface RankingResult {
  session_id: string;
  is_complete: boolean;
  completion_errors: string[];
  ranked_alternatives: AlternativeScoreDetail[];
  criterion_disagreements: CriterionDisagreement[];
  alternative_disagreements: AlternativeDisagreement[];
  sensitivity: SensitivityItem[];
  is_provisional: boolean;
  provisional_reasons: string[];
  explanation: string;
  computed_at: string;
}

export interface DecisionSessionDetail {
  session: DecisionSessionResponse;
  alternatives: DecisionAlternative[];
  criteria: DecisionCriterion[];
  experts: DecisionExpert[];
  evaluations: DecisionEvaluation[];
  ranking: RankingResult | null;
}
