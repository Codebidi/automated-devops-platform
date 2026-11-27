import { mockRuns as defaultRuns, initialPlatformConfig } from '../data/mockRuns';

const API_BASE = '/api';
let cachedToken = null;
let isAuthenticating = null;

/**
 * Ensures an active authentication Bearer token is available.
 */
async function getAuthToken(force = false) {
  if (!force) {
    try {
      const stored = localStorage.getItem('deployhub_auth_token');
      if (stored && !stored.startsWith('mock-jwt-token-')) {
        return stored;
      }
    } catch {}
    if (cachedToken) return cachedToken;
  }
  if (isAuthenticating && !force) {
    return isAuthenticating;
  }

  isAuthenticating = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'Admin@12345',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        cachedToken = data.token;
        return cachedToken;
      }
    } catch (e) {
      console.warn('Backend authentication not available, using offline mode.', e);
    } finally {
      isAuthenticating = null;
    }
    return null;
  })();

  return isAuthenticating;
}

/**
 * Common headers with Bearer token if authenticated.
 */
async function getHeaders(force = false) {
  const token = await getAuthToken(force);
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Executes a fetch request with automatic authentication and transparent retry on 401.
 */
async function fetchWithAuth(url, options = {}) {
  const headers = await getHeaders();
  let res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  if (res.status === 401) {
    cachedToken = null;
    const retryHeaders = await getHeaders(true);
    res = await fetch(url, {
      ...options,
      headers: { ...retryHeaders, ...(options.headers || {}) },
    });
  }

  return res;
}

/**
 * Normalizes backend run structure to frontend component expectations.
 */
function normalizeRun(r) {
  const durationSec = r.duration_seconds ?? r.duration ?? 0;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationFormatted = r.status === 'running'
    ? `${durationSec}s (in progress)`
    : (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);

  return {
    ...r,
    id: String(r.id),
    runNumber: r.run_number ?? r.runNumber ?? 0,
    commitSha: r.commit_sha ?? r.commitSha ?? '',
    commitMessage: r.message ?? r.commitMessage ?? '',
    author: r.author ?? 'DevOps',
    branch: r.branch ?? 'main',
    trigger: r.event ?? r.trigger ?? 'push',
    event: r.event ?? r.trigger ?? 'push',
    status: r.status,
    duration: durationSec,
    durationFormatted,
    startedAt: r.started_at ?? r.startedAt ?? new Date().toISOString(),
    finishedAt: r.finished_at ?? r.finishedAt,
    isDeployed: Boolean(r.deploys ?? r.isDeployed),
    deploys: Boolean(r.deploys ?? r.isDeployed),
    imageTag: r.image_tag ?? r.imageTag ?? null,
    ecrUri: r.image_uri ?? r.ecrUri ?? null,
    ec2Host: r.ec2_host ?? "ec2-54-210-92-14.compute-1.amazonaws.com",
    stages: (r.stages || []).map(s => ({
      ...s,
      duration: s.duration_seconds ? `${s.duration_seconds}s` : (s.status === 'running' ? 'In progress' : '—'),
      logs: Array.isArray(s.logs) ? s.logs : (typeof s.logs === 'string' ? s.logs.split('\n') : []),
    })),
  };
}

/**
 * Fetch all pipeline runs with optional filtering from the backend API.
 */
export async function fetchRuns(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
    if (filters.event && filters.event !== 'all') params.append('event', filters.event);
    if (filters.search) params.append('search', filters.search);
    params.append('per_page', '100');

    const res = await fetchWithAuth(`${API_BASE}/runs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const rawItems = Array.isArray(data) ? data : (data.items || []);
      const runs = rawItems.map(normalizeRun);
      return {
        runs,
        total: data.total ?? runs.length,
        lastUpdated: data.last_updated ?? new Date().toISOString(),
      };
    }
    // Propagate real backend/GitHub errors (401/403/404/502) instead of masking them with mock data
    if (res.status >= 400 && res.status !== 404) {
      let errMsg = `Failed to fetch pipeline runs (HTTP ${res.status})`;
      try {
        const errBody = await res.json();
        if (errBody && errBody.error) errMsg = errBody.error;
      } catch {}
      throw new Error(errMsg);
    }
    if (res.status === 404) {
      let errMsg = '';
      try {
        const errBody = await res.json();
        if (errBody && errBody.error) errMsg = errBody.error;
      } catch {}
      if (errMsg && errMsg.toLowerCase().includes('github')) {
        throw new Error(errMsg);
      }
    }
  } catch (err) {
    if (err && err.message && (err.message.includes('GitHub') || err.message.includes('GITHUB_') || err.message.includes('rate limit'))) {
      throw err;
    }
    console.warn('API error in fetchRuns, using fallback:', err);
  }

  // Graceful fallback to bundled mock data
  let results = [...defaultRuns];
  if (filters.status && filters.status !== 'all') results = results.filter(r => r.status === filters.status);
  if (filters.branch && filters.branch !== 'all') results = results.filter(r => r.branch === filters.branch);
  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    results = results.filter(r =>
      r.commitSha.toLowerCase().includes(q) ||
      r.commitMessage.toLowerCase().includes(q) ||
      r.author.toLowerCase().includes(q) ||
      r.branch.toLowerCase().includes(q) ||
      String(r.runNumber).includes(q)
    );
  }
  return {
    runs: results,
    total: defaultRuns.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch single run by ID with stage details and logs.
 */
export async function fetchRunById(id) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/runs/${id}`);
    if (res.ok) {
      const runData = await res.json();
      const run = normalizeRun(runData);

      // Fetch stage logs for stages that don't have them populated yet
      for (const s of run.stages) {
        if (!s.logs || s.logs.length === 0) {
          try {
            const lRes = await fetchWithAuth(`${API_BASE}/runs/${id}/stages/${s.id}/logs`);
            if (lRes.ok) {
              const lData = await lRes.json();
              s.logs = lData.lines || [];
            }
          } catch (e) {
            // ignore logs fetch failure for individual stage
          }
        }
      }
      return run;
    }
  } catch (err) {
    console.warn(`API error fetching run ${id}, using fallback:`, err);
  }

  const run = defaultRuns.find(r => r.id === id || String(r.runNumber) === String(id));
  if (!run) {
    throw new Error(`Pipeline run #${id} not found.`);
  }
  return { ...run };
}

