import React from 'react';
import { Link } from 'react-router-dom';
import {
  GitCommit,
  GitPullRequest,
  GitBranch,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Badge, EmptyState } from './ui';
import { formatSha } from '../utils/formatters';

export default function RunsTable({ runs = [], compact = false }) {
  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        title="No Pipeline Runs"
        description="No pipeline execution matches the specified filter or criteria."
      />
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <Badge
            variant="success"
            size="sm"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          >
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="danger"
            size="sm"
            icon={<XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
          >
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge
            variant="brand"
            size="sm"
            icon={<Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600 dark:text-brand-400" />}
          >
            Running
          </Badge>
        );
      default:
        return (
          <Badge
            variant="warning"
            size="sm"
            icon={<AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
          >
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border-subtle bg-surface dark:bg-surface-elevated shadow-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-subtle bg-surface-subtle/80 dark:bg-surface-subtle/40 backdrop-blur-sm text-content-secondary font-semibold uppercase tracking-wider text-[11px]">
            <th scope="col" className="py-3.5 px-4">Run</th>
            <th scope="col" className="py-3.5 px-4">Commit</th>
            <th scope="col" className="py-3.5 px-4">Branch</th>
            <th scope="col" className="py-3.5 px-4">Trigger</th>
            <th scope="col" className="py-3.5 px-4">Status</th>
            <th scope="col" className="py-3.5 px-4">Duration</th>
            <th scope="col" className="py-3.5 px-4">Started</th>
            <th scope="col" className="py-3.5 px-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {runs.map((run) => {
            const isPr = run.trigger === 'pull_request';

            return (
              <tr
                key={run.id}
                className="group hover:bg-surface-subtle/50 transition-colors"
              >
                {/* Run Number */}
                <td className="py-3.5 px-4 font-mono font-bold text-content-primary whitespace-nowrap">
                  <Link
                    to={`/app/runs/${run.id}`}
                    className="hover:text-brand-500 transition-colors"
                  >
                    #{run.runNumber}
                  </Link>
                </td>

                {/* Commit Message & SHA */}
                <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                  <div className="flex flex-col">
                    <Link
                      to={`/app/runs/${run.id}`}
                      className="font-medium text-content-primary line-clamp-1 group-hover:text-brand-500 transition-colors"
                    >
                      {run.commitMessage}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-content-muted font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-content-muted" />
                        {formatSha(run.commitSha)}
                      </span>
                      <span>•</span>
                      <span>{run.author}</span>
                    </div>
                  </div>
                </td>

                {/* Branch */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-subtle text-content-secondary border border-border-subtle">
                    <GitBranch className="w-3 h-3 text-brand-500" />
                    {run.branch}
                  </span>
                </td>

                {/* Trigger */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-content-secondary">
                    {isPr ? (
                      <>
                        <GitPullRequest className="w-3 h-3 text-purple-500" />
                        Pull Request
                      </>
                    ) : (
                      <>
                        <GitCommit className="w-3 h-3 text-brand-500" />
                        Push
                      </>
                    )}
                  </span>
                </td>

                {/* Status with icon and text */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {getStatusBadge(run.status)}
                </td>

                {/* Duration */}
                <td className="py-3.5 px-4 font-mono text-content-secondary whitespace-nowrap">
                  {run.durationFormatted}
                </td>

                {/* Started Timestamp */}
                <td className="py-3.5 px-4 text-content-muted font-mono whitespace-nowrap text-[11px]">
                  {run.startedAt ? new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>

                {/* Action Link */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link
                    to={`/app/runs/${run.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
