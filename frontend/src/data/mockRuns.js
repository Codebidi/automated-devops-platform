// Mock Data for Automated CI/CD Deployment Platform
// Contains 28 realistic pipeline runs with diverse statuses, stages, and logs.

const baseLogs = {
  testSuccess: `[00:00:01] \u25b6 git clone --depth=1 https://github.com/codebidi/ai-devops-platform.git .
[00:00:03] \u25b6 Setup Node.js v20.12.2 and npm v10.5.0
[00:00:06] \u25b6 npm ci --prefer-offline --no-audit
[00:00:15] added 482 packages in 8.4s
[00:00:16] \u25b6 npm run lint
[00:00:20] \u2714 ESLint passed with 0 warnings, 0 errors
[00:00:21] \u25b6 npm run test -- --coverage
[00:00:35] PASS src/api/pipeline.test.js
[00:00:38] PASS src/deploy/ec2.test.js
[00:00:41] PASS src/auth/jwt.test.js
[00:00:42] Test Suites: 12 passed, 12 total | Tests: 98 passed, 98 total
[00:00:43] Coverage: 92.4% statements, 88.6% branches
[00:00:44] \u2714 Stage 'Lint + Test' finished successfully`,

  testFailure: `[00:00:01] \u25b6 git clone --depth=1 https://github.com/codebidi/ai-devops-platform.git .
[00:00:04] \u25b6 npm ci
[00:00:14] \u25b6 npm run lint
[00:00:18] \u2714 ESLint clean
[00:00:19] \u25b6 npm run test
[00:00:27] FAIL src/deploy/rollback.test.js
[00:00:28]   \u25cf RollbackSuite \u203a should revert to previous target SHA
[00:00:28]     AssertionError: expected 'healthy' to equal 'unhealthy'
[00:00:29]       at src/deploy/rollback.test.js:48:21
[00:00:30] Test Suites: 1 failed, 11 passed, 12 total
[00:00:31] \u2718 Error: Process completed with exit code 1. Stage failed.`,

  buildSuccess: `[00:00:00] \u25b6 docker buildx build --platform linux/amd64 -t app:cache .
[00:00:04] Step 1/9 : FROM node:20-alpine AS builder
[00:00:08] Step 2/9 : WORKDIR /app
[00:00:12] Step 3/9 : COPY package*.json ./
[00:00:18] Step 4/9 : RUN npm ci --omit=dev
[00:00:34] Step 5/9 : COPY . .
[00:00:38] Step 6/9 : RUN npm run build
[00:00:54] Step 7/9 : FROM alpine:3.19 AS runner
[00:00:58] Step 8/9 : COPY --from=builder /app/dist ./dist
[00:01:05] Step 9/9 : EXPOSE 8080
[00:01:08] \u2714 Successfully tagged app:latest
[00:01:10] Image size: 48.2MB (minified multi-stage build)`,

  pushSuccess: `[00:00:01] \u25b6 aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
[00:00:04] Login Succeeded
[00:00:05] \u25b6 docker tag app:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-devops-platform:sha
[00:00:08] \u25b6 docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-devops-platform:sha
[00:00:14] Pushing layer [7f3b89a]: 18.2MB/18.2MB (done)
[00:00:20] Pushing layer [4d91a20]: 24.1MB/24.1MB (done)
[00:00:24] digest: sha256:d894b91c0e3e29f8a2612a450e189 size: 1420
[00:00:25] \u2714 ECR push completed. Tag immutable: verified.`,

  deploySuccess: `[00:00:01] \u25b6 Initiating SSH tunnel to ec2-54-210-92-14.compute-1.amazonaws.com
[00:00:05] Authenticated host key (Ed25519 SHA256:v8Z...)
[00:00:08] \u25b6 docker-compose pull web-service
[00:00:18] \u25b6 docker-compose up -d --no-deps --build web-service
[00:00:24] Stopping old container [devops-web-1]...
[00:00:27] Starting new container [devops-web-1] (healthy)...
[00:00:32] \u25b6 Running Health Check probe: GET http://127.0.0.1:8080/health
[00:00:33] Response HTTP 200 OK - {"status":"healthy","uptime":5,"version":"sha"}
[00:00:35] \u2714 Deployment complete. Traffic switched with 0 downtime.`,

  deployFailure: `[00:00:01] \u25b6 Connecting to EC2 host ec2-54-210-92-14.compute-1.amazonaws.com
[00:00:06] Connection established
[00:00:10] \u25b6 docker-compose pull web-service
[00:00:19] \u25b6 docker-compose up -d --no-deps web-service
[00:00:28] Starting container [devops-web-1]...
[00:00:34] \u25b6 Health probe 1/5: Connection refused
[00:00:44] \u25b6 Health probe 2/5: HTTP 500 Internal Server Error
[00:00:54] \u25b6 Health probe 3/5: CrashLoopBackOff: exit code 137 (OOMKilled)
[00:00:56] \u2718 Error: Health check failed after 60s timeout. Rollback recommended.`
};