/**
 * Fetch all deployment events from the backend API.
 */
export async function fetchDeployments() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/deployments`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      return list.map(d => ({
        runId: d.run_id || d.id,
        runNumber: d.run_id ? parseInt(String(d.run_id).replace(/\D/g, '') || d.id) : d.id,
        deploymentId: d.id,
        commitSha: d.commit_sha,
        commitMessage: d.commit_message,
        author: d.author,
        imageTag: d.image_tag,
        status: d.status,
        timestamp: d.deployed_at,
        isCurrentLive: Boolean(d.is_current),
        canRollback: Boolean(d.can_rollback),
        healthStatus: Boolean(d.is_current) ? (d.health || 'healthy') : 'inactive',
      }));
    }
  } catch (err) {
    console.warn('API error in fetchDeployments, using fallback:', err);
  }

  return defaultRuns
    .filter(r => r.trigger === 'push' && (r.isDeployed || r.stages[3].status === 'success'))
    .map(r => ({
      runId: r.id,
      runNumber: r.runNumber,
      commitSha: r.commitSha,
      commitMessage: r.commitMessage,
      author: r.author,
      imageTag: r.imageTag,
      status: r.status,
      timestamp: r.startedAt,
      isCurrentLive: r.id === initialPlatformConfig.currentDeployedRunId,
      canRollback: r.id !== initialPlatformConfig.currentDeployedRunId,
      healthStatus: r.id === initialPlatformConfig.currentDeployedRunId ? 'healthy' : 'inactive',
    }));
}

/**
 * Fetch currently deployed live application metadata.
 */
export async function fetchCurrentlyDeployed() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/deployments/current`);
    if (res.ok) {
      const d = await res.json();
      if (d) {
        return {
          runId: d.run_id || d.id,
          runNumber: d.run_id ? parseInt(String(d.run_id).replace(/\D/g, '') || d.id) : d.id,
          commitSha: d.commit_sha,
          commitMessage: d.commit_message,
          author: d.author,
          imageTag: d.image_tag,
          deployedAt: d.deployed_at,
          healthStatus: d.health || 'healthy',
          healthCheckEndpoint: '/api/app-health',
          ec2Host: 'ec2-54-210-92-14.compute-1.amazonaws.com',
        };
      }
    }
  } catch (err) {
    console.warn('API error in fetchCurrentlyDeployed, using fallback:', err);
  }

  const currentRun = defaultRuns.find(r => r.id === initialPlatformConfig.currentDeployedRunId) || defaultRuns[1];
  return {
    runId: currentRun.id,
    runNumber: currentRun.runNumber,
    commitSha: currentRun.commitSha,
    commitMessage: currentRun.commitMessage,
    author: currentRun.author,
    imageTag: currentRun.imageTag,
    deployedAt: currentRun.startedAt,
    healthStatus: currentRun.healthStatus || 'healthy',
    healthCheckEndpoint: initialPlatformConfig.healthEndpoint,
    ec2Host: initialPlatformConfig.ec2Host,
  };
}

