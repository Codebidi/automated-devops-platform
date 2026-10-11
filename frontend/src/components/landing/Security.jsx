import React from 'react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Webhook,
  TimerReset,
  FileCheck2,
} from 'lucide-react';
import { Container, SectionHeading, Card } from '../ui';

export function Security() {
  const securityPillars = [
    {
      title: 'Cryptographically Signed Sessions',
      description:
        'Tokens are signed with URLSafeTimedSerializer and tied to per-user token versions to guarantee instant revocation upon password change.',
      icon: KeyRound,
    },
    {
      title: 'Strong Password Hashing',
      description:
        'Passwords are never stored in plaintext. Hashed with Werkzeug PBKDF2/Argon2 salt routines against timing enumeration attacks.',
      icon: Lock,
    },
    {
      title: 'Server-Enforced Authorization',
      description:
        'Client-side checks are backed by strict backend middleware. API endpoints reject unauthorized attempts with HTTP 401 or 403.',
      icon: ShieldCheck,
    },
    {
      title: 'HMAC-Signed Webhooks',
      description:
        'Inbound pipeline events from GitHub require constant-time HMAC-SHA256 signature verification before executing actions.',
      icon: Webhook,
    },
    {
      title: 'Brute-Force Login Throttling',
      description:
        'In-memory exponential throttling blocks repeated invalid login attempts per IP and username within a sliding 15-minute window.',
      icon: TimerReset,
    },
    {
      title: 'Immutable Audit Logging',
      description:
        'All deployment milestones, rollback decisions, and administrative modifications are stamped with timestamps and authors.',
      icon: FileCheck2,
    },
  ];

  return (
    <section id="security" className="py-24 relative overflow-hidden">
      <Container size="wide">
        <SectionHeading
          badge="Zero-Trust Architecture"
          title="Security Built into the"
          gradientWord="Platform Foundation"
          subtitle="Every layer of the deployment engine follows enterprise defense-in-depth principles."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map(p => {
            const Icon = p.icon;
            return (
              <Card
                key={p.title}
                hoverable
                className="p-6 bg-surface dark:bg-surface-elevated/70 border border-border-subtle"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-bold text-content-primary mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  {p.description}
                </p>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
