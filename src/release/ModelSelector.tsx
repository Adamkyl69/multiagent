import React from 'react';

export interface ModelOption {
  provider: string;
  model: string;
  label: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    description: 'Best for complex reasoning and long context',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for most tasks',
  },
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash (Experimental)',
    description: 'Latest experimental model with enhanced capabilities',
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    label: 'GPT-4o',
    description: 'OpenAI flagship multimodal model',
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Affordable and fast OpenAI model',
  },
  {
    provider: 'openai',
    model: 'o1',
    label: 'o1',
    description: 'Advanced reasoning model for complex problems',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    description: 'Anthropic best model for most tasks',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    description: 'Fast and cost-effective Claude model',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    description: 'Most capable Claude model for hard tasks',
  },
  {
    provider: 'xai',
    model: 'grok-beta',
    label: 'Grok Beta',
    description: 'X.AI conversational reasoning model',
  },
  {
    provider: 'xai',
    model: 'grok-vision-beta',
    label: 'Grok Vision Beta',
    description: 'X.AI multimodal model with vision',
  },
];

interface ModelSelectorProps {
  value: { provider: string; model: string };
  onChange: (provider: string, model: string) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const selectedOption = AVAILABLE_MODELS.find(
    (option) => option.provider === value.provider && option.model === value.model,
  );

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Reasoning Model</div>
      <select
        value={selectedOption ? `${selectedOption.provider}:${selectedOption.model}` : ''}
        onChange={(event) => {
          const [provider, model] = event.target.value.split(':');
          if (provider && model) {
            onChange(provider, model);
          }
        }}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500"
      >
        {AVAILABLE_MODELS.map((option) => (
          <option key={`${option.provider}:${option.model}`} value={`${option.provider}:${option.model}`}>
            {option.label} — {option.description}
          </option>
        ))}
      </select>
      {selectedOption && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Provider</span>
            <span className="font-bold text-slate-200 uppercase">{selectedOption.provider}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span>Model ID</span>
            <span className="font-mono text-slate-200">{selectedOption.model}</span>
          </div>
        </div>
      )}
    </div>
  );
}
