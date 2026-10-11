import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Rocket,
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Badge } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, sessionExpired } = useAuth();

  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('deployhub_last_username') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const usernameInputRef = useRef(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/app';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMessage('');

    try {
      await login(username.trim(), password);
      try {
        localStorage.setItem('deployhub_last_username', username.trim());
      } catch {}

      const destination = location.state?.from?.pathname || '/app';
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  // Demo account quick fill helper
  const handleFillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  const isFormValid = username.trim().length >= 3 && password.length >= 6;

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-content-secondary hover:text-content-primary p-2 rounded-xl hover:bg-surface-subtle transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-brand">
            <Rocket className="w-4 h-4" />
          </div>
          <span className="font-heading font-extrabold text-base text-content-primary">
            DeployHub
          </span>
        </Link>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-border-strong/70 shadow-2xl grid grid-cols-1 lg:grid-cols-12 bg-surface dark:bg-surface-elevated">
          {/* Left Brand Panel */}
          <div className="lg:col-span-5 p-6 sm:p-8 md:p-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-cyan/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-brand-300 mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enterprise Gating Console</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight leading-tight">
                Secure Access to Your Production Cluster
              </h2>

              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Authenticate with your credentials to manage deployments, review audit trails, and oversee automated stages.
              </p>

              {/* Pipeline Chips */}
              <div className="mt-8 space-y-2.5">
                {[
                  { label: 'Stage 1: Lint & Automated Test', role: 'Viewer+' },
                  { label: 'Stage 2: Docker Build & ECR Push', role: 'Developer+' },
                  { label: 'Stage 3: Live Health & Rollback', role: 'Admin only' },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-slate-200">{chip.label}</span>
                    <span className="text-[10px] text-brand-300 font-bold uppercase">{chip.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Note at bottom */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Signed token sessions • Argon2/PBKDF2 salted hashes</span>
            </div>
          </div>

          {/* Right Login Form Panel */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-surface dark:bg-canvas">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-content-primary">
                  Sign in to your account
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-content-secondary">
                  Enter your credentials below to proceed into the console.
                </p>
              </div>

              {/* Session Expired Notice */}
              {sessionExpired && (
                <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Session Expired</span>
                    Your session timed out or was reset. Please sign in again.
                  </div>
                </div>
              )}

              {/* Error Message with Gentle Shake */}
              {errorMessage && (
                <div
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-[shake_0.4s_ease-in-out]"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  ref={usernameInputRef}
                  label="Username"
                  placeholder="e.g. admin or developer"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  autoComplete="username"
                  required
                />

                <div className="space-y-1">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="p-1 hover:text-content-primary rounded transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    autoComplete="current-password"
                    required
                  />

                  {capsLockActive && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Caps Lock is ON
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loading}
                    disabled={!isFormValid || loading}
                    className="w-full text-sm font-bold"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Sign In to Console
                  </Button>
                </div>
              </form>

              {/* Demo Accounts Quick-Select Chips */}
              <div className="mt-8 pt-6 border-t border-border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                    Quick-Fill Demo Accounts
                  </span>
                  <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400 font-medium">
                    1-Click Test
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('admin', 'Admin@12345')}
                    className="p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 hover:border-purple-400 text-left transition-colors"
                  >
                    <span className="block text-xs font-heading font-bold text-purple-700 dark:text-purple-300">
                      Admin
                    </span>
                    <span className="block text-[10px] font-mono text-content-muted truncate">
                      Full control
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('developer', 'Dev@123456')}
                    className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 hover:border-indigo-400 text-left transition-colors"
                  >
                    <span className="block text-xs font-heading font-bold text-indigo-700 dark:text-indigo-300">
                      Developer
                    </span>
                    <span className="block text-[10px] font-mono text-content-muted truncate">
                      Deployer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('viewer', 'View@12345')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-left transition-colors"
                  >
                    <span className="block text-xs font-heading font-bold text-slate-700 dark:text-slate-300">
                      Viewer
                    </span>
                    <span className="block text-[10px] font-mono text-content-muted truncate">
                      Read-only
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 sm:p-6 text-center text-xs text-content-muted">
        DeployHub Continuous Integration & Deployment Platform • Authorized Access Only
      </footer>
    </div>
  );
}
