import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Container, Button } from '../ui';

export function CtaBanner() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 relative overflow-hidden">
      <Container size="wide">
        <div className="relative rounded-3xl p-8 sm:p-12 md:p-16 bg-gradient-brand text-white overflow-hidden shadow-2xl">
          {/* Subtle noise and glowing orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-cyan/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-sm">
              <Rocket className="w-6 h-6 text-white" />
            </div>

            <h2 className="text-h2 font-heading font-black text-white tracking-tight">
              Ready to Upgrade Your Delivery Pipeline?
            </h2>

            <p className="mt-4 text-base md:text-lg text-white/80 font-normal leading-relaxed">
              Experience deterministic releases, instant rollbacks, and airtight security governance designed for modern engineering teams.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => navigate('/app')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl border-none font-bold"
                >
                  Go to Live Dashboard
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl border-none font-bold"
                >
                  Sign In to DeployHub
                </Button>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-white/70 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Role-governed environment • Zero external telemetry</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border-subtle bg-surface dark:bg-canvas">
      <Container size="wide">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-sm">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-base text-content-primary">
                DeployHub
              </span>
              <p className="text-[11px] text-content-muted">
                Continuous Integration & Deployment Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-content-secondary">
            <a href="#features" className="hover:text-content-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-content-primary transition-colors">
              Pipeline
            </a>
            <a href="#roles" className="hover:text-content-primary transition-colors">
              Access Roles
            </a>
            <a href="#security" className="hover:text-content-primary transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-content-primary transition-colors">
              FAQ
            </a>
          </div>

          <div className="text-xs text-content-muted flex flex-col md:items-end">
            <span>© {currentYear} DeployHub Platform.</span>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono mt-0.5">
              Authorized personnel only
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
