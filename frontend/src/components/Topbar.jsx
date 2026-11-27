import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  RefreshCw,
  GitBranch,
  ChevronRight,
  LogOut,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar, Badge } from './ui';

export default function Topbar({
  onToggleSidebar,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
  repoName = 'codebidi/ai-devops-platform',
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, backendMode } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Just now';

  // Compute breadcrumbs
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/app') return 'Dashboard';
    if (path.startsWith('/app/runs/')) return 'Run Details';
    if (path === '/app/runs') return 'Pipeline Runs';
    if (path === '/app/deployments') return 'Deployments & Rollback';
    if (path === '/app/users') return 'User Management';
    if (path === '/app/settings') return 'System Settings';
    return 'Console';
  };

  const handleLogout = () => {
    logout(true);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/85 dark:bg-canvas/85 backdrop-blur-md border-b border-border-subtle px-4 md:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-surface-subtle"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            to="/app"
            className="text-content-muted hover:text-content-primary transition-colors font-medium hidden sm:inline"
          >
            DeployHub
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted hidden sm:inline" />
          <span className="font-heading font-semibold text-content-primary">
            {getBreadcrumb()}
          </span>

          <span className="ml-2 hidden lg:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle text-content-secondary border border-border-subtle">
            <GitBranch className="w-3 h-3 text-brand-500" />
            main
          </span>

          {backendMode === 'mock' && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
              Demo data
            </span>
          )}
        </nav>
      </div>

      {/* Right: Live Polling Indicator, Theme Toggle, User Menu */}
      <div className="flex items-center gap-3">
        {/* Polling / Last Updated status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-content-secondary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] text-content-muted">
            Live:{' '}
            <strong className="font-mono font-medium text-content-secondary">
              {formattedTime}
            </strong>
          </span>
        </div>

        {/* Manual Refresh button */}
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-surface-subtle transition-colors"
          title="Refresh live data now"
          aria-label="Refresh pipeline runs now"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`}
          />
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-surface-subtle transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-subtle transition-colors focus:outline-none"
            aria-expanded={userMenuOpen}
            aria-label="Open user profile menu"
          >
            <Avatar
              name={user?.full_name || user?.username || 'Operator'}
              role={user?.role}
              size="sm"
            />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-surface dark:bg-surface-elevated border border-border-strong shadow-elevated z-50 animate-fade-up text-xs"
              onClick={() => setUserMenuOpen(false)}
            >
              <div className="p-2 border-b border-border-subtle mb-1">
                <p className="font-heading font-bold text-content-primary truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[11px] font-mono text-content-muted truncate">
                  @{user?.username}
                </p>
                <div className="mt-1.5">
                  <Badge variant={user?.role || 'viewer'} size="sm">
                    {(user?.role || 'VIEWER').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <Link
                to="/"
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-subtle text-content-secondary hover:text-content-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Landing Page</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Console</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
