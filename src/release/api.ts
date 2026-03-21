import { API_BASE_URL } from '../lib/env';
import type {
  AuthMeResponse,
  ClarificationRequiredResponse,
  FinalOutputResponse,
  ProjectResponse,
  PromptIntakeAssessment,
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
