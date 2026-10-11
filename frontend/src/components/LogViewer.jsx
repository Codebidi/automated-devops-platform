import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Maximize2,
  Minimize2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

export default function LogViewer({
  logs = '',
  stageName = 'Stage',
  defaultExpanded = true,
}) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [isFullHeight, setIsFullHeight] = useState(false);

  const isRestricted = user?.role === 'viewer';

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!logs) return;
    navigator.clipboard?.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawLines = logs ? logs.split('\n') : ['No logs recorded for this stage execution.'];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-elevated text-slate-200">
      {/* Header Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`Toggle logs for ${stageName}`}
      >
        <div className="flex items-center gap-2.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <Terminal className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            Console Output &bull; {stageName}
          </span>
          {!isRestricted && (
            <span className="text-[11px] text-slate-500 font-mono">
              ({rawLines.length} lines)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!isRestricted && (
            <>
              <button
                type="button"
                onClick={() => setIsFullHeight(!isFullHeight)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title={isFullHeight ? 'Compact height' : 'Expand full height'}
                aria-label="Toggle full height"
              >
                {isFullHeight ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-700/60 transition-colors font-mono"
                title="Copy terminal output"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div>
          {isRestricted ? (
            <div className="p-8 text-center bg-slate-950/80 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-3 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-heading font-bold text-slate-200 uppercase tracking-wider">
                Raw Execution Logs Restricted
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">
                Viewer role has read-only status access. Developer or Administrator privilege is required to inspect raw build and deployment output.
              </p>
            </div>
          ) : (
            <div
              className={`p-4 font-mono text-xs overflow-auto transition-all bg-slate-950 select-text ${
                isFullHeight ? 'max-h-[700px]' : 'max-h-96'
              }`}
            >
              <div className="space-y-1">
                {rawLines.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-4 hover:bg-slate-900/60 py-0.5 px-1 rounded">
                    <span className="text-[11px] font-mono text-slate-600 select-none w-8 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span
                      className={`break-all leading-relaxed ${
                        line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
                          ? 'text-rose-400 font-semibold'
                          : line.toLowerCase().includes('success') || line.toLowerCase().includes('passed')
                          ? 'text-emerald-400'
                          : line.toLowerCase().includes('warning')
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
