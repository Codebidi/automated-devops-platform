import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  GitCommit,
  RotateCcw,
  Shield,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Container, SectionHeading, Badge } from '../ui';

export function ProductPreview() {
  return (
    <section id="preview" className="py-24 relative overflow-hidden">
      <Container size="wide">
        <SectionHeading
          badge="Interactive Preview"
          title="Designed for Engineers who"
          gradientWord="Demand Precision"
          subtitle="Everything in a single unified dashboard: real-time telemetry, historical runs, and active deployment targets."
        />

        {/* Realistic Browser Frame with Subtle Perspective */}
        <div className="relative mx-auto max-w-5xl rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200 to-slate-400 dark:from-slate-700/60 dark:to-slate-900/80 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <div className="rounded-2xl bg-surface dark:bg-canvas border border-border-strong/60 overflow-hidden shadow-elevated">
            {/* Browser Top Navigation Bar */}
            <div className="px-4 py-3 bg-surface-subtle/80 dark:bg-surface-elevated/80 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <div className="ml-4 px-3 py-1 bg-surface dark:bg-canvas rounded-lg border border-border-subtle flex items-center gap-2 text-xs font-mono text-content-secondary">
                  <span className="text-emerald-500 font-bold">https://</span>
                  <span>deployhub.internal/app</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" dot>
                  SYSTEM OPERATIONAL
                </Badge>
              </div>
            </div>

            {/* Mock Dashboard Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-surface-subtle/60 dark:bg-surface-elevated/60 border border-border-subtle">
                  <div className="flex items-center justify-between text-content-muted text-xs">
                    <span>Total Runs</span>
                    <Layers className="w-4 h-4 text-brand-500" />
                  </div>
                  <p className="mt-2 text-xl font-heading font-bold text-content-primary">
                    142
                  </p>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12 this week
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface-subtle/60 dark:bg-surface-elevated/60 border border-border-subtle">
                  <div className="flex items-center justify-between text-content-muted text-xs">
                    <span>Success Rate</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="mt-2 text-xl font-heading font-bold text-content-primary">
                    94.2%
                  </p>
                  <span className="text-[11px] text-content-muted font-medium mt-1 block">
                    Last 30 runs verified
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface-subtle/60 dark:bg-surface-elevated/60 border border-border-subtle">
                  <div className="flex items-center justify-between text-content-muted text-xs">
                    <span>Avg Duration</span>
                    <Clock className="w-4 h-4 text-brand-violet" />
                  </div>
                  <p className="mt-2 text-xl font-heading font-bold text-content-primary">
                    1m 19s
                  </p>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-1">
                    Optimized caching
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface-subtle/60 dark:bg-surface-elevated/60 border border-border-subtle">
                  <div className="flex items-center justify-between text-content-muted text-xs">
                    <span>Live Target</span>
                    <Activity className="w-4 h-4 text-brand-cyan" />
                  </div>
                  <p className="mt-2 text-xl font-heading font-bold text-content-primary truncate">
                    sha-8f4d1c2
                  </p>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-1">
                    Port 8000 Healthy
                  </span>
                </div>
              </div>

              {/* Mock Runs Table */}
              <div className="rounded-xl border border-border-subtle overflow-hidden bg-surface dark:bg-surface-elevated">
                <div className="px-4 py-2.5 bg-surface-subtle/70 dark:bg-surface-subtle/30 border-b border-border-subtle text-xs font-semibold text-content-secondary flex justify-between items-center">
                  <span>Recent Pipeline Runs</span>
                  <span className="text-[11px] font-mono text-brand-500">Auto-refresh 10s</span>
                </div>
                <div className="divide-y divide-border-subtle text-xs">
                  {[
                    {
                      id: '#142',
                      branch: 'main',
                      commit: 'feat(db): add PostgreSQL 16 dual-engine driver',
                      author: 'DevOps Lead',
                      time: '2 mins ago',
                      duration: '1m 14s',
                      status: 'success',
                    },
                    {
                      id: '#141',
                      branch: 'staging',
                      commit: 'fix(docker): harden healthcheck endpoint timeout',
                      author: 'Platform Eng',
                      time: '18 mins ago',
                      duration: '1m 22s',
                      status: 'success',
                    },
                    {
                      id: '#140',
                      branch: 'patch-v2',
                      commit: 'chore: update dependency security patches',
                      author: 'Automated Bot',
                      time: '1 hour ago',
                      duration: '45s',
                      status: 'failed',
                    },
                  ].map(run => (
                    <div
                      key={run.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-surface-subtle/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-content-primary">
                          {run.id}
                        </span>
                        <Badge
                          variant={run.status === 'success' ? 'success' : 'danger'}
                          size="sm"
                          dot
                        >
                          {run.status.toUpperCase()}
                        </Badge>
                        <span className="hidden sm:inline font-mono text-content-muted">
                          {run.branch}
                        </span>
                        <span className="font-medium text-content-primary truncate max-w-[180px] sm:max-w-xs">
                          {run.commit}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-content-muted font-mono text-[11px]">
                        <span className="hidden md:inline">{run.duration}</span>
                        <span>{run.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
