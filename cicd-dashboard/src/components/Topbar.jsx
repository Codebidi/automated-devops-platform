import React from 'react';
import { Menu, Sun, Moon, RefreshCw, GitBranch, Shield } from 'lucide-react';

export default function Topbar({
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
  repoName = 'codebidi/ai-devops-platform'
}) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Open navigation sidebar"
          aria-expanded={false}
          aria-controls="main-sidebar"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">
            {repoName}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <GitBranch className="w-3 h-3" aria-hidden="true" />
            main
          </span>
        </div>
      </div>

      {/* Right: Last updated, refresh button, dark mode toggle */}
      <div className="flex items-center gap-3">
        {/* Polling / Last Updated status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span>Updated: <strong className="font-mono font-medium text-slate-700 dark:text-slate-300">{formattedTime}</strong></span>
        </div>

        {/* Manual Refresh button */}
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Refresh pipeline data now"
          aria-label="Refresh pipeline runs now"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} aria-hidden="true" />
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
