import React from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from './ui';

export default function SecretsChecklist({ secrets = [] }) {
  return (
    <div className="space-y-2">
      {secrets.map((secret) => (
        <div
          key={secret.name}
          className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-surface-subtle"
        >
          <div className="flex items-center gap-3">
            {secret.configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="font-mono text-xs font-semibold text-content-primary block">
                {secret.name}
              </span>
              <span className="text-[11px] text-content-muted">
                {secret.configured
                  ? 'Configured and active in platform environment'
                  : 'Optional or pending configuration'}
              </span>
            </div>
          </div>

          <Badge variant={secret.configured ? 'success' : 'warning'} size="sm" dot>
            {secret.configured ? 'CONFIGURED' : 'UNCONFIGURED'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
