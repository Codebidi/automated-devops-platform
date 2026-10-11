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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SecretsChecklist from '../components/SecretsChecklist';
import { Button, Card, Input, Badge, Skeleton } from '../components/ui';
import { fetchPlatformConfig, updatePlatformConfig } from '../api/pipelineApi';

export default function Settings({ onRepoChange }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState('');

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
