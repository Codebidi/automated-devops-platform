import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, MinusCircle, ChevronRight } from 'lucide-react';
import LogViewer from './LogViewer';
import StatusBadge from './StatusBadge';

export default function PipelineStepper({ stages = [] }) {
  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    // Default open failing or running stage, or first stage
    const failIdx = stages.findIndex(s => s.status === 'failed');
    if (failIdx !== -1) return failIdx;
    const runIdx = stages.findIndex(s => s.status === 'running');
    if (runIdx !== -1) return runIdx;
    return 0;
  });

  const getStepIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-500" aria-hidden="true" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-sky-500 animate-spin" aria-hidden="true" />;
      case 'skipped':
      default:
        return <MinusCircle className="w-5 h-5 text-slate-400" aria-hidden="true" />;
    }
  };

  const activeStage = stages[selectedStageIndex] || stages[0];

  return (
    <div className="space-y-6">
      {/* Horizontal Steps Bar */}
      <nav aria-label="Pipeline Stages" className="w-full">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stages.map((stage, idx) => {
            const isSelected = selectedStageIndex === idx;
            const isRunning = stage.status === 'running';
            const isFailed = stage.status === 'failed';

            return (
              <li key={stage.id || idx}>
                <button
                  type="button"
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between h-full relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                      : isFailed
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10 hover:border-rose-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  aria-current={isSelected ? 'step' : undefined}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        0{idx + 1}
                      </span>
                      {getStepIcon(stage.status)}
                    </div>
                    <StatusBadge status={stage.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {stage.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {isRunning ? 'Running...' : stage.duration || '—'}
                    </p>
                  </div>

                  {isSelected && (
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-sky-500 rotate-45 rounded-sm hidden lg:block"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Stage Detail & Collapsible Log Viewer */}
      {activeStage && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
            <span className="font-medium">
              Viewing logs for <span className="font-semibold text-slate-900 dark:text-white">{activeStage.name}</span>
            </span>
            <span className="font-mono">
              Stage Duration: {activeStage.duration}
            </span>
          </div>

          <LogViewer
            key={activeStage.id}
            stageName={activeStage.name}
            logs={activeStage.logs}
            defaultExpanded={true}
          />
        </div>
      )}
    </div>
  );
}
