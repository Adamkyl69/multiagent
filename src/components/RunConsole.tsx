import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Settings, 
  CheckCircle, 
  CircleDot, 
  Circle, 
  FileText, 
  Database, 
  Globe,
  Info,
  Target,
  Zap,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Scale,
  ArrowRight,
  Bot,
  History,
  TrendingUp,
  Pause,
  Play,
  Download,
  Users2
} from 'lucide-react';

const RunConsole = () => {
  const [isPaused, setIsPaused] = useState(false);
  
  const agents = [
    { name: 'Dietician', role: 'Nutrition', status: 'WAITING', stance: 'Supportive', color: 'bg-emerald-500' },
    { name: 'Medical Doctor', role: 'GP', status: 'SPEAKING', stance: 'Neutral', color: 'bg-blue-500' },
    { name: 'Cardiologist', role: 'Heart', status: 'CHALLENGED', stance: 'Cautious', color: 'bg-indigo-500' },
    { name: 'Research Skeptic', role: 'Reviewer', status: 'COMPLETED', stance: 'Critical', color: 'bg-red-500' },
    { name: 'Moderator', role: 'Synthesis', status: 'WAITING', stance: 'Neutral', color: 'bg-slate-500' },
  ];

  const messages = [
    {
      id: 1,
      type: 'SYSTEM',
      content: 'System created 5 agents from your prompt.',
      time: '10:00 AM'
    },
    {
      id: 2,
      type: 'SYSTEM',
      content: 'System moved debate to Phase 2: Evidence Review.',
      time: '10:01 AM'
    },
    {
      id: 3,
      speaker: 'Dietician',
      role: 'Nutrition',
      target: 'All',
      type: 'Evidence',
      phase: 'Evidence Review',
      content: 'Population-level nutrition data suggests avocado intake supports lipid balance, specifically improving HDL/LDL ratios in adults over 40.',
      time: '10:02 AM'
    },
    {
      id: 4,
      speaker: 'Cardiologist',
      role: 'Heart',
      target: 'Dietician',
      type: 'Challenge',
      phase: 'Evidence Review',
      content: 'While lipid balance is key, we must account for the caloric density. For sedentary adults over 40, does the fat profile outweigh the risk of weight gain?',
      time: '10:04 AM'
    },
    {
      id: 5,
      type: 'SYSTEM',
      content: 'System selected Medical Doctor to respond to Cardiologist\'s challenge.',
      time: '10:05 AM'
    },
    {
      id: 6,
      speaker: 'Medical Doctor',
      role: 'GP',
      target: 'Cardiologist',
      type: 'Answer',
      phase: 'Evidence Review',
      content: 'In my practice, we see better compliance with whole-food fats like avocados compared to processed alternatives. The satiety factor often prevents overeating elsewhere.',
      time: '10:06 AM'
    }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Avocado Consumption for Adults Over 40</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live Debate
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-medium text-slate-500">Phase: Evidence Review</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase text-slate-400">Next Speaker</span>
              <span className="text-xs font-bold text-indigo-600">Research Skeptic</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400">Active Phase</span>
              <span className="text-xs font-bold text-slate-900">Evidence Review</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center justify-center rounded-xl h-9 px-4 bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors gap-2"
            >
              {isPaused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
            </button>
            <button className="flex items-center justify-center rounded-xl h-9 px-4 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
              Stop & Synthesize
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Agent Panel */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              Participants
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {agents.map((agent, i) => (
              <div key={i} className={`p-3 rounded-xl border transition-all ${agent.status === 'SPEAKING' ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${agent.color} flex items-center justify-center text-white font-bold text-xs`}>
                      {agent.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">{agent.role}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Stance</span>
                    <span className="text-[11px] font-bold text-slate-700">{agent.stance}</span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    agent.status === 'SPEAKING' ? 'bg-indigo-600 text-white animate-pulse' :
                    agent.status === 'CHALLENGED' ? 'bg-red-100 text-red-700' :
                    agent.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel: Debate Transcript */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              msg.type === 'SYSTEM' ? (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-slate-200/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-4 max-w-4xl mx-auto group">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                    msg.type === 'Challenge' ? 'bg-red-50 border-red-100 text-red-600' :
                    msg.type === 'Evidence' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                    'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {msg.type === 'Challenge' ? <AlertTriangle className="w-5 h-5" /> :
                     msg.type === 'Evidence' ? <FileText className="w-5 h-5" /> :
                     <MessageSquare className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{msg.speaker}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">@{msg.target}</span>
                        <span className="text-[10px] text-slate-400 font-medium ml-2">{msg.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          msg.type === 'Challenge' ? 'bg-red-50 text-red-700 border-red-100' :
                          msg.type === 'Evidence' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {msg.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {msg.phase}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-sm leading-relaxed text-slate-700 group-hover:border-indigo-200 transition-colors">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
          
          {/* Live Input (Optional/Status) */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-500 italic">Medical Doctor is typing response to Cardiologist...</span>
              </div>
              <button className="h-12 px-6 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Inject Human Prompt
              </button>
            </div>
          </div>
        </main>

        {/* Right Panel: Debate State */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Debate State
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Consensus Level</span>
                <span className="text-sm font-black text-indigo-600">62%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: '62%' }}></div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Disagreements</h4>
              <div className="space-y-3">
                {[
                  { topic: 'Caloric Density', status: 'Active' },
                  { topic: 'Compliance vs Risk', status: 'Resolved' }
                ].map((d, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{d.topic}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${d.status === 'Active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolving Summary</h4>
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Current consensus leans towards beneficial status due to lipid profile improvements, though concerns regarding caloric management for sedentary lifestyles remain a primary point of debate."
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-300"></div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">3 agents agree</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unresolved Questions</h4>
              <ul className="space-y-2">
                {[
                  "Impact on non-metabolic patients?",
                  "Long-term satiety metrics?"
                ].map((q, i) => (
                  <li key={i} className="text-xs text-slate-600 flex gap-2">
                    <span className="text-indigo-400 font-bold">•</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" />
              Export Live Data
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RunConsole;
