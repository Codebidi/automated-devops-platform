import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  GitCommit,
  GitBranch,
  GitPullRequest,
  User,
  Calendar,
  Clock,
  Server,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import PipelineStepper from '../components/PipelineStepper';
import { useToast } from '../context/ToastContext';
import { Button, Card, Badge, Skeleton, EmptyState } from '../components/ui';
import { fetchRunById } from '../api/pipelineApi';
import { formatSha } from '../utils/formatters';

export default function RunDetail() {
  const { id } = useParams();
  const toast = useToast();
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
    return () => {
      isMounted = false;
    };
  }, [id]);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="card" count={2} />
        <Skeleton variant="card" count={1} />
      </div>
    );
  }

  if (error || !run) {
    return (
      <EmptyState
        title="Pipeline Run Not Found"
        description={error || `Pipeline run #${id} does not exist.`}
        action={
          <Link to="/app/runs">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Runs
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Link to="/app/runs">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Runs
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-content-primary tracking-tight">
                Run #{run.runNumber}
              </h1>
              <Badge
                variant={run.status === 'success' ? 'success' : run.status === 'failed' ? 'danger' : 'brand'}
                size="sm"
                dot
              >
                {run.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-content-secondary line-clamp-1 mt-0.5">
              {run.commitMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata Overview Card */}
      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Commit SHA
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(run.commitSha, 'sha')}
              className="mt-1 font-mono font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>{formatSha(run.commitSha)}</span>
              {copiedKey === 'sha' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Branch
            </span>
            <span className="mt-1 inline-flex items-center gap-1 font-mono text-content-primary">
              <GitBranch className="w-3.5 h-3.5 text-brand-500" />
              {run.branch}
            </span>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Trigger
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-content-primary">
              <GitPullRequest className="w-3.5 h-3.5 text-purple-500" />
              {run.trigger}
            </span>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Duration
            </span>
            <span className="mt-1 font-mono text-content-primary">
              {run.durationFormatted}
            </span>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Author
            </span>
            <span className="mt-1 text-content-primary font-medium">
              {run.author}
            </span>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Image Tag
            </span>
            <span className="mt-1 font-mono text-emerald-600 dark:text-emerald-400">
              {run.imageTag || '—'}
            </span>
          </div>

          <div>
            <span className="text-content-muted block uppercase tracking-wider text-[10px] font-semibold">
              Image URI
            </span>
            <span className="mt-1 font-mono text-xs text-content-secondary break-all">
              {run.ecrUri || 'not reported yet'}
            </span>
          </div>
        </div>
      </Card>

      {/* Stepper and Terminal Logs */}
      <PipelineStepper stages={run.stages || []} />
    </div>
  );
}
