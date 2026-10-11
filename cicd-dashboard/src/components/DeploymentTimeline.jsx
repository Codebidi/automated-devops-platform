import React from 'react';
import { RotateCcw, CheckCircle2, Server, GitCommit, User, Calendar, ExternalLink } from 'lucide-react';
import { Badge, Button, EmptyState } from './ui';
import { formatSha } from '../utils/formatters';

export default function DeploymentTimeline({
  deployments = [],
  onInitiateRollback,
  isAdmin = false,
}) {
  if (!deployments || deployments.length === 0) {
    return (
      <EmptyState
        title="No Deployment History"
        description="No container release events have been registered in the database yet."
      />
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-subtle">
      {deployments.map((item, idx) => {
        const isCurrent = item.isCurrentLive;

        return (
          <div key={item.runId} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isCurrent
                  ? 'bg-emerald-500 border-white dark:border-canvas ring-4 ring-emerald-500/20'
                  : 'bg-surface-subtle border-border-strong'
              }`}
              aria-hidden="true"
            >
              {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
            </div>

            {/* Deployment Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-surface dark:bg-surface-elevated border-emerald-500/60 dark:border-emerald-500/40 shadow-card ring-1 ring-emerald-500/20'
                  : 'bg-surface dark:bg-surface-elevated border-border-subtle hover:border-border-strong'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface-subtle text-content-primary border border-border-subtle">
                    {item.imageTag || `image:${formatSha(item.commitSha)}`}
                  </span>
                  {isCurrent ? (
                    <Badge variant="success" size="sm" dot>
                      LIVE DEPLOYMENT
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      ARCHIVED
                    </Badge>
                  )}
                </div>

                {/* Rollback Action Button (Admin Only, and not current) */}
                {!isCurrent && isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInitiateRollback(item)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
                  >
                    Rollback to this
                  </Button>
                )}
              </div>

              {/* Commit info */}
              <p className="text-sm font-medium text-content-primary line-clamp-2">
                {item.commitMessage}
              </p>

              {/* Metadata strip */}
              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center gap-4 text-xs font-mono text-content-muted">
                <span className="flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-brand-500" />
                  {formatSha(item.commitSha)}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {item.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