export const initialPlatformConfig = {
  repoName: "codebidi/ai-devops-platform",
  repoUrl: "https://github.com/codebidi/ai-devops-platform",
  awsRegion: "us-east-1",
  ecrRepo: "123456789012.dkr.ecr.us-east-1.amazonaws.com/codebidi-platform",
  ec2Host: "ec2-54-210-92-14.compute-1.amazonaws.com",
  healthEndpoint: "/health",
  currentDeployedRunId: "run-127",
  secrets: [
    { name: "AWS_ACCESS_KEY_ID", configured: true, lastUpdated: "2 days ago" },
    { name: "AWS_SECRET_ACCESS_KEY", configured: true, lastUpdated: "2 days ago" },
    { name: "EC2_SSH_PRIVATE_KEY", configured: true, lastUpdated: "1 week ago" },
    { name: "EC2_HOST", configured: true, lastUpdated: "2 weeks ago" },
    { name: "SLACK_WEBHOOK_URL", configured: true, lastUpdated: "1 month ago" },
    { name: "SENTRY_AUTH_TOKEN", configured: false, lastUpdated: "Not configured" },
    { name: "DATADOG_API_KEY", configured: true, lastUpdated: "3 weeks ago" },
  ]
};

// Raw run definitions covering all required cases
const runDefinitions = [
  { id: "run-128", num: 128, sha: "a1c49f8", msg: "feat(metrics): add real-time pipeline latency tracker", branch: "main", author: "Sarah Jenkins", trg: "push", status: "running", dur: 95, time: "2 mins ago", failStage: null },
  { id: "run-127", num: 127, sha: "7f3b89a", msg: "fix(deploy): optimize EC2 blue-green health check threshold", branch: "main", author: "Alex Rivera", trg: "push", status: "success", dur: 215, time: "18 mins ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-126", num: 126, sha: "9e2d31b", msg: "feat(auth): add OAuth2 refresh token rotation", branch: "feature/auth-jwt", author: "Elena Rostova", trg: "pull_request", pr: 44, status: "success", dur: 45, time: "42 mins ago", failStage: null },
  { id: "run-125", num: 125, sha: "e82a17c", msg: "refactor(ecr): stream image compression layers concurrently", branch: "main", author: "David Kim", trg: "push", status: "failed", dur: 180, time: "1 hour ago", failStage: "deploy_ec2" },
  { id: "run-124", num: 124, sha: "3d5f91e", msg: "test(runner): update unit test suites for edge cases", branch: "fix/test-flaky", author: "Marcus Chen", trg: "pull_request", pr: 43, status: "failed", dur: 32, time: "2 hours ago", failStage: "lint_test" },
  { id: "run-123", num: 123, sha: "6c7b20f", msg: "chore(deps): bump vite from 5.4.1 to 5.4.3", branch: "main", author: "David Kim", trg: "push", status: "success", dur: 198, time: "3 hours ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-122", num: 122, sha: "88a10bc", msg: "feat(ui): add dark mode high-contrast palette", branch: "main", author: "Sarah Jenkins", trg: "push", status: "success", dur: 210, time: "4 hours ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-121", num: 121, sha: "5f419dc", msg: "fix(k8s): handle ingress renegotiation timeouts", branch: "fix/ingress-timeout", author: "Alex Rivera", trg: "pull_request", pr: 42, status: "success", dur: 41, time: "5 hours ago", failStage: null },
  { id: "run-120", num: 120, sha: "1b992ae", msg: "feat(logging): structured JSON logging with request tracing", branch: "main", author: "Elena Rostova", trg: "push", status: "success", dur: 224, time: "7 hours ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-119", num: 119, sha: "4c118aa", msg: "perf(db): add compound index for runs timestamp lookup", branch: "perf/db-index", author: "David Kim", trg: "pull_request", pr: 41, status: "success", dur: 48, time: "9 hours ago", failStage: null },
  { id: "run-118", num: 118, sha: "90da77e", msg: "fix(docker): resolve multi-architecture builder caching bug", branch: "main", author: "Marcus Chen", trg: "push", status: "failed", dur: 195, time: "12 hours ago", failStage: "deploy_ec2" },
  { id: "run-117", num: 117, sha: "a310bb2", msg: "docs(architecture): add sequence diagram for rollback flow", branch: "main", author: "Sarah Jenkins", trg: "push", status: "success", dur: 185, time: "14 hours ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-116", num: 116, sha: "72ee401", msg: "feat(api): expose webhook dispatcher for external CI", branch: "feature/webhooks", author: "Alex Rivera", trg: "pull_request", pr: 40, status: "success", dur: 52, time: "18 hours ago", failStage: null },
  { id: "run-115", num: 115, sha: "318c5e9", msg: "fix(security): sanitize shell inputs in custom step runner", branch: "main", author: "Elena Rostova", trg: "push", status: "success", dur: 202, time: "1 day ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-114", num: 114, sha: "d9e8710", msg: "refactor(config): decouple environment secrets parser", branch: "main", author: "David Kim", trg: "push", status: "failed", dur: 35, time: "1 day ago", failStage: "lint_test" },
  { id: "run-113", num: 113, sha: "6140aa9", msg: "feat(telemetry): integrate OpenTelemetry trace exporter", branch: "main", author: "Marcus Chen", trg: "push", status: "success", dur: 230, time: "2 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-112", num: 112, sha: "88820c4", msg: "test(e2e): add end-to-end deployment verification mock", branch: "test/e2e-suite", author: "Sarah Jenkins", trg: "pull_request", pr: 39, status: "success", dur: 47, time: "2 days ago", failStage: null },
  { id: "run-111", num: 111, sha: "42e01bd", msg: "chore(ci): update github action runner version to v4", branch: "main", author: "Alex Rivera", trg: "push", status: "success", dur: 192, time: "3 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-110", num: 110, sha: "70a831e", msg: "fix(health): adjust ping interval from 5s to 2s", branch: "main", author: "Elena Rostova", trg: "push", status: "success", dur: 189, time: "3 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-109", num: 109, sha: "9bb6412", msg: "feat(cache): implement redis cluster connection pooling", branch: "feature/redis-pool", author: "David Kim", trg: "pull_request", pr: 38, status: "failed", dur: 29, time: "4 days ago", failStage: "lint_test" },
  { id: "run-108", num: 108, sha: "31f41aa", msg: "refactor(ec2): enable EBS automated encryption checks", branch: "main", author: "Marcus Chen", trg: "push", status: "success", dur: 212, time: "4 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-107", num: 107, sha: "5540e11", msg: "chore(deps): update aws-sdk to latest stable minor", branch: "main", author: "Sarah Jenkins", trg: "push", status: "success", dur: 199, time: "5 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-106", num: 106, sha: "c841bb0", msg: "fix(logs): resolve ANSI color code truncation in web viewer", branch: "fix/ansi-logs", author: "Alex Rivera", trg: "pull_request", pr: 37, status: "success", dur: 44, time: "5 days ago", failStage: null },
  { id: "run-105", num: 105, sha: "91b32cc", msg: "feat(iam): restrict deployment role permissions to least privilege", branch: "main", author: "Elena Rostova", trg: "push", status: "failed", dur: 184, time: "6 days ago", failStage: "deploy_ec2" },
  { id: "run-104", num: 104, sha: "2201ffe", msg: "refactor(alerts): simplify pagerduty webhook payload format", branch: "main", author: "David Kim", trg: "push", status: "success", dur: 205, time: "6 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-103", num: 103, sha: "bb92100", msg: "feat(routing): setup reverse proxy route rules for static assets", branch: "feature/proxy-rules", author: "Marcus Chen", trg: "pull_request", pr: 36, status: "success", dur: 46, time: "7 days ago", failStage: null },
  { id: "run-102", num: 102, sha: "1103c8a", msg: "fix(cors): allow configured staging domain origins", branch: "main", author: "Sarah Jenkins", trg: "push", status: "success", dur: 208, time: "8 days ago", failStage: null, deployed: true, health: "healthy" },
  { id: "run-101", num: 101, sha: "447190e", msg: "initial(pipeline): setup automated ec2 deployment pipeline", branch: "main", author: "Alex Rivera", trg: "push", status: "success", dur: 218, time: "9 days ago", failStage: null, deployed: true, health: "healthy" }
];

