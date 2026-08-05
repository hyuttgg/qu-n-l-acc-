import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store';
import { Compass } from 'lucide-react';
import ClickSpark from './components/ClickSpark';
import TargetCursor from './components/TargetCursor';

// Lazy-loaded Pages for Optimal Bundle Size & Performance
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview').then(m => ({ default: m.DashboardOverview })));
const AccountList = lazy(() => import('./pages/AccountList').then(m => ({ default: m.AccountList })));
const InventoryList = lazy(() => import('./pages/InventoryList').then(m => ({ default: m.InventoryList })));
const RealtimeTracker = lazy(() => import('./pages/RealtimeTracker').then(m => ({ default: m.RealtimeTracker })));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const OAuthSuccess = lazy(() => import('./pages/OAuthSuccess').then(m => ({ default: m.OAuthSuccess })));
const GeoMonitor = lazy(() => import('./pages/GeoMonitor').then(m => ({ default: m.GeoMonitor })));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const AdminLuaInspector = lazy(() => import('./pages/AdminLuaInspector').then(m => ({ default: m.AdminLuaInspector })));
const DiscordIntegrationPage = lazy(() => import('./pages/DiscordIntegrationPage').then(m => ({ default: m.DiscordIntegrationPage })));

const PageFallback: React.FC = () => (
  <div className="deepsea-bg min-h-screen flex flex-col items-center justify-center">
    <Compass className="w-12 h-12 text-gold animate-spin" />
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">Loading Module...</p>
  </div>
);

// Protected Route Guard
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useApp();

  if (loading) {
    return <PageFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <TargetCursor
        targetSelector="button, a, .cursor-target, input, select"
        spinDuration={2.5}
        cursorColor="#EAB308"
        cursorColorOnTarget="#06B6D4"
        hideDefaultCursor={false}
      />
      <ClickSpark sparkColor="#EAB308" sparkSize={12} sparkRadius={22} sparkCount={9} duration={450}>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />

              {/* Protected Dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<DashboardOverview />} />
                <Route path="accounts" element={<AccountList />} />
                <Route path="inventory" element={<InventoryList />} />
                <Route path="fruits" element={<InventoryList />} />
                <Route path="weapons" element={<InventoryList />} />
                <Route path="styles" element={<InventoryList />} />
                <Route path="accessories" element={<InventoryList />} />
                <Route path="live" element={<RealtimeTracker />} />
                <Route path="geo" element={<GeoMonitor />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="sessions" element={<AnalyticsDashboard />} />
                <Route path="admin-lua" element={<AdminLuaInspector />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="discord" element={<DiscordIntegrationPage />} />
                <Route path="docs" element={<ApiDocsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ClickSpark>
    </AppProvider>
  );
};

export default App;
