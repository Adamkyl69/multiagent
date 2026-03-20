import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Layout, 
  Settings2, 
  Users2, 
  Zap, 
  FileText,
  ChevronRight,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FastForward,
  ShieldAlert
} from 'lucide-react';

interface HomeProps {
  onProjectCreated: (assumptions?: string[]) => void;
}

const Home: React.FC<HomeProps> = ({ onProjectCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [isHighRisk, setIsHighRisk] = useState(false);

  const clarificationQuestions = [
    {
      id: 1,
      question: "What is the primary target audience for this advice?",
      options: ["General Public", "Medical Professionals", "Policy Makers", "Patients Only"]
    },
    {
      id: 2,
      question: "Are there specific health conditions we should prioritize?",
      options: ["Diabetes", "Hypertension", "General Wellness", "Weight Management"]
    }
  ];

  const generationSteps = [
    "Interpreting your request...",
    "Analyzing debate domain and complexity...",
    "Proposing expert agent roster...",
    "Designing initial debate flow...",
    "Configuring system instructions...",
    "Finalizing project workspace..."
  ];

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationStep(prev => {
          if (prev >= generationSteps.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              // If we skipped clarification, we pass some default assumptions
              const assumptions = needsClarification ? [
                "Assuming general wellness focus without specific comorbidities",
                "Targeting general public over 40 rather than clinical specialists",
                "Prioritizing nutritional value over economic accessibility"
              ] : [];
              onProjectCreated(assumptions);
            }, 800);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, onProjectCreated, needsClarification]);

  const handleInitialSubmit = () => {
    if (!prompt.trim()) return;
    
    setIsEvaluating(true);
    
    // Simulate evaluation logic
    setTimeout(() => {
      setIsEvaluating(false);
      const riskKeywords = ['medical', 'legal', 'financial', 'avocado', 'health'];
      const isRisk = riskKeywords.some(k => prompt.toLowerCase().includes(k));
      setIsHighRisk(isRisk);
      
      // For demo purposes, we'll say it always needs some clarification if it's a short prompt
      if (prompt.length < 100) {
        setNeedsClarification(true);
      } else {
        setIsGenerating(true);
      }
    }, 1500);
  };

  const examples = [
    "Is avocado consumption healthy for people over 40?",
    "Create a launch decision board for a skincare app.",
    "Debate whether AI copilots are ready for legal teams.",
    "Should we price this product at $99 or $299?"
  ];

  if (isEvaluating) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-full h-full bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-xl">
              <Search className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Evaluating Intake Quality</h2>
            <p className="text-slate-500 text-sm">Analyzing topic depth and identifying required expertise...</p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (needsClarification) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom duration-500">
        <div className="max-w-2xl w-full space-y-8">
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Clarification Required</h3>
              <p className="text-xs text-amber-700">To create a high-fidelity debate, we need a bit more context on your topic.</p>
            </div>
            {isHighRisk && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <ShieldAlert className="w-3 h-3" />
                High Risk Domain
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clarificationQuestions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">{q.question}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => (
                    <button key={opt} className="text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button 
              onClick={() => setIsGenerating(true)}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <FastForward className="w-4 h-4" />
              Skip & Generate with Assumptions
            </button>
            <button 
              onClick={() => setIsGenerating(true)}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              Apply & Generate
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="min-h-full bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <Bot className="w-12 h-12 text-white animate-bounce" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Generating Your Project</h2>
            <p className="text-slate-400 text-sm font-medium">This usually takes about 10 seconds.</p>
          </div>

          <div className="space-y-4 text-left bg-slate-800/50 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
            {generationSteps.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i > generationStep ? 'opacity-20' : 'opacity-100'}`}>
                {i < generationStep ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : i === generationStep ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-700 shrink-0" />
                )}
                <span className={`text-sm font-bold ${i === generationStep ? 'text-white' : 'text-slate-400'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${((generationStep + 1) / generationSteps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="max-w-3xl w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Multi-Agent Orchestration
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">
            What would you like the agents to <span className="text-indigo-600">debate</span> or <span className="text-indigo-600">decide</span>?
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Describe your topic in plain language. We'll generate the experts, the logic, and the flow automatically.
          </p>
        </div>

        {/* Main Input */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-2">
            <div className="flex items-center gap-4 px-4 py-2">
              <MessageSquare className="w-6 h-6 text-slate-400" />
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Debate whether remote work improves productivity..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-slate-900 placeholder:text-slate-400 resize-none h-24 py-2"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                  <Settings2 className="w-3.5 h-3.5" />
                  Auto-Config
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                  <Users2 className="w-3.5 h-3.5" />
                  5 Agents
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                  <Zap className="w-3.5 h-3.5" />
                  Balanced
                </div>
              </div>
              <button 
                onClick={handleInitialSubmit}
                disabled={!prompt.trim()}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                Generate Project
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((ex, i) => (
            <button 
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
            >
              <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">{ex}</p>
            </button>
          ))}
        </div>

        {/* Secondary Content */}
        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Projects
            </h3>
            <div className="space-y-2">
              {["Skincare App Launch", "SaaS Expansion: Turkey"].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white cursor-pointer group transition-colors">
                  <span className="text-sm font-medium text-slate-700">{p}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Templates
            </h3>
            <div className="space-y-2">
              {["Risk Assessment", "Expert Panel", "Adversarial Debate"].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white cursor-pointer group transition-colors">
                  <span className="text-sm font-medium text-slate-700">{p}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Saved Presets
            </h3>
            <div className="space-y-2">
              {["Legal Team", "Medical Board", "Financial Audit"].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white cursor-pointer group transition-colors">
                  <span className="text-sm font-medium text-slate-700">{p}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