export const mockRuns = runDefinitions.map(def => {
  const isPr = def.trg === "pull_request";
  const isRunning = def.status === "running";

  // Build stage states based on requirements
  const s1 = {
    id: "lint_test",
    name: "Lint + Test",
    status: isRunning ? "success" : def.failStage === "lint_test" ? "failed" : "success",
    duration: def.failStage === "lint_test" ? "32s" : "44s",
    logs: def.failStage === "lint_test" ? baseLogs.testFailure : baseLogs.testSuccess
  };

  const s2 = {
    id: "build_docker",
    name: "Build Docker Image",
    status: isPr ? "skipped" : isRunning ? "running" : def.failStage === "lint_test" ? "skipped" : "success",
    duration: isPr || def.failStage === "lint_test" ? "—" : isRunning ? "45s (running)" : "1m 15s",
    logs: isPr ? "[Info] Pull request run: Tests only, no deploy." : def.failStage === "lint_test" ? "[Skipped] Previous stage failed." : baseLogs.buildSuccess
  };

  const s3 = {
    id: "push_ecr",
    name: "Push to ECR",
    status: isPr || isRunning || def.failStage ? "skipped" : "success",
    duration: isPr || isRunning || def.failStage ? "—" : "28s",
    logs: isPr ? "[Info] Pull request run: Tests only, no deploy." : def.failStage ? "[Skipped] Previous stage failed." : isRunning ? "[Pending] Awaiting Docker build..." : baseLogs.pushSuccess
  };

  const s4 = {
    id: "deploy_ec2",
    name: "Deploy to EC2",
    status: isPr || isRunning || def.failStage === "lint_test" ? "skipped" : def.failStage === "deploy_ec2" ? "failed" : "success",
    duration: isPr || isRunning || def.failStage === "lint_test" ? "—" : def.failStage === "deploy_ec2" ? "58s" : "35s",
    logs: isPr ? "[Info] Pull request run: Tests only, no deploy." : def.failStage === "deploy_ec2" ? baseLogs.deployFailure : def.failStage ? "[Skipped] Previous stage failed." : isRunning ? "[Pending] Awaiting ECR push..." : baseLogs.deploySuccess
  };

  return {
    id: def.id,
    runNumber: def.num,
    commitSha: def.sha,
    commitMessage: def.msg,
    author: def.author,
    branch: def.branch,
    trigger: def.trg,
    prNumber: def.pr || null,
    status: def.status,
    duration: def.dur,
    durationFormatted: isRunning ? `${def.dur}s (in progress)` : `${Math.floor(def.dur / 60)}m ${def.dur % 60}s`,
    startedAt: def.time,
    imageTag: isPr || def.failStage ? null : `v2.4.${def.num - 100}-${def.sha}`,
    ecrUri: isPr ? null : `123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-devops-platform:${def.sha}`,
    ec2Host: "ec2-54-210-92-14.compute-1.amazonaws.com",
    isDeployed: Boolean(def.deployed),
    healthStatus: def.health || (def.deployed ? "healthy" : null),
    stages: [s1, s2, s3, s4]
  };
});
