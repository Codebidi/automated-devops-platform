import React, { useState, useEffect } from 'react';
import {
  Server, Cloud, CheckCircle2,
  Copy, Check, ExternalLink, Edit3, Save
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import SecretsChecklist from '../components/SecretsChecklist';
import { fetchPlatformConfig, updatePlatformConfig } from '../api/pipelineApi';

export default function Settings({ onRepoChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [saveBanner, setSaveBanner] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPlatformConfig();
        setConfig(data);
        setRepoInput(data.repoName);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyText = (val, key) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    const cleanRepo = repoInput.trim();
    if (!cleanRepo) return;
    const updated = await updatePlatformConfig({ repoName: cleanRepo });
    setConfig(updated);
    setIsEditingRepo(false);
    if (onRepoChange) onRepoChange(cleanRepo);
    setSaveBanner(`Repository updated to "${cleanRepo}"`);
    setTimeout(() => setSaveBanner(null), 4000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={2} />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Platform Configuration &amp; Secrets
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          System parameters, cloud targets, and GitHub Actions secrets audit.
        </p>
      </div>

      {saveBanner && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Infrastructure Target Card */}
      <section aria-labelledby="infra-config-heading" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Server className="w-4 h-4 text-sky-500" aria-hidden="true" />
          <h2 id="infra-config-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
            Infrastructure Target Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* GitHub Repository Item */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[11px] font-sans">GitHub Repository</span>
              {!isEditingRepo ? (
                <button
                  type="button"
                  onClick={() => setIsEditingRepo(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-sans text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <Edit3 className="w-3 h-3" /> Change Repository
                </button>
              ) : null}
            </div>

            {isEditingRepo ? (
              <form onSubmit={handleSaveRepo} className="flex flex-wrap items-center gap-2 mt-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="e.g. codebidi/ai-devops-platform or codebidi"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex-1 min-w-[200px]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-500"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditingRepo(false); setRepoInput(config.repoName); }}
                  className="px-2.5 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{config.repoName}</span>
                <a
                  href={config.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-sky-500 p-1 flex items-center gap-1 text-[11px] font-sans"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Region */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-400 text-[11px] font-sans block mb-1">AWS Region</span>
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
              <span className="font-semibold text-slate-900 dark:text-white">{config.awsRegion}</span>
            </div>
          </div>

          {/* EC2 Host */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-400 text-[11px] font-sans block mb-1">AWS EC2 Production Host</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-900 dark:text-white truncate">{config.ec2Host}</span>
              <button
                onClick={() => copyText(config.ec2Host, 'ec2')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                aria-label="Copy EC2 host address"
              >
                {copiedKey === 'ec2' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ECR Repo */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 md:col-span-2">
            <span className="text-slate-400 text-[11px] font-sans block mb-1">Amazon ECR Container Registry</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-900 dark:text-white truncate">{config.ecrRepo}</span>
              <button
                onClick={() => copyText(config.ecrRepo, 'ecr')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                aria-label="Copy ECR URI"
              >
                {copiedKey === 'ecr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GitHub Secrets Checklist */}
      <SecretsChecklist secrets={config.secrets} />
    </div>
  );
}
