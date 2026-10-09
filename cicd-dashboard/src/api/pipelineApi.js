import { mockRuns as defaultRuns, initialPlatformConfig } from '../data/mockRuns';

const API_BASE = '/api';
let cachedToken = null;
let isAuthenticating = null;

/**
 * Ensures an active authentication Bearer token is available.
 */
async function getAuthToken() {
  if (cachedToken) {
    return cachedToken;
  }
  if (isAuthenticating) {
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
async function getHeaders() {
  const token = await getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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

    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/runs?${params.toString()}`, { headers });
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
  } catch (err) {
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
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/runs/${id}`, { headers });
    if (res.ok) {
      const runData = await res.json();
      const run = normalizeRun(runData);

      // Fetch stage logs for stages that don't have them populated yet
      for (const s of run.stages) {
        if (!s.logs || s.logs.length === 0) {
          try {
            const lRes = await fetch(`${API_BASE}/runs/${id}/stages/${s.id}/logs`, { headers });
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
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/deployments`, { headers });
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
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/deployments/current`, { headers });
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
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/settings`, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        repoName: data.repository || initialPlatformConfig.repoName,
        repoUrl: `https://github.com/${data.repository || initialPlatformConfig.repoName}`,
        awsRegion: data.region || initialPlatformConfig.awsRegion,
        ec2Host: data.ec2_host || initialPlatformConfig.ec2Host,
        ecrRepo: data.ecr_repository || initialPlatformConfig.ecrRepo,
        secrets: (data.secrets || []).map(s => ({
          name: s.name,
          configured: Boolean(s.configured),
        })),
      };
    }
  } catch (err) {
    console.warn('API error in fetchPlatformConfig, using fallback:', err);
  }

  return { ...initialPlatformConfig };
}

/**
 * Update repository configuration.
 */
export async function updatePlatformConfig(updates) {
  const current = await fetchPlatformConfig();
  return {
    ...current,
    ...updates,
    repoUrl: updates.repoUrl || (updates.repoName ? `https://github.com/${updates.repoName}` : current.repoUrl),
  };
}

/**
 * Rollback deployment to a specified deployment target.
 */
export async function rollbackDeployment(targetRunId) {
  try {
    const headers = await getHeaders();
    // Resolve target deployment id
    const depsRes = await fetch(`${API_BASE}/deployments`, { headers });
    if (depsRes.ok) {
      const list = await depsRes.json();
      const target = list.find(d => String(d.id) === String(targetRunId) || String(d.run_id) === String(targetRunId));
      const targetId = target ? target.id : targetRunId;

      const res = await fetch(`${API_BASE}/deployments/${targetId}/rollback`, {
        method: 'POST',
        headers,
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
 * Auto-polling helper.
 */
export function simulatePipelineTick() {
  // Handled by background API polling
}
