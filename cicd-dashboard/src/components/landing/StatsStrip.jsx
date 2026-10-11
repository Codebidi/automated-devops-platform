import React from 'react';
import { Layers, Shield, RefreshCw, Zap } from 'lucide-react';
import { Container, AnimatedCounter } from '../ui';

export function StatsStrip() {
  const stats = [
    {
      value: 4,
      suffix: '',
      label: 'Automated Stages',
      description: 'Lint & Test, Docker Build, ECR Push, Deploy',
      icon: Layers,
    },
    {
      value: 3,
      suffix: '',
      label: 'Access Roles',
      description: 'Strict Viewer, Developer & Admin enforcement',
      icon: Shield,
    },
    {
      value: 1,
      prefix: '',
      suffix: '-Click',
      label: 'Instant Rollbacks',
      description: 'One request restores previous stable deployment',
      icon: RefreshCw,
    },
    {
      value: 0,
      suffix: '',
      label: 'Manual Release Steps',
      description: 'Fully automated continuous integration gates',
      icon: Zap,
    },
  ];

  return (
    <section className="relative py-12 border-y border-border-subtle bg-surface-subtle/50 dark:bg-surface-elevated/40 backdrop-blur-sm">
      <Container size="wide">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-2xl transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2 text-brand-600 dark:text-brand-400">
                  <Icon className="w-5 h-5 opacity-90" />
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-content-primary">
                    <AnimatedCounter
                      value={s.value}
                      prefix={s.prefix || ''}
                      suffix={s.suffix}
                    />
                  </span>
                </div>
                <h3 className="text-sm font-heading font-bold text-content-primary">
                  {s.label}
                </h3>
                <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
