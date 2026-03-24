import { API_BASE_URL } from '../lib/env';
import type {
  AlternativeScoreDetail,
  AuthMeResponse,
  ClarificationRequiredResponse,
  DecisionAlternative,
  DecisionCriterion,
  DecisionExpert,
  DecisionSessionDetail,
  DecisionSessionResponse,
  ExpertTemplateListResponse,
  ExpertTemplateResponse,
  FinalOutputResponse,
  ProjectResponse,
  PromptIntakeAssessment,
  RankingResult,
  RunResponse,
  TranscriptMessageResponse,
} from './types';
import type {
  ConversationHistoryResponse,
  ConversationResponse,
  SendMessageRequest,
  StartConversationRequest,
} from './conversationTypes';

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail: unknown = null;
    let message = `Request failed with status ${response.status}`;
    
    try {
      detail = await response.json();
      if (typeof detail === 'object' && detail && 'detail' in detail) {
        const detailValue = (detail as { detail?: unknown }).detail;
        if (typeof detailValue === 'string') {
          message = detailValue;
        } else if (Array.isArray(detailValue)) {
          message = detailValue.map(e => typeof e === 'object' && e && 'msg' in e ? String(e.msg) : String(e)).join(', ');
        } else {
          message = JSON.stringify(detailValue);
        }
      }
    } catch {
      try {
        detail = await response.text();
        if (typeof detail === 'string' && detail.length > 0) {
          message = detail;
        }
      } catch {
        // Use default message
      }
    }
    
    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getMe(token: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>('/api/v1/auth/me', token, { method: 'GET' });
}

