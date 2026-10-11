import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  GitCommit,
  Layers,
  CloudUpload,
  Server,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Container, GradientText, Badge } from '../ui';

export function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeStage, setActiveStage] = useState(0);

  // Animated pipeline visual cycling through the 4 stages (2.2s per stage)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage(prev => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const stages = [
    {
      id: 0,
      name: 'Lint & Test',
      detail: 'pytest tests/ -v (90 passed)',
      icon: Layers,
      duration: '14s',
      log: '[test] 90 passed, 0 failed in 14.2s (100% coverage)',
    },
    {
      id: 1,
      name: 'Build Image',
      detail: 'docker build --target production',
      icon: GitCommit,
      duration: '38s',
      log: '[build] Successfully tagged app:sha-8f4d1c2 (62MB)',
    },
    {
      id: 2,
      name: 'Push to ECR',
      detail: 'aws ecr get-login-password | docker push',
      icon: CloudUpload,
      duration: '19s',
      log: '[ecr] digest: sha256:4a9c8e1... layer uploaded',
    },
    {
      id: 3,
      name: 'Deploy & Verify',
      detail: 'Zero-downtime release & health check',
      icon: Server,
      duration: '8s',
      log: '[deploy] HTTP 200 OK — container live on port 8000',
    },
  ];

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-grid-pattern">
      {/* Background Decorative Radial Gradient Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-brand-600/20 via-brand-violet/20 to-brand-cyan/20 rounded-full blur-[120px] pointer-events-none" />

      <Container size="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-border-strong/70 text-content-primary shadow-sm mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400 font-bold uppercase">
                v2.4 Production Engine
              </span>
              <span className="text-content-muted">•</span>
              <span className="text-content-secondary">Dual SQLite & Postgres</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-display font-heading font-extrabold text-content-primary tracking-tight leading-[1.08]">
              Ship Every Release with <GradientText>Absolute Confidence</GradientText>.
            </h1>

            {/* Value Proposition */}
            <p className="mt-6 text-lg md:text-xl text-content-secondary font-normal leading-relaxed max-w-2xl">
              A high-precision CI/CD deployment platform with automated 4-stage pipeline gating, instantaneous 1-click rollbacks, and enterprise role-based governance.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/app')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Open Deployment Console
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Sign In to Console
                </Button>
              )}

              <a
                href="#how-it-works"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Play className="w-4 h-4 text-brand-500" />}
                  className="w-full sm:w-auto"
                >
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Trust Line */}
            <div className="mt-8 pt-6 border-t border-border-subtle/80 flex flex-wrap items-center gap-6 text-xs text-content-muted">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Zero-downtime updates
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                4-Stage automated verification
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                1-Click state rollback
              </span>
            </div>
          </div>

          {/* Right Column: Animated Interactive Pipeline Visual */}
          <div className="lg:col-span-5 relative w-full flex justify-center z-10">
            <div className="relative w-full max-w-lg rounded-3xl p-6 bg-surface/90 dark:bg-surface-elevated/90 border border-border-strong/70 backdrop-blur-xl shadow-elevated">
              {/* Header Bar of Interactive Visual */}
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-mono text-xs font-semibold text-content-secondary">
                    pipeline #142 • main
                  </span>
                </div>
                <Badge variant="brand" size="sm" dot>
                  AUTOMATED RUN
                </Badge>
              </div>

              {/* 4 Interactive Stages Visual */}
              <div className="mt-5 space-y-3">
                {stages.map((stage, idx) => {
                  const isDone = idx < activeStage;
                  const isCurrent = idx === activeStage;
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.name}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                        isCurrent
                          ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-400 dark:border-brand-600 shadow-glow-brand ring-1 ring-brand-500/30'
                          : isDone
                          ? 'bg-surface-subtle dark:bg-surface border-border-subtle'
                          : 'bg-transparent border-border-subtle/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                            isCurrent
                              ? 'bg-gradient-brand text-white shadow-sm'
                              : isDone
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-surface-muted text-content-muted'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-heading font-bold text-content-primary">
                            {stage.name}
                          </p>
                          <p className="text-[11px] font-mono text-content-muted truncate max-w-[200px]">
                            {stage.detail}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-medium ${
                            isCurrent
                              ? 'text-brand-600 dark:text-brand-400 font-bold animate-pulse'
                              : isDone
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-content-muted'
                          }`}
                        >
                          {isCurrent ? 'Running...' : isDone ? `+${stage.duration}` : 'Queued'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Streaming Mini Log Panel */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-brand-400" />
                  <span>Execution Log Stream</span>
                </div>
                <div className="text-emerald-400 text-[11px] font-mono truncate animate-fade-in key={activeStage}">
                  &gt; {stages[activeStage].log}
                </div>
              </div>

              {/* Floating Status Pill Card */}
              <div className="absolute -bottom-5 right-4 sm:right-8 z-30 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
                  <span className="absolute w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-heading font-bold text-slate-900 dark:text-white leading-tight">
                    Live Production Target
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Health: 200 OK • SHA: 8f4d1c2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
