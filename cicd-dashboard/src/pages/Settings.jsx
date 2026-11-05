import React, { useState, useEffect } from 'react';
import {
  Server,
  Cloud,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Save,
  Shield,
  Key,
  Github,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SecretsChecklist from '../components/SecretsChecklist';
import { Button, Card, Input, Badge, Skeleton } from '../components/ui';
import { fetchPlatformConfig, updatePlatformConfig, saveGithubToken } from '../api/pipelineApi';

export default function Settings({ onRepoChange }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState('');

  // GitHub Token state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchPlatformConfig();
        setConfig(data);
        setRepoInput(data.repoName);
      } catch (err) {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings configuration.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyText = (val, key) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    const cleanRepo = repoInput.trim();
    if (!cleanRepo) return;
    try {
      const updated = await updatePlatformConfig({ repoName: cleanRepo });
      setConfig(updated);
      setIsEditingRepo(false);
      if (onRepoChange) onRepoChange(cleanRepo);
      toast.success(`Repository configuration saved: "${cleanRepo}"`);
    } catch {
      toast.error('Failed to save repository configuration.');
    }
  };

  const handleSaveToken = async (e) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      toast.error('Please enter a GitHub Personal Access Token.');
      return;
    }
    setSavingToken(true);
    try {
      await saveGithubToken(cleanToken);
      toast.success('GitHub token configured! Switched to live GitHub data.');
      setTokenInput('');
      setShowToken(false);
      // Reload config to reflect new state
      const freshConfig = await fetchPlatformConfig();
      setConfig(freshConfig);
    } catch (err) {
      toast.error(err.message || 'Failed to save GitHub token.');
    } finally {
      setSavingToken(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-heading font-bold text-content-primary">
          Administrator Privilege Required
        </h2>
        <p className="mt-2 text-xs text-content-secondary leading-relaxed">
          System settings and secrets verification are strictly limited to users with the Administrator role.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="card" count={2} />
        <Skeleton variant="card" count={2} />
      </div>
    );
  }

  const needsToken = config?.needsGithubToken;
  const tokenConfigured = config?.githubTokenConfigured;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-content-primary tracking-tight">
          System Settings & Infrastructure
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          Configure connected GitHub repositories, AWS host endpoints, and verify secret checklist.
        </p>
      </div>

      {/* GitHub Token Configuration Card — shown prominently when needed */}
      {needsToken && (
        <Card className="p-6 border-2 border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/50 via-transparent to-transparent dark:from-amber-950/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-content-primary">
                GitHub Token Required
              </h2>
              <p className="text-xs text-content-secondary mt-0.5">
                The platform is in <strong>real mode</strong> but no GitHub token has been configured yet. 
                Enter your <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 underline hover:no-underline">Personal Access Token (PAT)</a> below 
                to connect to live GitHub Actions data.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveToken} className="space-y-3">
            <div className="relative max-w-lg">
              <input
                id="github-token-input"
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-20 rounded-xl bg-white dark:bg-gray-900 border border-border-subtle 
                  text-sm font-mono text-content-primary placeholder:text-content-muted
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                  transition-all duration-200"
                autoComplete="off"
                spellCheck="false"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-content-muted hover:text-content-secondary transition-colors"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={savingToken || !tokenInput.trim()}
                leftIcon={savingToken
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Zap className="w-4 h-4" />
                }
              >
                {savingToken ? 'Connecting...' : 'Connect to GitHub'}
              </Button>
              <span className="text-[10px] text-content-muted">
                Requires <code className="bg-surface-subtle px-1 py-0.5 rounded text-[10px]">repo</code> and <code className="bg-surface-subtle px-1 py-0.5 rounded text-[10px]">workflow</code> scopes
              </span>
            </div>
          </form>
        </Card>
      )}

      {/* GitHub Token Status Card — shown when token is already configured */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Github className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-heading font-bold text-content-primary">
            GitHub Connection
          </h2>
          {tokenConfigured ? (
            <Badge variant="success" size="sm">Connected</Badge>
          ) : needsToken ? (
            <Badge variant="warning" size="sm">Not Connected</Badge>
          ) : (
            <Badge variant="muted" size="sm">Mock Mode</Badge>
          )}
        </div>
        <p className="text-xs text-content-secondary mb-4">
          {tokenConfigured
            ? 'Authenticated with GitHub. Pipeline data is sourced from live GitHub Actions.'
            : needsToken
              ? 'Provide a GitHub Personal Access Token above to start receiving live data.'
              : 'Running in mock mode with sample data.'
          }
        </p>

        {tokenConfigured && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-content-primary">Token active — live data enabled</span>
              </div>
            </div>

            {/* Allow re-configuring the token */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-content-muted hover:text-content-secondary transition-colors select-none">
                Update GitHub Token...
              </summary>
              <form onSubmit={handleSaveToken} className="mt-3 space-y-3">
                <div className="relative max-w-lg">
                  <input
                    id="github-token-update"
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 pr-20 rounded-xl bg-white dark:bg-gray-900 border border-border-subtle 
                      text-sm font-mono text-content-primary placeholder:text-content-muted
                      focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
                      transition-all duration-200"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-content-muted hover:text-content-secondary transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={savingToken || !tokenInput.trim()}
                  leftIcon={savingToken
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />
                  }
                >
                  {savingToken ? 'Updating...' : 'Update Token'}
                </Button>
              </form>
            </details>
          </div>
        )}
      </Card>

      {/* Repository Settings Card */}
      <Card className="p-6">
        <h2 className="text-base font-heading font-bold text-content-primary mb-1">
          Connected GitHub Repository
        </h2>
        <p className="text-xs text-content-secondary mb-4">
          Target repository for webhook ingestion and deployment trigger matching.
        </p>

        {isEditingRepo ? (
          <form onSubmit={handleSaveRepo} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <Input
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. org/repo-name"
              required
            />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />}>
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setIsEditingRepo(false);
                  setRepoInput(config?.repoName || '');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-subtle border border-border-subtle">
            <div>
              <span className="font-mono text-sm font-bold text-content-primary">
                {config?.repoName}
              </span>
              <a
                href={config?.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-3 inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                View on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingRepo(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Change Repository
            </Button>
          </div>
        )}
      </Card>

      {/* Cloud & Cluster Endpoints Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Cloud className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-heading font-bold text-content-primary">
            Cloud Host & Registry Endpoints
          </h2>
        </div>
        <p className="text-xs text-content-secondary mb-4">
          Verified AWS EC2 and ECR container endpoints managed by the deployment driver.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] font-mono font-bold uppercase text-content-muted block mb-1">
              AWS EC2 Host Target
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-content-primary truncate">
                {config?.ec2Host}
              </span>
              <button
                type="button"
                onClick={() => copyText(config?.ec2Host, 'ec2')}
                className="p-1 hover:text-brand-500 text-content-muted"
                title="Copy host"
              >
                {copiedKey === 'ec2' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
            <span className="text-[10px] font-mono font-bold uppercase text-content-muted block mb-1">
              AWS ECR Registry URI
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-content-primary truncate">
                {config?.ecrRepo}
              </span>
              <button
                type="button"
                onClick={() => copyText(config?.ecrRepo, 'ecr')}
                className="p-1 hover:text-brand-500 text-content-muted"
                title="Copy ECR URI"
              >
                {copiedKey === 'ecr' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Secrets Checklist Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Key className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-heading font-bold text-content-primary">
            Required Environment Secrets Checklist
          </h2>
        </div>
        <p className="text-xs text-content-secondary mb-4">
          Health status of signing keys, database passwords, and GitHub credentials.
        </p>
        <SecretsChecklist secrets={config?.secrets || []} />
      </Card>
    </div>
  );
}
