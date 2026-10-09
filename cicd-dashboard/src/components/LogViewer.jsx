import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Terminal, Maximize2, Minimize2 } from 'lucide-react';

export default function LogViewer({
  logs = '',
  stageName = 'Stage',
  defaultExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [isFullHeight, setIsFullHeight] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = logs ? logs.split('\n') : ['No logs available for this step.'];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md text-slate-200">
      {/* Header toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 cursor-pointer select-none"
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
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
          <Terminal className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            Console Logs &bull; {stageName}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({lines.length} lines)
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsFullHeight(!isFullHeight)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            title={isFullHeight ? 'Compact height' : 'Expand height'}
            aria-label="Toggle log viewer expansion"
          >
            {isFullHeight ? (
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            aria-label="Copy logs to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden="true" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible log body */}
      {isExpanded && (
        <div
          className={`p-4 font-mono text-xs overflow-auto transition-all ${
            isFullHeight ? 'max-h-[600px]' : 'max-h-72'
          }`}
          tabIndex={0}
          aria-label="Log output"
        >
          {lines.map((line, idx) => {
            const isError = line.includes('Error') || line.includes('FAIL') || line.includes('\u2718');
            const isSuccess = line.includes('PASS') || line.includes('\u2714') || line.includes('Succeeded');
            const isCommand = line.includes('\u25b6') || line.startsWith('Step');

            return (
              <div
                key={idx}
                className={`flex gap-3 leading-relaxed hover:bg-slate-900/50 px-1 py-0.5 rounded ${
                  isError
                    ? 'text-rose-400 bg-rose-950/20'
                    : isSuccess
                    ? 'text-emerald-300'
                    : isCommand
                    ? 'text-sky-300'
                    : 'text-slate-300'
                }`}
              >
                <span className="select-none text-slate-600 text-[11px] w-6 text-right shrink-0">
                  {idx + 1}
                </span>
                <span className="break-all whitespace-pre-wrap">{line}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
