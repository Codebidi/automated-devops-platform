import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, MinusCircle, ChevronRight } from 'lucide-react';
import LogViewer from './LogViewer';
import { Badge } from './ui';

export default function PipelineStepper({ stages = [] }) {
  const [selectedStageIndex, setSelectedStageIndex] = useState(() => {
    const failIdx = stages.findIndex(s => s.status === 'failed');
    if (failIdx !== -1) return failIdx;
    const runIdx = stages.findIndex(s => s.status === 'running');
    if (runIdx !== -1) return runIdx;
    return 0;
  });

  const getStepIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />;
      default:
        return <MinusCircle className="w-5 h-5 text-content-muted" />;
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
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-full relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 shadow-glow-brand ring-1 ring-brand-500'
                      : isFailed
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-border-subtle bg-surface dark:bg-surface-elevated hover:border-border-strong'
                  }`}
                  aria-current={isSelected ? 'step' : undefined}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-content-muted">
                        0{idx + 1}
                      </span>
                      <span className="font-heading font-semibold text-xs text-content-primary">
                        {stage.name}
                      </span>
                    </div>
                    {getStepIcon(stage.status)}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] text-content-secondary font-mono">
                    <span>{stage.duration || '—'}</span>
                    <span className="capitalize">{stage.status}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Selected Stage Log Viewer */}
      {activeStage && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-content-primary">
              Output: {activeStage.name}
            </h3>
            <Badge variant={activeStage.status === 'success' ? 'success' : activeStage.status === 'failed' ? 'danger' : 'brand'} size="sm">
              {activeStage.status.toUpperCase()}
            </Badge>
          </div>

          <LogViewer
            logs={Array.isArray(activeStage.logs) ? activeStage.logs.join('\n') : String(activeStage.logs || '')}
            stageName={activeStage.name}
            defaultExpanded={true}
          />
        </div>
      )}
    </div>
  );
}
