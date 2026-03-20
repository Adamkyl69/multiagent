import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

import { ApiError, evaluatePrompt, generateProject } from './api';
import type { ProjectResponse, PromptIntakeAssessment } from './types';

interface HomeScreenProps {
  token: string;
  onProjectGenerated: (project: ProjectResponse) => void;
}

export default function HomeScreen({ token, onProjectGenerated }: HomeScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [assessment, setAssessment] = useState<PromptIntakeAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<'idle' | 'evaluating' | 'generating'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    if (!assessment) {
      return false;
    }
    if (assessment.status !== 'needs_clarification') {
      return true;
    }
    return assessment.clarification_questions.every((question) => (answers[question.key] ?? '').trim().length > 0);
  }, [answers, assessment]);

  async function handleEvaluate() {
    if (!prompt.trim()) {
      return;
    }
    setLoading('evaluating');
    setError(null);
    try {
      const nextAssessment = await evaluatePrompt(token, {
        prompt,
        clarification_answers: answers,
      });
      setAssessment(nextAssessment);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to evaluate prompt.';
      setError(message);
    } finally {
      setLoading('idle');
    }
  }

  async function handleGenerate(forceGenerateWithAssumptions = false) {
    if (!prompt.trim()) {
      return;
    }
    setLoading('generating');
    setError(null);
    try {
      const project = await generateProject(token, {
        prompt,
        clarification_answers: answers,
        force_generate_with_assumptions: forceGenerateWithAssumptions,
      });
      onProjectGenerated(project);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        const detail = caught.detail as { assessment?: PromptIntakeAssessment } | null;
        if (detail?.assessment) {
          setAssessment(detail.assessment);
        }
      }
      const message = caught instanceof Error ? caught.message : 'Unable to generate project.';
      setError(message);
    } finally {
      setLoading('idle');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-indigo-200">
            <Sparkles className="w-4 h-4" />
            Prompt-to-project orchestration
          </div>
          <h1 className="text-5xl font-black tracking-tight max-w-4xl">Create a real multi-agent debate from a plain-language request.</h1>
          <p className="text-slate-400 max-w-3xl text-lg">The backend will scope your request, ask for clarification if needed, generate a project draft, and launch a streamed debate run with billable usage tracking.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setAssessment(null);
              }}
              placeholder="Create a decision debate for whether avocado consumption is good for people over 40."
              className="min-h-[200px] w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-base outline-none focus:border-indigo-500"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={loading !== 'idle' || !prompt.trim()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-100 hover:border-indigo-500 disabled:opacity-50"
              >
                {loading === 'evaluating' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Evaluate prompt
              </button>
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={loading !== 'idle' || !prompt.trim() || (!!assessment && !canGenerate)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Generate project draft
              </button>
              {assessment?.status === 'generate_with_assumptions' && (
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={loading !== 'idle'}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm font-bold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Generate with assumptions
                </button>
              )}
            </div>

            {error && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

            {assessment?.clarification_questions.length ? (
              <div className="mt-6 space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  Clarification required
                </div>
                {assessment.clarification_questions.map((question) => (
                  <label key={question.key} className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-200">{question.question}</span>
                    <span className="block text-xs text-slate-500">{question.rationale}</span>
                    <input
                      value={answers[question.key] ?? ''}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Intake status</h2>
              {assessment ? (
                <div className="mt-4 space-y-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-indigo-200">{assessment.status.replaceAll('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Domain</span>
                    <span className="text-slate-400">{assessment.domain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Prompt quality</span>
                    <span className="text-slate-400">{assessment.prompt_quality_score}/100</span>
                  </div>
                  {assessment.is_high_risk ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
                      Sensitive domain detected. Final output should be reviewed before operational use.
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Evaluate your prompt to inspect scope, risks, and clarification requirements.</p>
              )}
            </div>

            {assessment?.warnings.length ? (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </div>
                <ul className="mt-4 space-y-3 text-sm text-amber-50">
                  {assessment.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {assessment?.assumptions.length ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Current assumptions</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {assessment.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
