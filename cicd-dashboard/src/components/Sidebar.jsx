import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlayCircle, Rocket, Settings, GitBranch, X, ShieldCheck } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Pipeline Runs', path: '/runs', icon: PlayCircle },
  { name: 'Deployments', path: '/deployments', icon: Rocket },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="main-sidebar"
        aria-label="Main Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
              CI
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white block leading-tight">
                DevOps Platform
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                v2.4 &bull; AWS EC2
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Repository status card in sidebar footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              <span>CI/CD Engine Active</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Automated polling: 10s
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
