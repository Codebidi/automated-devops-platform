import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, X, GitBranch } from 'lucide-react';
import RunsTable from '../components/RunsTable';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { fetchRuns } from '../api/pipelineApi';

export default function Runs() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Load runs with filters
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchRuns({
          status: statusFilter,
          branch: branchFilter,
          search: search
        });
        if (isMounted) setRuns(res.runs);
      } catch (err) {
        console.error("Failed to load runs", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [statusFilter, branchFilter, search]);

  const branches = [
    'all',
    'main',
    'feature/auth-jwt',
    'fix/test-flaky',
    'fix/ingress-timeout',
    'perf/db-index',
    'feature/webhooks'
  ];

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setBranchFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || branchFilter !== 'all';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Pipeline Runs
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Historical log of automated builds, test executions, and deployments.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by commit message, SHA, author..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Search pipeline runs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="status-filter" className="text-xs text-slate-500 font-medium">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>

          {/* Branch dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="branch-filter" className="text-xs text-slate-500 font-medium">Branch:</label>
            <select
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {branches.map(b => (
                <option key={b} value={b}>
                  {b === 'all' ? 'All Branches' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Runs count info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white font-mono">{runs.length}</strong> matching runs
        </span>
      </div>

      {/* Main Table or Loading/Empty */}
      {loading ? (
        <LoadingSkeleton variant="table" count={8} />
      ) : runs.length === 0 ? (
        <EmptyState
          title="No pipeline runs match your filters"
          description="Try selecting a different status or branch filter, or clearing your search term."
          actionText="Reset all filters"
          onAction={resetFilters}
        />
      ) : (
        <RunsTable runs={runs} />
      )}
    </div>
  );
}
