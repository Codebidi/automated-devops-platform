import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  Rocket,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Tooltip } from './ui';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('deployhub_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('deployhub_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Pipeline Runs', path: '/app/runs', icon: PlayCircle },
    { name: 'Deployments', path: '/app/deployments', icon: Rocket },
  ];

  const adminItems = [
    { name: 'Users & Roles', path: '/app/users', icon: Users },
    { name: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout(true);
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="main-sidebar"
        aria-label="Main Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-glow-brand shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in overflow-hidden truncate">
                <span className="font-heading font-extrabold text-sm text-white block leading-tight truncate">
                  DeployHub
                </span>
                <span className="text-[10px] font-mono text-brand-400 block tracking-wider uppercase truncate">
                  v2.4 Production
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {/* Main Workspace Navigation */}
          <div>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                Workspace
              </div>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/app'}
                    onClick={() => onClose && onClose()}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-brand text-white shadow-glow-brand font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        {!isCollapsed && <span>{item.name}</span>}
                        {/* Active indicator bar */}
                        {isActive && !isCollapsed && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Admin Management Section */}
          {isAdmin && (
            <div>
              {!isCollapsed && (
                <div className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Administration
                </div>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose && onClose()}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-brand text-white shadow-glow-brand font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          {!isCollapsed && <span>{item.name}</span>}
                          {isActive && !isCollapsed && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
          >
            <Avatar
              name={user?.full_name || user?.username || 'Admin'}
              role={user?.role}
              size="sm"
            />

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-heading font-semibold text-white truncate">
                  {user?.full_name || user?.username || 'Operator'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={user?.role || 'viewer'} size="sm">
                    {(user?.role || 'VIEWER').toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}

            {!isCollapsed && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Sign out of console"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