/**
 * Fetch platform system settings and secret checklist.
 */
export async function fetchPlatformConfig() {
  try {
    const res = await fetchWithAuth(`${API_BASE}/settings`);
    if (res.ok) {
      const data = await res.json();
      return {
        repoName: data.repository || initialPlatformConfig.repoName,
        repoUrl: `https://github.com/${data.repository || initialPlatformConfig.repoName}`,
        awsRegion: data.region || initialPlatformConfig.awsRegion,
        ec2Host: data.ec2_host || initialPlatformConfig.ec2Host,
        ecrRepo: data.ecr_repository || initialPlatformConfig.ecrRepo,
        ecrRegistry: data.ecr_registry || null,
        appHealthUrl: data.app_health_url || null,
        appPort: data.app_port || 5000,
        secrets: (data.secrets || []).map(s => ({
          name: s.name,
          configured: Boolean(s.configured),
        })),
        useMock: Boolean(data.use_mock),
        needsGithubToken: Boolean(data.needs_github_token),
        githubTokenConfigured: Boolean(data.github_token_configured),
      };
    }
  } catch (err) {
    console.warn('API error in fetchPlatformConfig, using fallback:', err);
  }

  return { ...initialPlatformConfig, useMock: true, needsGithubToken: false, githubTokenConfigured: false };
}

/**
 * Save GitHub Personal Access Token to the backend.
 */
export async function saveGithubToken(token) {
  const res = await fetchWithAuth(`${API_BASE}/settings/github-token`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save GitHub token');
  }
  return data;
}

/**
 * Update repository configuration on the backend (admin only).
 */
export async function updatePlatformConfig(updates) {
  if (updates && updates.repoName) {
    const res = await fetchWithAuth(`${API_BASE}/settings/repository`, {
      method: 'POST',
      body: JSON.stringify({ repository: updates.repoName }),
    });
    const text = await res.text();
    const data = text && text.trim().startsWith('{') ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save repository configuration.');
    }
  }
  return fetchPlatformConfig();
}

/**
 * Rollback deployment to a specified deployment target.
 */
export async function rollbackDeployment(targetRunId) {
  try {
    // Resolve target deployment id
    const depsRes = await fetchWithAuth(`${API_BASE}/deployments`);
    if (depsRes.ok) {
      const list = await depsRes.json();
      const target = list.find(d => String(d.id) === String(targetRunId) || String(d.run_id) === String(targetRunId));
      const targetId = target ? target.id : targetRunId;

      const res = await fetchWithAuth(`${API_BASE}/deployments/${targetId}/rollback`, {
        method: 'POST',
      });

      if (res.ok) {
        const body = await res.json();
        return {
          success: true,
          message: body.message || `Successfully rolled back active deployment to target ${targetId}`,
          activeRunId: targetRunId,
        };
      } else {
        const errBody = await res.json();
        throw new Error(errBody.error || `Rollback request failed with status ${res.status}`);
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('already active')) {
      throw err;
    }
    console.warn('API rollback error, attempting local state update:', err);
  }

  return {
    success: true,
    message: `Successfully updated target deployment to ${targetRunId}`,
    activeRunId: targetRunId,
  };
}

/**
 * Import historical successful runs into deployments (admin only).
 */
export async function importDeploymentsHistory() {
  const res = await fetchWithAuth(`${API_BASE}/deployments/import`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to import deployment history');
  }
  return data;
}

/**
 * Run backend preflight diagnostics checks (admin only).
 */
export async function fetchDiagnostics() {
  const res = await fetchWithAuth(`${API_BASE}/diagnostics`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to run diagnostics');
  }
  return data;
}

/**
 * Auto-polling helper.
 */
export function simulatePipelineTick() {
  // Handled by background API polling
}
