import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, CheckCircle, Clock, Server, ArrowUpRight,
  GitCommit, User, Calendar, Tag
} from 'lucide-react';
import StatCard from '../components/StatCard';
import HealthIndicator from '../components/HealthIndicator';
import RunsTable from '../components/RunsTable';
import MetricsCharts from '../components/MetricsCharts';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { fetchRuns, fetchCurrentlyDeployed } from '../api/pipelineApi';
import { formatSha, formatDuration } from '../utils/formatters';

export default function Dashboard() {
  const [runs, setRuns] = useState([]);
  const [deployedApp, setDeployedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [runsRes, deployedRes] = await Promise.all([
          fetchRuns(),
          fetchCurrentlyDeployed()
        ]);
        setRuns(runsRes.runs);
        setDeployedApp(deployedRes);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={4} />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  const totalRuns = runs.length;
  const successfulRuns = runs.filter(r => r.status === 'success').length;
  const successRate = totalRuns ? Math.round((successfulRuns / totalRuns) * 100) : 0;
  const completedRuns = runs.filter(r => r.status !== 'running');
  const avgDurationSecs = completedRuns.length
    ? Math.round(completedRuns.reduce((acc, r) => acc + r.duration, 0) / completedRuns.length)
    : 0;

  const last20Runs = [...runs.slice(0, 20)].reverse().map(r => ({
    name: `#${r.runNumber}`,
    duration: r.duration,
    status: r.status
  }));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          CI/CD Pipeline Overview
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time metrics, automated deployment status, and system health checks.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pipeline Runs"
          value={totalRuns}
          subtext="28 runs recorded"
          icon={Activity}
          trend="+12% this week"
          trendUp={true}
        />
        <StatCard
          title="Pipeline Success Rate"
          value={`${successRate}%`}
          subtext={`${successfulRuns} successful out of ${totalRuns}`}
          icon={CheckCircle}
          trend={successRate > 75 ? 'Healthy' : 'Needs attention'}
          trendUp={successRate > 75}
        />
        <StatCard
          title="Avg. Pipeline Duration"
          value={formatDuration(avgDurationSecs)}
          subtext="From Git push to EC2 deploy"
          icon={Clock}
          trend="-15s vs last month"
          trendUp={true}
        />
        <StatCard
          title="Last Deployment Time"
          value={deployedApp?.deployedAt || '18m ago'}
          subtext="Target: AWS EC2 us-east-1"
          icon={Server}
        />
      </div>

      {/* Currently Deployed Live Application Card */}
      {deployedApp && (
        <section aria-labelledby="currently-deployed-title" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                <h2 id="currently-deployed-title" className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Currently Live In Production
                </h2>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                {deployedApp.commitMessage}
              </p>
            </div>

            <HealthIndicator status={deployedApp.healthStatus} endpoint={deployedApp.healthCheckEndpoint} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block mb-0.5">Commit SHA</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <GitCommit className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {formatSha(deployedApp.commitSha)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Author</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {deployedApp.author}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Docker Image Tag</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {deployedApp.imageTag}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Deployed At</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {deployedApp.deployedAt}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Recharts Metrics */}
      <MetricsCharts data={last20Runs} />

      {/* Recent Runs Table (Latest 10) */}
      <section aria-labelledby="recent-runs-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="recent-runs-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Pipeline Runs
            </h2>
            <p className="text-xs text-slate-500">Showing the latest 10 runs</p>
          </div>
          <Link
            to="/runs"
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
          >
            View all runs
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <RunsTable runs={runs.slice(0, 10)} compact={true} />
      </section>
    </div>
  );
}
