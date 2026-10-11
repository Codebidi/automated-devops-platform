import React from 'react';
import { Eye, Code2, ShieldAlert, Check, X } from 'lucide-react';
import { Container, SectionHeading, Card, Badge } from '../ui';

export function Roles() {
  const roles = [
    {
      name: 'Viewer',
      tag: 'Read-Only Audit',
      description: 'Ideal for auditors, product managers, and stakeholder monitoring.',
      icon: Eye,
      variant: 'viewer',
      badgeColor: 'neutral',
      permissions: [
        { label: 'View all pipeline runs & status', allowed: true },
        { label: 'Inspect active deployment health', allowed: true },
        { label: 'Monitor cluster metrics & stats', allowed: true },
        { label: 'View raw stage terminal logs', allowed: false },
        { label: 'Trigger 1-click live rollbacks', allowed: false },
        { label: 'Manage platform users & settings', allowed: false },
      ],
    },
    {
      name: 'Developer',
      tag: 'Build & Deploy',
      description: 'Standard role for software and DevOps engineers delivering features.',
      icon: Code2,
      variant: 'developer',
      badgeColor: 'brand',
      permissions: [
        { label: 'View all pipeline runs & status', allowed: true },
        { label: 'Inspect active deployment health', allowed: true },
        { label: 'Monitor cluster metrics & stats', allowed: true },
        { label: 'View raw stage terminal logs', allowed: true },
        { label: 'Trigger 1-click live rollbacks', allowed: false },
        { label: 'Manage platform users & settings', allowed: false },
      ],
    },
    {
      name: 'Administrator',
      tag: 'Full Governance',
      description: 'Complete operational command with emergency intervention power.',
      icon: ShieldAlert,
      variant: 'admin',
      badgeColor: 'admin',
      isPopular: true,
      permissions: [
        { label: 'View all pipeline runs & status', allowed: true },
        { label: 'Inspect active deployment health', allowed: true },
        { label: 'Monitor cluster metrics & stats', allowed: true },
        { label: 'View raw stage terminal logs', allowed: true },
        { label: 'Trigger 1-click live rollbacks', allowed: true },
        { label: 'Manage platform users & settings', allowed: true },
      ],
    },
  ];

  return (
    <section id="roles" className="py-24 relative bg-surface-subtle/30 dark:bg-surface-elevated/20 border-y border-border-subtle">
      <Container size="wide">
        <SectionHeading
          badge="Role-Based Security"
          title="Strictly Enforced"
          gradientWord="Access Permissions"
          subtitle="Every API route verifies caller rank. Protect your production runtime from accidental changes."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <Card
                key={role.name}
                hoverable
                className={`p-6 md:p-8 flex flex-col justify-between relative overflow-hidden bg-surface dark:bg-surface-elevated ${
                  role.isPopular
                    ? 'border-brand-500/60 shadow-glow-brand ring-1 ring-brand-500/40'
                    : ''
                }`}
              >
                {role.isPopular && (
                  <div className="absolute top-0 right-0 bg-gradient-brand text-white text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                    Full Control
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-subtle dark:bg-surface border border-border-subtle flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-bold text-content-primary">
                        {role.name}
                      </h3>
                      <Badge variant={role.badgeColor} size="sm">
                        {role.tag}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-content-secondary leading-relaxed mb-6">
                    {role.description}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-border-subtle">
                    {role.permissions.map(perm => (
                      <div
                        key={perm.label}
                        className="flex items-start gap-2.5 text-xs"
                      >
                        {perm.allowed ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shrink-0 mt-0.5 opacity-60">
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        <span
                          className={
                            perm.allowed
                              ? 'text-content-primary font-medium'
                              : 'text-content-muted line-through'
                          }
                        >
                          {perm.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-border-subtle text-[11px] font-mono text-content-muted text-center">
                  Enforced in backend API & frontend UI
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
