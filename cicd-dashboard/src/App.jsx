import React, { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Rocket, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { usePolling } from './hooks/usePolling';

// Lazy-loaded pages with React.lazy
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Runs = lazy(() => import('./pages/Runs'));
const RunDetail = lazy(() => import('./pages/RunDetail'));
const Deployments = lazy(() => import('./pages/Deployments'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Branded loading screen for Suspense
function BrandedLoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-brand animate-pulse">
          <Rocket className="w-8 h-8" />
        </div>
        <div className="absolute -inset-2 rounded-3xl bg-brand-500/20 blur-xl -z-10 animate-ping" />
      </div>

      <div className="flex items-center gap-2 text-sm font-heading font-bold text-content-primary">
        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        <span>Loading DeployHub Console...</span>
      </div>
      <p className="mt-1 text-xs text-content-muted font-mono">
        Initializing secure runtime telemetry
      </p>
    </div>
  );
}

// Protected route enforcing authentication and optional role rank
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BrandedLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

// App shell layout for protected dashboard pages
function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [repoName, setRepoName] = useState('codebidi/automated-devops-platform');

  const { isRefreshing, lastUpdated, refreshNow } = usePolling(() => {
    setRefreshKey((k) => k + 1);
  }, 3600000, true);

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex transition-colors duration-200">
      {/* Skip to Content accessible link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-brand-600 text-white font-medium rounded-xl shadow-elevated focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onManualRefresh={refreshNow}
          repoName={repoName}
        />

        <main id="main-content" className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<BrandedLoadingScreen />}>
            <Routes key={refreshKey}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Settings onRepoChange={setRepoName} />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<BrandedLoadingScreen />}>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<Landing />} />

              {/* Redesigned Login Page */}
              <Route path="/login" element={<Login />} />

              {/* Protected /app/* Console Routes */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to styled 404 for unknown URLs */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
