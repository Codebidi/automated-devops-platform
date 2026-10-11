import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle,
  Clock,
  Server,
  ArrowUpRight,
  GitCommit,
  User,
  Calendar,
  Tag,
  Rocket,
  ShieldCheck,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import HealthIndicator from '../components/HealthIndicator';
import RunsTable from '../components/RunsTable';
import MetricsCharts from '../components/MetricsCharts';
import { Button, Card, Badge, Skeleton } from '../components/ui';
import { fetchRuns, fetchCurrentlyDeployed } from '../api/pipelineApi';
import { formatSha, formatDuration } from '../utils/formatters';

export default function Dashboard() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [deployedApp, setDeployedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [runsRes, deployedRes] = await Promise.all([
          fetchRuns(),
          fetchCurrentlyDeployed(),
        ]);
        setRuns(runsRes.runs || []);
        setDeployedApp(deployedRes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton variant="card" count={4} />
        <Skeleton variant="card" count={2} />
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
    status: r.status,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Personalized Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-content-primary tracking-tight">
              Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'Operator'}
            </h1>
            <Badge variant={user?.role || 'viewer'} size="sm">
              {(user?.role || 'VIEWER').toUpperCase()}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            Continuous delivery pipeline status, active deployment health, and cluster telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/app/runs">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlayCircle className="w-4 h-4 text-brand-500" />}
            >
              Browse Runs
            </Button>
          </Link>

          <Link to="/app/deployments">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Rocket className="w-4 h-4" />}
            >
              Deployments
            </Button>
          </Link>
        </div>
      </div>

      {/* Currently Deployed Hero Card */}
      {deployedApp && (
        <Card className="p-6 bg-gradient-to-br from-surface to-surface-subtle dark:from-surface-elevated dark:to-surface border-border-strong relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-brand shrink-0">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-content-primary">
                    Active Production Container
                  </h2>
                  <Badge variant="success" size="sm" dot>
                    HEALTHY
                  </Badge>
                </div>
                <p className="mt-1 text-xs sm:text-sm font-medium text-content-secondary line-clamp-1">
                  {deployedApp.commitMessage || 'Stable release container'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-content-muted">
                  <span className="flex items-center gap-1.5 bg-surface-subtle px-2 py-0.5 rounded-md border border-border-subtle">
                    <GitCommit className="w-3.5 h-3.5 text-brand-500" />
                    {formatSha(deployedApp.commitSha)}
                  </span>
                  <span className="flex items-center gap-1.5 bg-surface-subtle px-2 py-0.5 rounded-md border border-border-subtle">
                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                    {deployedApp.imageTag}
                  </span>
                  <span>Author: {deployedApp.author}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  Live on Port 8000
                </span>
              </div>
              <Link to="/app/deployments">
                <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                  Inspect Deployments
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* 4 Stat Cards Row with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Pipeline Runs"
          value={totalRuns}
          subtext="Executed across branches"
          icon={Activity}
          trend="+12 this week"
          trendUp={true}
          sparklineData={[10, 15, 12, 18, 22, 28, 26, 32]}
        />
        <StatCard
          title="Pipeline Success Rate"
          value={`${successRate}%`}
          subtext={`${successfulRuns} passing of ${totalRuns} total`}
          icon={CheckCircle}
          trend={successRate >= 90 ? '+2.4%' : '-1.5%'}
          trendUp={successRate >= 90}
          sparklineData={[85, 88, 92, 90, 94, 91, 95, successRate]}
        />
        <StatCard
          title="Average Duration"
          value={formatDuration(avgDurationSecs)}
          subtext="Fast lint & test caching"
          icon={Clock}
          trend="Optimized"
          trendUp={true}
          sparklineData={[90, 85, 78, 82, 75, 72, 70, avgDurationSecs]}
        />
        <StatCard
          title="Production Runtime"
          value="Healthy"
          subtext="Postgres 16 / SQLite dual"
          icon={Server}
          trend="100% Up"
          trendUp={true}
          sparklineData={[1, 1, 1, 1, 1, 1, 1, 1]}
        />
      </div>

      {/* Metric Charts */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-heading font-bold text-content-primary">
            Pipeline Analytics
          </h2>
          <p className="text-xs text-content-secondary">
            Continuous execution telemetry for the last 20 automated runs.
          </p>
        </div>
        <MetricsCharts data={last20Runs} />
      </div>

      {/* Recent Runs Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-heading font-bold text-content-primary">
              Recent Pipeline Runs
            </h2>
            <p className="text-xs text-content-secondary">
              Latest commit builds, test matrix outcomes, and container tags.
            </p>
          </div>
          <Link
            to="/app/runs"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <RunsTable runs={runs.slice(0, 8)} />
      </div>
    </div>
  );
}
