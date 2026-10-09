import React from 'react';
import { RotateCcw, CheckCircle2, Server, GitCommit, User, Calendar, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatSha } from '../utils/formatters';

export default function DeploymentTimeline({ deployments = [], onInitiateRollback }) {
  if (!deployments || deployments.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        No deployment history recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {deployments.map((item, idx) => {
        const isCurrent = item.isCurrentLive;

        return (
          <div key={item.runId} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isCurrent
                  ? 'bg-emerald-500 border-white dark:border-slate-950 ring-4 ring-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}
              aria-hidden="true"
            >
              {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>

            {/* Deployment Card */}
            <div
              className={`p-5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-white dark:bg-slate-900 border-emerald-500/60 dark:border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {item.imageTag || `image:${formatSha(item.commitSha)}`}
                  </span>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Currently Active
                    </span>
                  ) : (
                    <StatusBadge status="success" size="sm" />
                  )}
                </div>

                {/* Rollback Action Button */}
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => onInitiateRollback(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-950/50 dark:hover:text-amber-200 border border-slate-200 dark:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-label={`Rollback deployment to commit ${formatSha(item.commitSha)}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Rollback to this version
                  </button>
                )}
              </div>

              {/* Commit info */}
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                {item.commitMessage}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <GitCommit className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {formatSha(item.commitSha)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {item.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {item.timestamp}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
