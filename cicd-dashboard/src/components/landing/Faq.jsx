import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Container, SectionHeading } from '../ui';

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'How does DeployHub choose between SQLite and PostgreSQL?',
      a: 'DeployHub uses an automatic dual-engine database layer. If DATABASE_URL is unset, it defaults to a zero-config local SQLite database (in data/cicd.db with WAL mode). When DATABASE_URL starts with postgresql://, it automatically engages PostgreSQL 16 connection pooling without any code changes.',
    },
    {
      q: 'Are GitHub logs and pipeline steps stored in the database?',
      a: 'No. DeployHub strictly adheres to clean storage separation: the database stores only user accounts (roles, authentication hashes) and release history (active live deployment). Ephemeral raw pipeline runs and build logs are streamed dynamically from GitHub or the mock execution engine.',
    },
    {
      q: 'How does the one-click rollback feature work?',
      a: 'When an administrator triggers a rollback, DeployHub points traffic back to the previous verified container image tag, logs the rollback author and timestamp, and marks the chosen target as live (is_current=1). Deployments that are already live are guarded against redundant rollbacks.',
    },
    {
      q: 'What happens if a user session expires or a password is changed?',
      a: 'Tokens carry an internal token_version number. When an administrator revokes access or a user changes their password, the token version increments, which immediately invalidates all existing sessions without needing global database flushes.',
    },
    {
      q: 'Can Viewers or Developers accidentally trigger deployments or rollbacks?',
      a: 'No. Every sensitive route on the backend server checks the authenticated user’s role before execution. Viewers have read-only access and cannot view raw terminal logs. Only verified Administrators can trigger rollback procedures or manage accounts.',
    },
    {
      q: 'Can DeployHub run fully in Docker?',
      a: 'Yes! A single `docker compose up --build` command spins up the entire production stack: PostgreSQL 16 Alpine, Python Flask WSGI API server, and Nginx hosting the React 18 single-page application with SPA route fallback.',
    },
  ];

  return (
    <section id="faq" className="py-24 relative bg-surface-subtle/30 dark:bg-surface-elevated/20 border-t border-border-subtle">
      <Container size="narrow">
        <SectionHeading
          badge="Frequently Asked Questions"
          title="Everything You Need"
          gradientWord="to Know"
          subtitle="Answers to common architecture, security, and runtime questions about DeployHub."
        />

        <div className="space-y-3 mt-8">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-border-subtle bg-surface dark:bg-surface-elevated overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
                >
                  <span className="text-sm font-heading font-bold text-content-primary">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-content-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand-500' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-content-secondary leading-relaxed border-t border-border-subtle/60 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
