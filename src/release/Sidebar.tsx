import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  Star,
  FileText,
  BarChart2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  Play,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import { 
  listInProgressSessions, 
  listCompletedDebates, 
  getProject, 
  getRun, 
  updateConversationTitle,
  updateProjectTitle,
  deleteConversation,
  deleteProject,
  deleteRun,
  type InProgressItem, 
  type CompletedDebateListItem 
} from './api';
import type { ProjectResponse, RunResponse } from './types';

export interface RecentSession {
  id: string;
  title: string;
  status: 'debating' | 'framed' | 'ready' | 'completed' | 'running' | 'failed';
}

export type NavView = 'dashboard' | 'in-progress' | 'completed' | 'starred';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView: NavView;
  onNavChange: (view: NavView) => void;
  onNewDecision: () => void;
  onSignOut: () => void;
  email?: string;
  workspaceLabel?: string;
  recentSessions?: RecentSession[];
  token: string;
  onResumeConversation: (sessionId: string) => void;
  onResumeProject: (project: ProjectResponse) => void;
  onResumeRun: (project: ProjectResponse, run: RunResponse) => void;
}

const STATUS_COLORS: Record<RecentSession['status'], string> = {
  debating: '#CC5500',
  running: '#CC5500',
  framed: '#5B7E91',
  ready: '#5B7E91',
  completed: '#4caf7d',
  failed: '#e05252',
};

const STATUS_LABELS: Record<RecentSession['status'], string> = {
  debating: 'DEBATING',
  running: 'RUNNING',
  framed: 'FRAMED',
  ready: 'READY',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

const NAV_ITEMS: { id: NavView; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'DASHBOARD', Icon: LayoutDashboard },
  { id: 'in-progress', label: 'IN PROGRESS', Icon: Clock },
  { id: 'completed', label: 'COMPLETED', Icon: CheckCircle },
  { id: 'starred', label: 'STARRED', Icon: Star },
];

