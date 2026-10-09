import React from 'react';
import { Link } from 'react-router-dom';
import { GitCommit, GitPullRequest, GitBranch, ArrowRight, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatSha } from '../utils/formatters';

export default function RunsTable({ runs = [], compact = false }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        No pipeline runs match the criteria.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th scope="col" className="py-3 px-4">Run #</th>
            <th scope="col" className="py-3 px-4">Commit</th>
            <th scope="col" className="py-3 px-4">Branch</th>
            <th scope="col" className="py-3 px-4">Trigger</th>
            <th scope="col" className="py-3 px-4">Status</th>
            <th scope="col" className="py-3 px-4">Duration</th>
            <th scope="col" className="py-3 px-4">Started</th>
            <th scope="col" className="py-3 px-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {runs.map((run) => {
            const isPr = run.trigger === 'pull_request';

            return (
              <tr
                key={run.id}
                className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Run # */}
                <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                  <Link
                    to={`/runs/${run.id}`}
                    className="hover:text-sky-600 dark:hover:text-sky-400 focus-visible:outline-none focus-visible:underline"
                  >
                    #{run.runNumber}
                  </Link>
                </td>

                {/* Commit SHA & Message */}
                <td className="py-3 px-4 max-w-xs md:max-w-md">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {run.commitMessage}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {formatSha(run.commitSha)}
                      </span>
                      <span>&bull;</span>
                      <span>{run.author}</span>
                    </div>
                  </div>
                </td>

                {/* Branch */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    <GitBranch className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    {run.branch}
                  </span>
                </td>

                {/* Trigger */}
                <td className="py-3 px-4 whitespace-nowrap">
                  {isPr ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                        <GitPullRequest className="w-3 h-3" aria-hidden="true" />
                        PR #{run.prNumber || ''}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Tests only, no deploy
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <GitCommit className="w-3 h-3" aria-hidden="true" />
                      Push
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={run.status} size="sm" />
                </td>

                {/* Duration */}
                <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    {run.durationFormatted}
                  </span>
                </td>

                {/* Started */}
                <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {run.startedAt}
                </td>

                {/* Details link */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <Link
                    to={`/runs/${run.id}`}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded p-1"
                    aria-label={`View details for run #${run.runNumber}`}
                  >
                    <span className="sr-only">Details</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
