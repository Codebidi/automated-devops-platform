import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, GitCommit, GitBranch, GitPullRequest, User,
  Calendar, Clock, Server, Tag, Copy, Check, Terminal, ExternalLink
} from 'lucide-react';
import PipelineStepper from '../components/PipelineStepper';
import StatusBadge from '../components/StatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { fetchRunById } from '../api/pipelineApi';
import { formatSha } from '../utils/formatters';

export default function RunDetail() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRunById(id);
        if (isMounted) setRun(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Run not found');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [id]);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={2} />
        <LoadingSkeleton variant="stepper" />
        <LoadingSkeleton variant="log" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <EmptyState
        variant="error"
        title="Pipeline Run Not Found"
        description={error || `Could not find any pipeline run matching #${id}.`}
        actionText="Back to Pipeline Runs"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top back navigation */}
      <div>
        <Link
          to="/runs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to runs list
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Run #{run.runNumber}
            </h1>
            <StatusBadge status={run.status} />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              Duration: {run.durationFormatted}
            </span>
            <span>Started: {run.startedAt}</span>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
          {run.commitMessage}
        </p>
      </div>

      {/* Metadata Panel */}
      <section aria-labelledby="run-metadata-title" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 id="run-metadata-title" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Pipeline Execution Metadata
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs font-mono">
          {/* Commit & Author */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Commit SHA & Author</span>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-900 dark:text-white font-semibold">
                {formatSha(run.commitSha, 10)} ({run.author})
              </span>
              <button
                onClick={() => copyToClipboard(run.commitSha, 'sha')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded"
                aria-label="Copy full commit SHA"
              >
                {copiedKey === 'sha' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Branch & Trigger */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Branch & Trigger</span>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                {run.branch}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-sans font-medium capitalize">
                {run.trigger.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Image Tag */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Docker Image Tag</span>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700 text-slate-900 dark:text-white truncate">
              {run.imageTag || <span className="text-slate-400 italic">None (no image created)</span>}
            </div>
          </div>

          {/* AWS ECR URI */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <span className="text-slate-400 text-[11px] block">AWS ECR Registry URI</span>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-800 dark:text-slate-200 truncate">
                {run.ecrUri || <span className="text-slate-400 italic">Push step skipped</span>}
              </span>
              {run.ecrUri && (
                <button
                  onClick={() => copyToClipboard(run.ecrUri, 'ecr')}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded shrink-0 ml-2"
                  aria-label="Copy ECR URI"
                >
                  {copiedKey === 'ecr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Deployment Host */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Target EC2 Host</span>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700 text-slate-900 dark:text-white truncate">
              {run.ec2Host}
            </div>
          </div>
        </div>
      </section>

      {/* 4-Stage Horizontal Pipeline Stepper and Logs */}
      <section aria-labelledby="pipeline-stages-title" className="space-y-4">
        <h2 id="pipeline-stages-title" className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pipeline Stages &amp; Execution Trace
        </h2>

        <PipelineStepper stages={run.stages} />
      </section>
    </div>
  );
}
