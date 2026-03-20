import React, { useEffect, useRef, useState } from 'react';
import {
  generateProjectFromConversation,
  sendConversationMessage,
  startConversation,
} from './api';
import type {
  CollectedContext,
  ConversationMessage,
  ConversationResponse,
  ProjectResponse,
} from './conversationTypes';

interface ChatInterfaceProps {
  token: string;
  onProjectGenerated: (project: ProjectResponse) => void;
}

export default function ChatInterface({ token, onProjectGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<CollectedContext | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStart = async (initialMessage: string) => {
    if (!token || !initialMessage.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await startConversation(token, {
        initial_message: initialMessage,
      });

      setSessionId(response.session_id);
      setMessages([
        { id: 'user-initial', role: 'user', content: initialMessage, created_at: new Date().toISOString() },
        response.message,
      ]);
      setContext(response.context);
      setCanGenerate(response.can_generate);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!token || !sessionId || !input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
    ]);

    try {
      const response = await sendConversationMessage(token, sessionId, {
        content: userMessage,
      });

      setMessages((prev) => [...prev, response.message]);
      setContext(response.context);
      setCanGenerate(response.can_generate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleGenerate = async () => {
    if (!token || !sessionId || !canGenerate) return;

    setGenerating(true);
    setError(null);

    try {
      const project = await generateProjectFromConversation(token, sessionId);
      onProjectGenerated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project');
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sessionId) {
        handleSend();
      } else {
        handleStart(input);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                Let's build your debate project
              </h2>
              <p className="text-slate-400 mb-8">
                Tell me what decision you need to make, and I'll guide you through setting up the perfect debate.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.role === 'system' && msg.metadata?.quick_replies && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.metadata.quick_replies.map((reply) => (
                      <button
                        key={reply}
                        onClick={() => handleQuickReply(reply)}
                        className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full transition-colors"
                        disabled={loading}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {msg.role === 'system' && msg.metadata?.suggestions?.agents && (
                  <div className="mt-4 space-y-2">
                    {msg.metadata.suggestions.agents.map((agent, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded p-3 text-sm">
                        <div className="font-semibold text-blue-400">{agent.name}</div>
                        <div className="text-slate-300">{agent.role}</div>
                        <div className="text-slate-400 text-xs mt-1">{agent.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-400 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-700 p-4 bg-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={sessionId ? 'Type your message...' : 'What decision do you need to make?'}
              className="flex-1 bg-slate-700 text-slate-100 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || generating}
            />
            <button
              onClick={sessionId ? handleSend : () => handleStart(input)}
              disabled={!input.trim() || loading || generating}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="w-80 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Context</h3>

        {context && (
          <div className="space-y-4">
            {context.topic && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Topic</div>
                <div className="text-sm text-slate-200">{context.topic}</div>
              </div>
            )}

            {context.decision_makers && context.decision_makers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Decision Makers</div>
                <div className="text-sm text-slate-200">
                  {context.decision_makers.map((dm, idx) => (
                    <div key={idx}>• {dm}</div>
                  ))}
                </div>
              </div>
            )}

            {context.constraints && Object.keys(context.constraints).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Constraints</div>
                <div className="text-sm text-slate-200">
                  {Object.entries(context.constraints).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-slate-400">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {context.goals && context.goals.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Goals</div>
                <div className="text-sm text-slate-200">
                  {context.goals.map((goal, idx) => (
                    <div key={idx}>• {goal}</div>
                  ))}
                </div>
              </div>
            )}

            {context.agents && context.agents.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">
                  Agents ({context.agents.length})
                </div>
                <div className="text-sm text-slate-200 space-y-1">
                  {context.agents.map((agent, idx) => (
                    <div key={idx} className="text-xs">
                      • {agent.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {context.flow && context.flow.rounds && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Flow</div>
                <div className="text-sm text-slate-200">{context.flow.rounds} rounds</div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-700">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Completeness</div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${context.completeness}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1">{context.completeness}%</div>
            </div>

            {canGenerate && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
              >
                {generating ? 'Generating...' : 'Generate Project'}
              </button>
            )}
          </div>
        )}

        {!context && (
          <p className="text-sm text-slate-400">
            Start a conversation to see the collected context here.
          </p>
        )}
      </div>
    </div>
  );
}
