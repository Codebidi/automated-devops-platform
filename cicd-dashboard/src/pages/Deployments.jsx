import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle2, History, AlertCircle } from 'lucide-react';
import DeploymentTimeline from '../components/DeploymentTimeline';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { fetchDeployments, rollbackDeployment } from '../api/pipelineApi';
import { formatSha } from '../utils/formatters';

export default function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadDeployments = async () => {
    try {
      const data = await fetchDeployments();
      setDeployments(data);
    } catch (err) {
      console.error("Failed to load deployments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const handleInitiateRollback = (item) => {
    setSelectedTarget(item);
    setModalOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedTarget) return;
    setRollingBack(true);
    try {
      const res = await rollbackDeployment(selectedTarget.runId);
      setModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Rollback triggered! Successfully designated commit ${formatSha(selectedTarget.commitSha)} as live production version.`
      });
      // Refresh deployments list
      await loadDeployments();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to rollback deployment'
      });
    } finally {
      setRollingBack(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Production Deployments
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Immutable release history on AWS EC2 with instant one-click rollback capabilities.
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Timeline Content */}
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton variant="card" count={3} />
        </div>
      ) : deployments.length === 0 ? (
        <EmptyState
          title="No deployments found"
          description="Successful pushes to main automatically record deployment events here."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Deployment Audit Log
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {deployments.length} releases available
            </span>
          </div>

          <DeploymentTimeline
            deployments={deployments}
            onInitiateRollback={handleInitiateRollback}
          />
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modalOpen}
        title="Confirm Production Rollback"
        description={
          selectedTarget
            ? `Are you sure you want to rollback production to commit ${formatSha(selectedTarget.commitSha)} (${selectedTarget.imageTag})? The EC2 container will switch immediately.`
            : 'Are you sure you want to rollback?'
        }
        confirmText="Confirm Rollback"
        cancelText="Cancel"
        isDestructive={false}
        isLoading={rollingBack}
        onConfirm={handleConfirmRollback}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
