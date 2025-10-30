import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { api } from './api';
import AppShell from './layouts/AppShell.jsx';
import { Skeleton } from './ui/Skeleton.jsx';

// Lazy loaded pages
const PortalSelection = lazy(()=>import('./pages/registration/PortalSelection'));
const Home = lazy(()=>import('./pages/Home.jsx'));
const RegistrationFlow = lazy(()=>import('./pages/registration/RegistrationFlow'));
const TagAssignment = lazy(()=>import('./pages/registration/TagAssignment'));
const MemberAssignment = lazy(()=>import('./pages/registration/MemberAssignment'));
const RegistrationForm = lazy(()=>import('./pages/registration/RegistrationForm'));
const AdminPortal = lazy(()=>import('./pages/admin/AdminPortal.jsx'));
const AdminPanel = lazy(()=>import('./pages/admin/AdminPanel.jsx'));
const GameLiteAdmin = lazy(()=>import('./pages/gameAdmin/GameLiteAdmin.jsx'));
const ClusterDirectory = lazy(()=>import('./pages/kiosk/ClusterDirectory'));
const ClusterDisplay = lazy(()=>import('./pages/kiosk/ClusterDisplay'));
const ExitOutPage = lazy(()=>import('./pages/exit/ExitOutPage'));
const AnalyticsPage = lazy(()=>import('./pages/analytics/Analytics.jsx'));
const CardHistoryPage = lazy(()=>import('./pages/admin/CardHistory.jsx'));


export default function App() {
  const [health, setHealth] = useState('checking…');
  const [currentView, setCurrentView] = useState('portal-selection');
  const [selectedPortal, setSelectedPortal] = useState(localStorage.getItem('portal') || '');
  const [registrationData, setRegistrationData] = useState(null);
  const [showPortalSelection, setShowPortalSelection] = useState(true);

  // --- handlers ---
  const handlePortalSelect = (portal) => {
    setSelectedPortal(portal);
    localStorage.setItem('portal', portal);
    setShowPortalSelection(false);
    setCurrentView('registration');
  };

  const handleRegistrationComplete = (data) => {
    setRegistrationData(data);
    setCurrentView('tag-assignment');
  };

  // Dedicated handler to redirect to registration portal after tag assignment
  const handleTagAssignmentComplete = () => {
    setRegistrationData(null);
    setCurrentView('registration');
  };

  const handleBackToPortalSelection = () => {
    setSelectedPortal('');
    setRegistrationData(null);
    setShowPortalSelection(true);
    setCurrentView('portal-selection');
  };

  async function refreshHealth() {
    try {
      const d = await api('/health');
      setHealth(d.ok ? 'healthy' : 'error');
    } catch (err) {
      setHealth('error');
    }
  }

  useEffect(() => {
    refreshHealth();
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'portal-selection':
        return <PortalSelection onPortalSelect={handlePortalSelect} />;
      case 'registration':
        return (
          <RegistrationFlow
            selectedPortal={selectedPortal}
            onRegistrationComplete={handleRegistrationComplete}
            onBack={handleBackToPortalSelection}
          />
        );
      case 'tag-assignment':
        return (
          <TagAssignment
            registrationData={registrationData}
            selectedPortal={selectedPortal}
            onComplete={handleTagAssignmentComplete}
            onBack={handleBackToPortalSelection}
          />
        );
      case 'admin':
        // Fallback to AdminPortal (the actual component that exists)
        return <AdminPortal />;
      default:
        return <PortalSelection onPortalSelect={handlePortalSelect} />;
    }
  };

  // Minimal runtime error logger (non-blocking). Remove if not needed.
  const SafeRoot = ({ children }) => children;

  function RootFlow() {
    return (
      <>
        <header className="mb-4">
          <h1 className="text-xl font-semibold">RFID Registration System</h1>
          <div className="pill">
            <span className="small">Health: {health}</span>
          </div>
        </header>
        <section className="card">{renderCurrentView()}</section>
        <footer className="mt-6 opacity-80 text-sm">
          Frontend <span className="mono">{import.meta.env.VITE_API_BASE}</span>
        </footer>
      </>
    );
  }

  // If we’re using Router, expose GameLiteAdmin at /admin/game-lite and AdminPortal at /admin
  return (
    <BrowserRouter>
      <SafeRoot>
        <Suspense fallback={<div className="p-6 space-y-6">
          <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
          <Skeleton height={300} />
        </div>}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/registration" element={<RootFlow />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/admin/panel" element={<AdminPanel />} />
              <Route path="/admin/game-lite" element={<GameLiteAdmin />} />
              <Route path="/admin/exitout" element={<ExitOutPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/admin/card-history/:cardId" element={<CardHistoryPage />} />
              <Route path="/kiosk" element={<ClusterDirectory />} />
              <Route path="/kiosk/cluster/:clusterLabel" element={<ClusterDisplay />} />
            </Route>
          </Routes>
        </Suspense>
      </SafeRoot>
    </BrowserRouter>
  );
}
