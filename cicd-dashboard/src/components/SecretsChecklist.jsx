import React from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SecretsChecklist({ secrets = [] }) {
  return (
    <section aria-labelledby="secrets-checklist-heading" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500" aria-hidden="true" />
          <h2 id="secrets-checklist-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
            GitHub Actions Secrets Checklist
          </h2>
        </div>
        <span className="text-xs text-slate-500">Names only &bull; Values never exposed</span>
      </div>

      <div className="space-y-2">
        {secrets.map((secret) => (
          <div key={secret.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              {secret.configured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              )}
              <div>
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white block">{secret.name}</span>
                <span className="text-[11px] text-slate-500">{secret.configured ? `Configured in repository secrets (${secret.lastUpdated})` : 'Optional / Not configured'}</span>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${secret.configured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
              {secret.configured ? 'Configured' : 'Missing'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
