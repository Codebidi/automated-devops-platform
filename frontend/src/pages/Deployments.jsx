import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle2, History, AlertCircle, RotateCcw, Shield } from 'lucide-react';
import DeploymentTimeline from '../components/DeploymentTimeline';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Modal, Input, Card, Skeleton, EmptyState } from '../components/ui';
import { fetchDeployments, rollbackDeployment } from '../api/pipelineApi';
import { formatSha } from '../utils/formatters';

export default function Deployments() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [rollingBack, setRollingBack] = useState(false);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const data = await fetchDeployments();
      setDeployments(data || []);
    } catch (err) {
      console.error('Failed to load deployments', err);
      toast.error('Failed to load deployment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const handleInitiateRollback = (item) => {
    setSelectedTarget(item);
    setTypedConfirm('');
    setModalOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedTarget || typedConfirm !== 'ROLLBACK') return;
    setRollingBack(true);
    try {
      await rollbackDeployment(selectedTarget.runId);
      setModalOpen(false);
      toast.success(
        `Rollback triggered! Successfully restored commit ${formatSha(selectedTarget.commitSha)} as live.`
      );
      await loadDeployments();
    } catch (err) {
      toast.error(err.message || 'Failed to trigger rollback');
    } finally {
      setRollingBack(false);
    }
  };

  const currentLive = deployments.find(d => d.isCurrentLive);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-content-primary tracking-tight">
          Deployments & Rollbacks
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          Audit chronological container promotions and perform verified single-command rollbacks.
        </p>
      </div>

      {/* Current Active Release Banner */}
      {currentLive && (
        <Card className="p-6 bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-transparent border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Active Live Release
                </span>
                <p className="font-heading font-bold text-sm text-content-primary">
                  {currentLive.commitMessage}
                </p>
                <p className="text-xs font-mono text-content-muted mt-0.5">
                  SHA: {formatSha(currentLive.commitSha)} • Tag: {currentLive.imageTag}
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-content-secondary font-mono">
              Deployed: {new Date(currentLive.timestamp).toLocaleString()}
            </div>
          </div>
        </Card>
      )}

      {/* Deployment Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-heading font-bold text-content-primary">
              Promotion Timeline
            </h2>
          </div>
          <span className="text-xs text-content-muted">
            {deployments.length} releases recorded
          </span>
        </div>

        {loading ? (
          <Skeleton variant="card" count={3} />
        ) : (
          <DeploymentTimeline
            deployments={deployments}
            onInitiateRollback={handleInitiateRollback}
            isAdmin={isAdmin}
          />
        )}
      </Card>

      {/* Rollback Typed Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Emergency Rollback"
        description="This will redirect active live production traffic to an earlier container image."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Target Release</span>
              Commit: <strong className="font-mono">{formatSha(selectedTarget?.commitSha)}</strong> (
              {selectedTarget?.imageTag})
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-secondary block">
              Type <strong className="text-rose-500 font-mono">ROLLBACK</strong> to confirm this operation:
            </label>
            <Input
              placeholder="Type ROLLBACK"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={rollingBack}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRollback}
              isLoading={rollingBack}
              disabled={typedConfirm !== 'ROLLBACK' || rollingBack}
            >
              Execute Rollback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
