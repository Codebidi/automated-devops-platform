import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, X, GitBranch, Layers } from 'lucide-react';
import RunsTable from '../components/RunsTable';
import { Button, Input, Select, Tabs, Skeleton, EmptyState, Card } from '../components/ui';
import { fetchRuns } from '../api/pipelineApi';

export default function Runs() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetchRuns({
          status: statusFilter,
          branch: branchFilter,
          search: search,
        });
        if (isMounted) setRuns(res.runs || []);
      } catch (err) {
        console.error('Failed to load runs', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [statusFilter, branchFilter, search]);

  const branches = [
    { id: 'all', label: 'All Branches' },
    { id: 'main', label: 'main' },
    { id: 'feature/auth-jwt', label: 'feature/auth-jwt' },
    { id: 'fix/test-flaky', label: 'fix/test-flaky' },
    { id: 'fix/ingress-timeout', label: 'fix/ingress-timeout' },
    { id: 'perf/db-index', label: 'perf/db-index' },
    { id: 'feature/webhooks', label: 'feature/webhooks' },
  ];

  const statusTabs = [
    { id: 'all', label: 'All Runs' },
    { id: 'success', label: 'Success' },
    { id: 'running', label: 'Running' },
    { id: 'failed', label: 'Failed' },
  ];

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setBranchFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || branchFilter !== 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-content-primary tracking-tight">
          Pipeline Runs
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          Track continuous integration builds, linting matrix outcomes, and deployment logs.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Segmented Status Tabs */}
          <Tabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={setStatusFilter}
          />

          {/* Search & Branch Select */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search commit or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                onClear={() => setSearch('')}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-4 h-4" />}
                className="text-xs text-content-muted hover:text-content-primary"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results Table */}
      {loading ? (
        <Card className="p-6">
          <Skeleton variant="card" count={4} />
        </Card>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No Matching Runs"
          description={
            hasActiveFilters
              ? 'No pipeline runs match the selected filters. Try clearing your search or status filter.'
              : 'No pipeline executions found.'
          }
          action={
            hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear Active Filters
              </Button>
            )
          }
        />
      ) : (
        <RunsTable runs={runs} />
      )}
    </div>
  );
}
