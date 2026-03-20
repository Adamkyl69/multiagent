import type { ProjectResponse } from './types';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  metadata?: {
    quick_replies?: string[];
    suggestions?: {
      agents?: Array<{
        name: string;
        role: string;
        reason: string;
      }>;
    };
  };
  created_at: string;
}

export type { ProjectResponse };

export interface CollectedContext {
  topic?: string;
  decision_makers?: string[];
  constraints?: Record<string, string>;
  goals?: string[];
  agents?: Array<{
    name: string;
    role: string;
    confirmed: boolean;
  }>;
  flow?: {
    rounds?: number;
    phases?: string[];
  };
  stage: string;
  completeness: number;
}

export interface ConversationResponse {
  session_id: string;
  message: ConversationMessage;
  context: CollectedContext;
  can_generate: boolean;
}

export interface ConversationHistoryResponse {
  session_id: string;
  status: string;
  messages: ConversationMessage[];
  context: CollectedContext;
  can_generate: boolean;
}

export interface StartConversationRequest {
  initial_message: string;
}

export interface SendMessageRequest {
  content: string;
}
