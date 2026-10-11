import React from 'react';
import {
  Cpu,
  Boxes,
  RotateCcw,
  Activity,
  Users,
  History,
  CheckCircle,
} from 'lucide-react';
import { Container, SectionHeading, Card } from '../ui';

export function Features() {
  const features = [
    {
      title: 'Automated CI Pipeline',
      description:
        'Every commit triggers automated test suites and validation matrices, ensuring zero defective releases ever hit production.',
      icon: Cpu,
      tag: 'Continuous Testing',
    },
    {
      title: 'Docker Build & ECR Push',
      description:
        'Streamlined multi-stage container builds automatically package application layers, tagged and pushed into AWS ECR.',
      icon: Boxes,
      tag: 'Container Architecture',
    },
    {
      title: 'One-Click Instant Rollback',
      description:
        'Emergency recovery at your fingertips. Revert to any previous stable container release with a single verified command.',
      icon: RotateCcw,
      tag: 'Zero Downtime',
    },
    {
      title: 'Real-Time Health Checks',
      description:
        'Continuous automated polling pings production endpoints to guarantee active instances are responsive and healthy.',
      icon: Activity,
      tag: 'Live Monitoring',
    },
    {
      title: 'Role-Based Access Control',
      description:
        'Granular permissions cleanly separate Viewers (auditors), Developers (deployers), and Administrators (system owners).',
      icon: Users,
      tag: 'RBAC Security',
    },
    {
      title: 'Deployment History & Audit',
      description:
        'Persistent immutable records track every release, commit SHA, author, and rollback timestamp in the database.',
      icon: History,
      tag: 'Full Compliance',
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <Container size="wide">
        <SectionHeading
          badge="Core Capabilities"
          title="Everything Required to"
          gradientWord="Automate Delivery"
          subtitle="Engineered for high velocity with ironclad reliability and comprehensive security governance."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                hoverable
                className="p-6 flex flex-col justify-between group relative overflow-hidden bg-surface dark:bg-surface-elevated/70"
              >
                {/* Glow Highlight on Hover */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/10 dark:bg-brand-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 group-hover:bg-gradient-brand group-hover:text-white transition-all duration-300 shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-content-muted">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-heading font-bold text-content-primary mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-content-secondary leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border-subtle flex items-center text-xs font-medium text-brand-600 dark:text-brand-400">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  Active in DeployHub v2
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
