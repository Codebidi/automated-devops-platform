# Automated CI/CD Deployment Platform Dashboard

A clean, responsive developer dashboard for monitoring real-time CI/CD pipelines triggered by Git pushes and pull requests. Tracks every pipeline stage (Lint + Test, Build Docker Image, Push to ECR, Deploy to EC2), monitors live application health endpoints, provides historical audit logs, and allows instant production rollbacks.

---

## 🛠 Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (with native dark/light theme support)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Charts & Telemetry**: Recharts
- **Data Layer**: Modular API abstraction (`src/api/pipelineApi.js`) with realistic mock state (`src/data/mockRuns.js`)

---

## 🚀 Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Production Build
Compile and bundle optimized static assets for production:
```bash
npm run build
```

### 4. Preview Production Build
Preview the generated production build locally:
```bash
npm run preview
```

---

## 📁 Project Structure

```text
cicd-dashboard/
├── index.html              # Entry HTML with typography and viewport settings
├── package.json            # Scripts & project dependencies
├── vite.config.js          # Vite config with React plugin
├── tailwind.config.js      # Tailwind configuration with class-based dark mode
├── postcss.config.js       # PostCSS configuration
├── README.md               # Architecture documentation and guides
└── src/
    ├── main.jsx            # Application root mounting BrowserRouter
    ├── App.jsx             # Shell layout, theme state, routes & polling hook
    ├── index.css           # Global typography & custom scrollbars
    ├── api/
    │   └── pipelineApi.js  # Clean async API layer (swappable for GitHub Actions)
    ├── data/
    │   └── mockRuns.js     # 28 realistic runs with stages, logs, and configs
    ├── hooks/
    │   └── usePolling.js   # 10-second polling & manual refresh hook
    ├── utils/
    │   └── formatters.js   # SHA, duration, and status styling formatters
    ├── components/
    │   ├── Sidebar.jsx           # Responsive collapsible sidebar navigation
    │   ├── Topbar.jsx            # Theme toggle, live timestamp & refresh button
    │   ├── StatCard.jsx          # Metrics summary card
    │   ├── StatusBadge.jsx       # Accessible status pill (success/failed/running/skipped)
    │   ├── PipelineStepper.jsx   # 4-stage horizontal stepper with selection
    │   ├── LogViewer.jsx         # Collapsible console log viewer with syntax styles
    │   ├── RunsTable.jsx         # Accessible pipeline table with PR tags
    │   ├── DeploymentTimeline.jsx# Release timeline with rollback actions
    │   ├── HealthIndicator.jsx   # Production health check badge & probe status
    │   ├── ConfirmModal.jsx      # Accessible keyboard-aware confirmation dialog
    │   ├── EmptyState.jsx        # Configurable empty and error state display
    │   └── LoadingSkeleton.jsx   # Skeleton loaders for cards, tables, steppers
    └── pages/
        ├── Dashboard.jsx   # High-level overview, live app card & Recharts
        ├── Runs.jsx        # Searchable, filterable full pipeline runs table
        ├── RunDetail.jsx   # Run metadata panel & 4-stage log stepper
        ├── Deployments.jsx # Deployments timeline with rollback flow
        └── Settings.jsx    # Infrastructure targets & GitHub secrets checklist
```

---

## 🔌 Replacing Mock API with GitHub Actions REST API

All data access is intentionally encapsulated in `src/api/pipelineApi.js`. You can swap the mock functions with real GitHub REST API calls without modifying any UI components or pages.

### Step 1: Configure Environment Variables
Create a `.env` file in `cicd-dashboard/`:
```env
VITE_GITHUB_API_URL=https://api.github.com
VITE_GITHUB_REPO_OWNER=antigravity
VITE_GITHUB_REPO_NAME=ai-devops-platform
VITE_GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
```

### Step 2: Endpoint Mapping in `src/api/pipelineApi.js`

1. **Pipeline Runs (`fetchRuns`)**:
   - **GitHub Endpoint**: `GET /repos/{owner}/{repo}/actions/runs`
   - **Mapping**:
     ```javascript
     const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
       headers: { Authorization: `Bearer ${token}` }
     });
     const data = await res.json();
     return {
       runs: data.workflow_runs.map(run => ({
         id: String(run.id),
         runNumber: run.run_number,
         commitSha: run.head_sha,
         commitMessage: run.head_commit?.message || '',
         author: run.head_commit?.author?.name || run.actor.login,
         branch: run.head_branch,
         trigger: run.event === 'pull_request' ? 'pull_request' : 'push',
         status: run.status === 'completed' 
           ? (run.conclusion === 'success' ? 'success' : 'failed') 
           : 'running',
         duration: Math.round((new Date(run.updated_at) - new Date(run.run_started_at)) / 1000),
         startedAt: new Date(run.run_started_at).toLocaleString(),
       })),
       total: data.total_count,
       lastUpdated: new Date().toISOString()
     };
     ```

2. **Stage Execution & Logs (`fetchRunById`)**:
   - **GitHub Endpoint**: `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`
   - **Job Logs**: `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
   - **Mapping**: Each workflow job maps to one of the 4 stages (`Lint + Test`, `Build Docker Image`, `Push to ECR`, `Deploy to EC2`). Any steps occurring after a failed step automatically carry a `skipped` conclusion in GitHub Actions.

3. **Deployments History (`fetchDeployments`)**:
   - **GitHub Endpoint**: `GET /repos/{owner}/{repo}/deployments`
   - **Deployment Statuses**: `GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`
   - **Mapping**: Map `environment === 'production'` entries to the timeline list.

4. **Rollback Trigger (`rollbackDeployment`)**:
   - **GitHub Endpoint**: `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`
   - **Payload**:
     ```json
     {
       "ref": "main",
       "inputs": {
         "action": "rollback",
         "target_sha": "7f3b89a"
       }
     }
     ```

5. **Secrets Checklist (`fetchPlatformConfig`)**:
   - **GitHub Endpoint**: `GET /repos/{owner}/{repo}/actions/secrets`
   - **Security**: The GitHub API returns secret names and updated timestamps only (secret values are never returned by the GitHub API, preserving security).

---

## 🎨 Design & Accessibility Features

- **Developer Aesthetics**: Minimalist dark/light mode inspired by GitHub Actions and Vercel.
- **Accessibility**: 
  - Semantic HTML (`<main>`, `<header>`, `<nav>`, `<aside>`, `<section>`, `<table>`).
  - Colors are never the sole indicator of status (always paired with icons and text labels).
  - Proper ARIA roles, live regions, and focus outlines (`focus-visible:ring-2`).
  - Confirmation modals support keyboard navigation (`Escape` dismissal and tab trapping).
- **Responsiveness**: Collapsible off-canvas mobile drawer under 768px with touch-friendly tap targets.