export async function evaluatePrompt(
  token: string,
  payload: { prompt: string; clarification_answers: Record<string, string> },
): Promise<PromptIntakeAssessment> {
  return request<PromptIntakeAssessment>('/api/v1/intake/evaluate', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateProject(
  token: string,
  payload: {
    prompt: string;
    clarification_answers: Record<string, string>;
    force_generate_with_assumptions?: boolean;
  },
): Promise<ProjectResponse> {
  return request<ProjectResponse>('/api/v1/projects/generate', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type { ClarificationRequiredResponse };

export async function updateProject(
  token: string,
  projectId: string,
  payload: Partial<Pick<ProjectResponse, 'title' | 'objective' | 'status' | 'agents' | 'flow'>>,
): Promise<ProjectResponse> {
  return request<ProjectResponse>(`/api/v1/projects/${projectId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function launchRun(
  token: string,
  payload: { project_id: string; project_version_id?: string },
): Promise<RunResponse> {
  return request<RunResponse>('/api/v1/runs', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function stopRun(token: string, runId: string): Promise<RunResponse> {
  return request<RunResponse>(`/api/v1/runs/${runId}/stop`, token, {
    method: 'POST',
  });
}

export async function getRun(token: string, runId: string): Promise<RunResponse> {
  return request<RunResponse>(`/api/v1/runs/${runId}`, token, { method: 'GET' });
}

export async function getTranscript(token: string, runId: string): Promise<TranscriptMessageResponse[]> {
  return request<TranscriptMessageResponse[]>(`/api/v1/runs/${runId}/transcript`, token, {
    method: 'GET',
  });
}

export async function getRunResult(token: string, runId: string): Promise<FinalOutputResponse> {
  return request<FinalOutputResponse>(`/api/v1/runs/${runId}/result`, token, { method: 'GET' });
}

export function createRunEventsSource(token: string, runId: string): EventSource {
  const url = `${API_BASE_URL}/api/v1/runs/${runId}/events?access_token=${encodeURIComponent(token)}`;
  return new EventSource(url);
}

export async function startConversation(
  token: string,
  payload: StartConversationRequest,
): Promise<ConversationResponse> {
  return request<ConversationResponse>('/api/v1/conversations/start', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendConversationMessage(
  token: string,
  sessionId: string,
  payload: SendMessageRequest,
): Promise<ConversationResponse> {
  return request<ConversationResponse>(`/api/v1/conversations/${sessionId}/message`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getConversation(
  token: string,
  sessionId: string,
): Promise<ConversationHistoryResponse> {
  return request<ConversationHistoryResponse>(`/api/v1/conversations/${sessionId}`, token, {
    method: 'GET',
  });
}

export async function generateProjectFromConversation(
  token: string,
  sessionId: string,
): Promise<ProjectResponse> {
  return request<ProjectResponse>(`/api/v1/conversations/${sessionId}/generate`, token, {
    method: 'POST',
  });
}

export interface CompletedDebateListItem {
  run_id: string;
  project_id: string;
  project_title: string;
  status: string;
  completed_at: string;
  actual_cost_cents: number;
  summary: string | null;
  verdict: string | null;
}

export interface FullDebateDetails {
  run: RunResponse;
  project_title: string;
  project_objective: string;
  agents: any[];
  flow: any[];
  transcript: TranscriptMessageResponse[];
  final_output: FinalOutputResponse | null;
}

export interface InProgressItem {
  id: string;
  type: 'conversation' | 'project' | 'run';
  title: string;
  stage: string;
  completeness: number;
  updated_at: string | null;
  status: string;
  project_id?: string;
  run_id?: string;
}

export async function listInProgressSessions(token: string): Promise<InProgressItem[]> {
  return request<InProgressItem[]>('/api/v1/sessions/in-progress', token, { method: 'GET' });
}

export async function getProject(token: string, projectId: string): Promise<ProjectResponse> {
  return request<ProjectResponse>(`/api/v1/projects/${projectId}`, token, { method: 'GET' });
}

export async function listCompletedDebates(
  token: string,
  limit: number = 50,
): Promise<CompletedDebateListItem[]> {
  return request<CompletedDebateListItem[]>(`/api/v1/runs/completed?limit=${limit}`, token, {
    method: 'GET',
  });
}

export async function getFullDebateDetails(
  token: string,
  runId: string,
): Promise<FullDebateDetails> {
  return request<FullDebateDetails>(`/api/v1/runs/${runId}/full`, token, {
    method: 'GET',
  });
}

export async function updateConversationTitle(
  token: string,
  sessionId: string,
  title: string,
): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/v1/conversations/${sessionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(token: string, sessionId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/v1/conversations/${sessionId}`, token, {
    method: 'DELETE',
  });
}

export async function updateProjectTitle(
  token: string,
  projectId: string,
  title: string,
): Promise<ProjectResponse> {
  return request<ProjectResponse>(`/api/v1/projects/${projectId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteProject(token: string, projectId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/v1/projects/${projectId}`, token, {
    method: 'DELETE',
  });
}

export async function deleteRun(token: string, runId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/v1/runs/${runId}`, token, {
    method: 'DELETE',
  });
}

// --- Expert Templates ---

export async function saveAgentAsTemplate(
  token: string,
  runId: string,
  payload: { agent_index: number; decision_domains: string[]; performance_note: string },
): Promise<ExpertTemplateResponse> {
  return request<ExpertTemplateResponse>(`/api/v1/runs/${runId}/save-agent-as-template`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createExpertAgent(
  token: string,
  payload: {
    name: string;
    role: string;
    purpose: string;
    instructions: string;
    tone: string;
    model_provider: string;
    model_name: string;
    decision_domains: string[];
    performance_note?: string;
  },
): Promise<ExpertTemplateResponse> {
  return request<ExpertTemplateResponse>('/api/v1/expert-templates/create', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listExpertTemplates(
  token: string,
  domain?: string,
): Promise<ExpertTemplateListResponse> {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  return request<ExpertTemplateListResponse>(`/api/v1/expert-templates${query}`, token, {
    method: 'GET',
  });
}

export async function getExpertTemplate(
  token: string,
  templateId: string,
): Promise<ExpertTemplateResponse> {
  return request<ExpertTemplateResponse>(`/api/v1/expert-templates/${templateId}`, token, {
    method: 'GET',
  });
}

export async function updateExpertTemplate(
  token: string,
  templateId: string,
  payload: Partial<Pick<ExpertTemplateResponse, 'name' | 'role' | 'purpose' | 'instructions' | 'tone' | 'model_provider' | 'model_name' | 'decision_domains' | 'performance_note'>>,
): Promise<ExpertTemplateResponse> {
  return request<ExpertTemplateResponse>(`/api/v1/expert-templates/${templateId}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteExpertTemplate(
  token: string,
  templateId: string,
): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/v1/expert-templates/${templateId}`, token, {
    method: 'DELETE',
  });
}

export async function rateExpertTemplate(
  token: string,
  templateId: string,
  runId: string,
  payload: { was_helpful: boolean; feedback_note?: string },
): Promise<ExpertTemplateResponse> {
  return request<ExpertTemplateResponse>(
    `/api/v1/expert-templates/${templateId}/rate?run_id=${encodeURIComponent(runId)}`,
    token,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function suggestExpertTemplates(
  token: string,
  domain: string,
): Promise<ExpertTemplateResponse[]> {
  return request<ExpertTemplateResponse[]>(`/api/v1/expert-templates/suggest/${encodeURIComponent(domain)}`, token, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// MAGDM Decision Engine API
// ---------------------------------------------------------------------------

export async function createDecisionSession(
  token: string,
  payload: { title: string; problem_statement: string; domain?: string },
): Promise<DecisionSessionResponse> {
  return request<DecisionSessionResponse>('/api/v1/decisions', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listDecisionSessions(token: string): Promise<DecisionSessionResponse[]> {
  return request<DecisionSessionResponse[]>('/api/v1/decisions', token, { method: 'GET' });
}

export async function getDecisionSession(token: string, sessionId: string): Promise<DecisionSessionDetail> {
  return request<DecisionSessionDetail>(`/api/v1/decisions/${sessionId}`, token, { method: 'GET' });
}

export async function updateDecisionSession(
  token: string,
  sessionId: string,
  payload: { title?: string; problem_statement?: string; domain?: string; mode?: string; status?: string },
): Promise<DecisionSessionResponse> {
  return request<DecisionSessionResponse>(`/api/v1/decisions/${sessionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDecisionSession(token: string, sessionId: string): Promise<void> {
  await request<void>(`/api/v1/decisions/${sessionId}`, token, { method: 'DELETE' });
}

export async function updateDecisionAlternatives(
  token: string,
  sessionId: string,
  alternatives: Array<{ label: string; description?: string }>,
): Promise<DecisionAlternative[]> {
  return request<DecisionAlternative[]>(`/api/v1/decisions/${sessionId}/alternatives`, token, {
    method: 'PUT',
    body: JSON.stringify({ alternatives }),
  });
}

export async function updateDecisionCriteria(
  token: string,
  sessionId: string,
  criteria: Array<{ name: string; description?: string; direction: 'benefit' | 'cost'; weight: number }>,
): Promise<DecisionCriterion[]> {
  return request<DecisionCriterion[]>(`/api/v1/decisions/${sessionId}/criteria`, token, {
    method: 'PUT',
    body: JSON.stringify({ criteria }),
  });
}

export async function updateDecisionExperts(
  token: string,
  sessionId: string,
  experts: Array<{ name: string; role: string; description?: string; weight?: number; expert_type?: string; agent_config?: Record<string, unknown> }>,
): Promise<DecisionExpert[]> {
  return request<DecisionExpert[]>(`/api/v1/decisions/${sessionId}/experts`, token, {
    method: 'PUT',
    body: JSON.stringify({ experts }),
  });
}

export async function runDecisionEvaluation(token: string, sessionId: string): Promise<RankingResult> {
  return request<RankingResult>(`/api/v1/decisions/${sessionId}/evaluate`, token, { method: 'POST' });
}

export async function suggestAlternatives(
  token: string,
  problemStatement: string,
  domain: string,
  existing?: string[],
): Promise<Array<{ label: string; description: string }>> {
  const res = await request<{ alternatives: Array<{ label: string; description: string }> }>(
    '/api/v1/decisions/suggest/alternatives',
    token,
    { method: 'POST', body: JSON.stringify({ problem_statement: problemStatement, domain, existing_alternatives: existing ?? [] }) },
  );
  return res.alternatives;
}

export async function suggestCriteria(
  token: string,
  problemStatement: string,
  domain: string,
  alternatives?: string[],
  existingCriteria?: string[],
): Promise<Array<{ name: string; description: string; direction: string; weight: number }>> {
  const res = await request<{ criteria: Array<{ name: string; description: string; direction: string; weight: number }> }>(
    '/api/v1/decisions/suggest/criteria',
    token,
    { method: 'POST', body: JSON.stringify({ problem_statement: problemStatement, domain, alternatives: alternatives ?? [], existing_criteria: existingCriteria ?? [] }) },
  );
  return res.criteria;
}

export async function suggestExperts(
  token: string,
  problemStatement: string,
  domain: string,
  criteria?: string[],
): Promise<Array<{ name: string; role: string; description: string }>> {
  const res = await request<{ experts: Array<{ name: string; role: string; description: string }> }>(
    '/api/v1/decisions/suggest/experts',
    token,
    { method: 'POST', body: JSON.stringify({ problem_statement: problemStatement, domain, criteria: criteria ?? [] }) },
  );
  return res.experts;
}