const STATIC_ITEMS: { label: string; Icon: React.ElementType }[] = [
  { label: 'SEARCH', Icon: Search },
  { label: 'TEMPLATES', Icon: FileText },
  { label: 'REPORTS', Icon: BarChart2 },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activeView,
  onNavChange,
  onNewDecision,
  onSignOut,
  email,
  workspaceLabel,
  recentSessions = [],
  token,
  onResumeConversation,
  onResumeProject,
  onResumeRun,
}: SidebarProps) {
  const [inProgressItems, setInProgressItems] = useState<InProgressItem[]>([]);
  const [loadingInProgress, setLoadingInProgress] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedDebateListItem[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [completedDisplayCount, setCompletedDisplayCount] = useState(6);
  const [inProgressDisplayCount, setInProgressDisplayCount] = useState(6);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; type: string; title: string } | null>(null);

  const sidebarBg = 'rgba(6,8,15,0.8)';
  const activeBg = 'rgba(99,102,241,0.12)';
  const hoverBg = 'rgba(255,255,255,0.05)';

  useEffect(() => {
    loadInProgressSessions();
    loadCompletedRuns();
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId) {
        const target = event.target as HTMLElement;
        // Don't close if clicking inside a menu
        if (!target.closest('.dropdown-menu')) {
          setOpenMenuId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  async function loadInProgressSessions() {
    setLoadingInProgress(true);
    try {
      const items = await listInProgressSessions(token);
      setInProgressItems(items);
    } catch (err) {
      console.error('Failed to load in-progress sessions:', err);
    } finally {
      setLoadingInProgress(false);
    }
  }

  async function loadCompletedRuns() {
    setLoadingCompleted(true);
    try {
      const items = await listCompletedDebates(token, 50);
      setCompletedItems(items);
    } catch (err) {
      console.error('Failed to load completed runs:', err);
    } finally {
      setLoadingCompleted(false);
    }
  }

  async function handleResumeCompleted(item: CompletedDebateListItem) {
    setResumingId(item.run_id);
    try {
      const [project, run] = await Promise.all([
        getProject(token, item.project_id),
        getRun(token, item.run_id),
      ]);
      onResumeRun(project, run);
    } catch (err) {
      console.error('Failed to resume completed run:', err);
    } finally {
      setResumingId(null);
    }
  }

  function handleEditClick(id: string, currentTitle: string, e: React.MouseEvent) {
    console.log('Edit clicked:', { id, currentTitle });
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
    setOpenMenuId(null);
  }

  async function handleSaveEdit(id: string, type: 'conversation' | 'project' | 'run') {
    try {
      if (type === 'conversation') {
        await updateConversationTitle(token, id, editingTitle);
        setInProgressItems(prev => prev.map(item => 
          item.id === id && item.type === 'conversation' ? { ...item, title: editingTitle } : item
        ));
      } else if (type === 'project') {
        await updateProjectTitle(token, id, editingTitle);
        setInProgressItems(prev => prev.map(item => 
          item.id === id && item.type === 'project' ? { ...item, title: editingTitle } : item
        ));
        setCompletedItems(prev => prev.map(item => 
          item.project_id === id ? { ...item, project_title: editingTitle } : item
        ));
      }
      setEditingId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  }

  function handleDeleteClick(id: string, type: string, title: string, e: React.MouseEvent) {
    console.log('Delete clicked:', { id, type, title });
    e.stopPropagation();
    setShowDeleteConfirm({ id, type, title });
    setOpenMenuId(null);
  }

  async function handleConfirmDelete() {
    if (!showDeleteConfirm) return;
    
    console.log('Delete confirm clicked:', showDeleteConfirm);
    
    try {
      const { id, type } = showDeleteConfirm;
      
      console.log(`Deleting ${type} with id:`, id);
      
      if (type === 'conversation') {
        await deleteConversation(token, id);
        setInProgressItems(prev => prev.filter(item => item.id !== id));
      } else if (type === 'project') {
        await deleteProject(token, id);
        setInProgressItems(prev => prev.filter(item => item.id !== id));
        setCompletedItems(prev => prev.filter(item => item.project_id !== id));
      } else if (type === 'run') {
        await deleteRun(token, id);
        setCompletedItems(prev => prev.filter(item => item.run_id !== id));
      }
      
      console.log('Delete successful');
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleResumeItem(item: InProgressItem) {
    setResumingId(item.id);
    try {
      if (item.type === 'conversation') {
        onResumeConversation(item.id);
      } else if (item.type === 'project' && item.project_id) {
        const project = await getProject(token, item.project_id);
        onResumeProject(project);
      } else if (item.type === 'run' && item.project_id && item.run_id) {
        const [project, run] = await Promise.all([
          getProject(token, item.project_id),
          getRun(token, item.run_id),
        ]);
        onResumeRun(project, run);
      }
      // Session resumed successfully
    } catch (err) {
      console.error('Failed to resume session:', err);
    } finally {
      setResumingId(null);
    }
  }

  const TYPE_ICONS: Record<string, React.ElementType> = {
    conversation: MessageSquare,
    project: Zap,
    run: Play,
  };

  const TYPE_COLORS: Record<string, string> = {
    conversation: '#5B7E91',
    project: '#CC5500',
    run: '#4caf7d',
  };

  return (
    <>
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: sidebarBg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        zIndex: 30,
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 16px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {/* Brand Icon */}
              <div style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366F1, #F97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                  <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
                  <path d="M12 7v4m0 0-4.5 6M12 11l4.5 6M7 18h10"/>
                </svg>
              </div>
              {/* Brand Name */}
              <span style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: '#F1F5F9',
                letterSpacing: '0.01em',
              }}>
                Decision Intelligence
              </span>
            </div>
            {/* Workspace Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 40,
              fontSize: 10.5,
              color: '#64748B',
              letterSpacing: '0.02em',
            }}>
              <span>{workspaceLabel ?? 'Dev Workspace'}</span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(249,115,22,0.15)',
                color: '#FB923C',
                border: '1px solid rgba(249,115,22,0.25)',
              }}>
                Trial
              </span>
            </div>
          </>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            flexShrink: 0,
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Decision button */}
      <div style={{ padding: collapsed ? '14px 10px' : '16px 16px 0' }}>
        <button
          onClick={onNewDecision}
          style={{
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: collapsed ? '10px' : '10px 16px',
            width: '100%',
            transition: 'all 200ms',
            boxShadow: '0 4px 20px rgba(249,115,22,0.3), 0 1px 3px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(249,115,22,0.45), 0 2px 6px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(249,115,22,0.3), 0 1px 3px rgba(0,0,0,0.4)';
          }}
          title="New Decision"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          {!collapsed && 'New Decision'}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflow: 'hidden auto', padding: collapsed ? '4px 6px' : '16px 16px 0' }}>
        {NAV_ITEMS.filter(item => item.id !== 'in-progress' && item.id !== 'completed').map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              title={label}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(99,102,241,0.2)' : 'none',
                borderRadius: 8,
                color: isActive ? '#A5B4FC' : '#475569',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                marginBottom: 2,
                transition: 'all 180ms',
              }}
              onMouseEnter={e => { 
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#F1F5F9';
                }
              }}
              onMouseLeave={e => { 
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              <Icon size={15} strokeWidth={1.8} />
              {!collapsed && label}
            </button>
          );
        })}

        {/* In Progress List */}
        {!collapsed && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ padding: '10px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>
              IN PROGRESS
            </div>
            {loadingInProgress ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Loading...
              </div>
            ) : inProgressItems.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                No active sessions
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 6, paddingRight: 6 }}>
                  {inProgressItems.slice(0, inProgressDisplayCount).map((item) => {
                  const isResuming = resumingId === item.id;
                  const isEditing = editingId === item.id;
                  const menuOpen = openMenuId === item.id;

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      style={{
                        position: 'relative',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 4,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { 
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        // Show the three-dot button on hover
                        const button = e.currentTarget.querySelector('.three-dot-button');
                        if (button) button.style.opacity = '1';
                      }}
                      onMouseLeave={e => { 
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        // Hide the three-dot button when not hovering
                        const button = e.currentTarget.querySelector('.three-dot-button');
                        if (button) button.style.opacity = '0';
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item.id, item.type as 'conversation' | 'project');
                            if (e.key === 'Escape') { setEditingId(null); setEditingTitle(''); }
                          }}
                          onBlur={() => handleSaveEdit(item.id, item.type as 'conversation' | 'project')}
                          autoFocus
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 3,
                            padding: '4px 6px',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 500,
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <>
                          {/* Status Dot */}
                          <div style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#22D3EE',
                            boxShadow: '0 0 6px rgba(34,211,238,0.6)',
                            flexShrink: 0,
                          }} />
                          <div
                            onClick={() => !isResuming && handleResumeItem(item)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: isResuming ? 'not-allowed' : 'pointer',
                              fontSize: 12.5,
                              fontWeight: 400,
                              color: '#64748B',
                            }}
                          >
                            {item.title}
                          </div>
                          <button
                            className="three-dot-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(menuOpen ? null : item.id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 4,
                              cursor: 'pointer',
                              color: 'rgba(255,255,255,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: 3,
                              opacity: 0, // Hidden by default
                              transition: 'opacity 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </>
                      )}
                      {menuOpen && (
                        <div
                          className="dropdown-menu"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 8,
                            marginTop: 4,
                            background: '#2d3748',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 1000,
                            minWidth: 140,
                          }}
                        >
                          <button
                            onClick={(e) => handleEditClick(item.id, item.title, e)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Edit2 size={12} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Pin feature coming soon!');
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Star size={12} />
                            Pin
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Archive feature coming soon!');
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.85)',
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <FileText size={12} />
                            Archive
                          </button>
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                          <button
                            onClick={(e) => handleDeleteClick(item.id, item.type, item.title, e)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: '#e05252',
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {inProgressItems.length > inProgressDisplayCount && (
                <div
                  onClick={() => setInProgressDisplayCount(prev => prev + 6)}
                  style={{
                    padding: '4px 12px',
                    marginTop: 4,
                    marginLeft: 6,
                    marginRight: 6,
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  }}
                >
                  Load more
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Completed List */}
        {!collapsed && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ padding: '10px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>
              COMPLETED
            </div>
            {loadingCompleted ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Loading...
              </div>
            ) : completedItems.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                No completed sessions
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 6, paddingRight: 6 }}>
                  {completedItems.slice(0, completedDisplayCount).map((item) => {
                    const isResuming = resumingId === item.run_id;
                    const isEditing = editingId === item.run_id;
                    const menuOpen = openMenuId === item.run_id;

                    return (
                      <div
                        key={item.run_id}
                        style={{
                          position: 'relative',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 8px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 4,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { 
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          // Show the three-dot button on hover
                          const button = e.currentTarget.querySelector('.three-dot-button');
                          if (button) button.style.opacity = '1';
                        }}
                        onMouseLeave={e => { 
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          // Hide the three-dot button when not hovering
                          const button = e.currentTarget.querySelector('.three-dot-button');
                          if (button) button.style.opacity = '0';
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item.project_id, 'project');
                              if (e.key === 'Escape') { setEditingId(null); setEditingTitle(''); }
                            }}
                            onBlur={() => handleSaveEdit(item.project_id, 'project')}
                            autoFocus
                            style={{
                              flex: 1,
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: 3,
                              padding: '4px 6px',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 500,
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <>
                            {/* Status Dot - Green for completed */}
                            <div style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: '#4ADE80',
                              boxShadow: '0 0 6px rgba(74,222,128,0.5)',
                              flexShrink: 0,
                            }} />
                            <div
                              onClick={() => !isResuming && handleResumeCompleted(item)}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: isResuming ? 'not-allowed' : 'pointer',
                                fontSize: 12.5,
                                fontWeight: 400,
                                color: '#64748B',
                              }}
                            >
                              {item.project_title}
                            </div>
                            <button
                              className="three-dot-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(menuOpen ? null : item.run_id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 4,
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 3,
                                opacity: 0, // Hidden by default
                                transition: 'opacity 0.12s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </>
                        )}
                        {menuOpen && (
                          <div
                            className="dropdown-menu"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 8,
                              marginTop: 4,
                              background: '#2d3748',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 6,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              zIndex: 1000,
                              minWidth: 140,
                            }}
                          >
                            <button
                              onClick={(e) => handleEditClick(item.run_id, item.project_title, e)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Edit2 size={12} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('Pin feature coming soon!');
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Star size={12} />
                              Pin
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                alert('Archive feature coming soon!');
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <FileText size={12} />
                              Archive
                            </button>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                            <button
                              onClick={(e) => handleDeleteClick(item.run_id, 'run', item.project_title, e)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#e05252',
                                fontSize: 11,
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,82,82,0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {completedItems.length > completedDisplayCount && (
                  <div
                    onClick={() => setCompletedDisplayCount(prev => prev + 6)}
                    style={{
                      padding: '4px 12px',
                      marginTop: 4,
                      marginLeft: 6,
                      marginRight: 6,
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    Load more
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

        {STATIC_ITEMS.map(({ label, Icon }) => (
          <button
            key={label}
            title={label}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent',
              border: 'none',
              borderLeft: '3px solid transparent',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              marginBottom: 2,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = hoverBg;
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            <Icon size={16} strokeWidth={1.8} />
            {!collapsed && label}
          </button>
        ))}
      </nav>

      {/* Footer: email + sign out */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: collapsed ? '12px 0' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8 }}>
        {!collapsed && email && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
        )}
        <button
          onClick={onSignOut}
          title="Sign out"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            flexShrink: 0,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
        onClick={() => setShowDeleteConfirm(null)}
      >
        <div
          style={{
            background: '#2d3748',
            borderRadius: 8,
            padding: '24px',
            maxWidth: 400,
            width: '90%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Delete {showDeleteConfirm.type}?
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong>{showDeleteConfirm.title}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              style={{
                padding: '8px 16px',
                background: '#e05252',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
