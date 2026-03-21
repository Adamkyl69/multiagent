import type { ProjectResponse } from './types';

export interface DecisionFrame {
  decision_statement: string;
  alternatives: string[];
  primary_objective: string;
  constraints: string[];
  evaluation_criteria: string[];
  timeline: string;
}

export interface DecisionClassification {
  decision_type: string;  // strategic, emotional, financial, creative, operational, ethical
  stakes: string;  // low, medium, high, critical
  decision_mode: string;  // comparison, prediction, prioritization, go_no_go
  complexity: string;  // simple, moderate, complex
  recommended_framework: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  metadata?: {
    quick_replies?: string[];
    suggestions?: Record<string, unknown>;
    decision_frame?: DecisionFrame;
    show_frame_confirmation?: boolean;
  };
  created_at: string;
}

export type { ProjectResponse };

export interface AgentInfo {
  name: string;
  role: string;
  stance?: string;
  key_focus?: string;
}

export interface CollectedContext {
  // Stage 1: Entry
  raw_question?: string;
  additional_context?: string;
  
  // Stage 2: Classification
  classification?: DecisionClassification;
  
  // Stage 3: Clarifications
  clarifications?: Record<string, string>;
  pending_questions?: string[];
  questions_asked?: number;
  
  // Stage 4: Decision frame
  decision_frame?: DecisionFrame;
  frame_confirmed?: boolean;
  
  // Stage 5: Agents
  agents?: AgentInfo[];
  
  // Flow control
  stage: string;  // entry, classification, clarification, frame, agents, ready
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
  context?: string;  // Optional additional context
}

export interface SendMessageRequest {
  content: string;
}
