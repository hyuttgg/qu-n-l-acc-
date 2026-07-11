import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store';
import { Compass } from 'lucide-react';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { AccountList } from './pages/AccountList';
import { InventoryList } from './pages/InventoryList';
import { RealtimeTracker } from './pages/RealtimeTracker';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Guard
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="deepsea-bg min-h-screen flex flex-col items-center justify-center">
        <Compass className="w-16 h-16 text-gold animate-spin" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">Consulting Map & Compass...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="sessions" element={<AnalyticsDashboard />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
