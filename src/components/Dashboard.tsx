import React from 'react';
import { 
  Plus, 
  MoreVertical, 
  Play, 
  Clock, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock3,
  History,
  User,
  Filter,
  Calendar,
  ArrowRight,
  LayoutGrid,
  Rocket,
  Gavel
} from 'lucide-react';

const Dashboard = () => {
  const boards = [
    { 
      id: 1, 
      name: 'Market Entry Strategy', 
      description: "Autonomous agents analyzing competition, regulatory hurdles, and customer segments for APAC expansion.",
      owner: 'Alex Carter',
      version: 'v2.4.1',
      status: 'Run Healthy', 
      lastRun: '2 hours ago', 
      agents: 12, 
      phases: 4,
      type: 'Strategic',
      icon: <LayoutGrid className="w-6 h-6" />
    },
    { 
      id: 2, 
      name: 'Legal Compliance Audit', 
      description: "Compliance check agents cross-referencing new contract terms against updated regional laws.",
      owner: 'Sarah Chen',
      version: 'v1.0.5',
      status: 'Published', 
      lastRun: '1 day ago', 
      agents: 5, 
      phases: 5,
      type: 'Compliance',
      icon: <Gavel className="w-6 h-6" />
    },
    { 
      id: 3, 
      name: 'Product Roadmap Q3', 
      description: "Feature prioritization logic using stakeholder sentiment analysis and technical debt scoring.",
      owner: 'Alex Carter',
      version: 'v0.9.0',
      status: 'Draft', 
      lastRun: 'Never', 
      agents: 8, 
      phases: 3,
      type: 'Planning',
      icon: <Rocket className="w-6 h-6" />
    },
    { 
      id: 4, 
      name: 'Budget Allocation 2024', 
      description: "Financial forecasting and risk modeling for next year's operational expenses.",
      owner: 'Mike Ross',
      version: 'v3.2.0',
      status: 'Run Failed', 
      lastRun: '3 hours ago', 
      agents: 3, 
      phases: 2,
      type: 'Financial',
      icon: <FileText className="w-6 h-6" />
    }
  ];

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Run Healthy': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Run Failed': return 'bg-red-50 text-red-600 border-red-100';
      case 'Draft': return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'Archived': return 'bg-slate-100 text-slate-400 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Published': return <CheckCircle2 className="w-3 h-3" />;
      case 'Run Healthy': return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />;
      case 'Run Failed': return <AlertCircle className="w-3 h-3" />;
      case 'Draft': return <Clock3 className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Decision Boards</h2>
          <p className="text-slate-500 mt-1">Manage and monitor your multi-agent decision workflows.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Logs
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <div key={board.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col">
            <div className="p-5 border-b border-slate-50">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {board.icon}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${getStatusStyles(board.status)}`}>
                  {getStatusIcon(board.status)}
                  {board.status.toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{board.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{board.version}</span>
                <span className="text-[10px] text-slate-400">•</span>
                <span className="text-[10px] text-slate-500 font-medium">{board.type}</span>
              </div>
            </div>
            
            <div className="p-5 flex-1 space-y-4">
              <p className="text-slate-500 text-sm line-clamp-2">{board.description}</p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  <span>{board.owner}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last Run: {board.lastRun}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Users className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Agents</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{board.agents}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <FileText className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Phases</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{board.phases}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-50 mt-auto rounded-b-xl">
              <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
                <Play className="w-3 h-3" />
                Configure Board
              </button>
            </div>
          </div>
        ))}
        
        <button className="group border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all min-h-[280px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-500 group-hover:text-indigo-600">Create New Board</p>
          <p className="text-xs text-slate-400 mt-1">Start from a template or blank</p>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900">System Performance</h3>
          <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">Full Analytics</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Board Name</th>
                <th className="px-6 py-3">Success Rate</th>
                <th className="px-6 py-3">Avg Response</th>
                <th className="px-6 py-3">Active Agents</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr>
                <td className="px-6 py-4 font-medium text-slate-900">Supply Chain Optimizer</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full w-24">
                      <div className="h-full bg-indigo-600 rounded-full w-[94%]"></div>
                    </div>
                    <span>94%</span>
                  </div>
                </td>
                <td className="px-6 py-4">1.2s</td>
                <td className="px-6 py-4">18</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Healthy
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-slate-900">Talent Acquisition AI</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full w-24">
                      <div className="h-full bg-indigo-600 rounded-full w-[82%]"></div>
                    </div>
                    <span>82%</span>
                  </div>
                </td>
                <td className="px-6 py-4">0.8s</td>
                <td className="px-6 py-4">6</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Throttled
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
