import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Runs from './pages/Runs';
import RunDetail from './pages/RunDetail';
import Deployments from './pages/Deployments';
import Settings from './pages/Settings';
import { usePolling } from './hooks/usePolling';

export default function App() {
  // Dark mode strictly stored in React state (no localStorage as requested)
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [repoName, setRepoName] = useState('codebidi/automated-devops-platform');

  // Background 10s auto-polling simulation hook
  const { isRefreshing, lastUpdated, refreshNow } = usePolling(() => {
    setRefreshKey(k => k + 1);
  }, 10000, true);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          <Topbar
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onManualRefresh={refreshNow}
            repoName={repoName}
          />

          <main id="main-content" className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            <Routes key={refreshKey}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route path="/settings" element={<Settings onRepoChange={setRepoName} />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
