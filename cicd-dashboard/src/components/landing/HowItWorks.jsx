import React from 'react';
import { GitPullRequest, CheckCircle2, PackageCheck, Send } from 'lucide-react';
import { Container, SectionHeading } from '../ui';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Push Code to GitHub',
      subtitle: 'Trigger & Webhook Ingestion',
      description:
        'Developer pushes a commit or opens a pull request. Secure HMAC-signed webhooks notify DeployHub instantly.',
      icon: GitPullRequest,
    },
    {
      num: '02',
      title: 'Automated Test Matrix',
      subtitle: 'Linting & Unit Verification',
      description:
        'The pipeline executes test suites in parallel with strict coverage enforcement and syntax analysis.',
      icon: CheckCircle2,
    },
    {
      num: '03',
      title: 'Build & Publish Image',
      subtitle: 'Multi-Stage Docker & AWS ECR',
      description:
        'Optimized Docker container is built, tagged with git commit SHA, scanned, and uploaded to container registry.',
      icon: PackageCheck,
    },
    {
      num: '04',
      title: 'Deploy & Health Check',
      subtitle: 'Zero-Downtime Rollout',
      description:
        'New container spins up seamlessly. Post-deployment probes confirm health and promote the release to live.',
      icon: Send,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative bg-surface-subtle/30 dark:bg-surface-elevated/20 border-y border-border-subtle">
      <Container size="wide">
        <SectionHeading
          badge="Release Pipeline"
          title="From Commit to Production in"
          gradientWord="Four Simple Steps"
          subtitle="A deterministic, fully auditable lifecycle built for continuous reliability."
        />

        <div className="relative mt-12">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-6 bg-gradient-to-r from-brand-500/20 via-brand-violet/40 to-brand-cyan/20 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex flex-col p-6 rounded-2xl bg-surface dark:bg-surface-elevated border border-border-subtle shadow-card hover:shadow-elevated transition-all duration-300 group"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-brand-500/80 dark:text-brand-400">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-surface-subtle dark:bg-surface border border-border-subtle flex items-center justify-center text-content-primary group-hover:bg-gradient-brand group-hover:text-white transition-colors duration-200 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-heading font-bold text-content-primary mb-1">
                    {step.title}
                  </h3>
                  <span className="text-xs font-mono font-medium text-brand-600 dark:text-brand-400 mb-2">
                    {step.subtitle}
                  </span>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
