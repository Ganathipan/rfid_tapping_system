import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import PortalSelection from './pages/PortalSelection';
import RegistrationFlow from './pages/RegistrationFlow';
import TagAssignment from './pages/TagAssignment';
import AdminPortalConfig from './pages/AdminPortalConfig';


export default function App() {
  const [health, setHealth] = useState('checking…');
  const [currentView, setCurrentView] = useState('portal-selection');
  const [selectedPortal, setSelectedPortal] = useState(localStorage.getItem('portal') || '');
  const [registrationData, setRegistrationData] = useState(null);

  // --- handlers ---
  const handlePortalSelect = (portal) => {
    setSelectedPortal(portal);
    localStorage.setItem('portal', portal);
    setCurrentView('registration');
  };

  const handleRegistrationComplete = (data) => {
    setRegistrationData(data);
    setCurrentView('tag-assignment');
  };

  const handleTagAssignmentComplete = () => {
    setRegistrationData(null);
    setCurrentView('portal-selection');
  };

  const handleBackToPortalSelection = () => {
    setSelectedPortal('');
    setRegistrationData(null);
    setCurrentView('portal-selection');
  };

  async function refreshHealth() {
    try {
      const d = await api('/health');
      setHealth(d.status || 'ok');
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

      case 'admin-config':
        return <AdminPortalConfig />;

      case 'admin':
        return <AdminDashboard onBack={handleBackToPortalSelection} />;

      case 'game-portal':
        return <GamePortal />;
      default:
        return <PortalSelection onPortalSelect={handlePortalSelect} />;
    }
  };

  return (
    <>
      <header className="app-header">
        <h1>RFID Registration System</h1>
        <div className="pill">
          <span className="small">Health: {health}</span>
        </div>
        <button
          type="button"
          className="btn admin-score-btn"
          onClick={() => setCurrentView('admin-config')}
        >
          Admin Game Scoring
        </button>
        <nav className="header-tabs">
          <button
            type="button"
            className={`btn tab-btn ${currentView === 'portal-selection' ? 'active' : ''}`}
            onClick={() => setCurrentView('portal-selection')}
          >
            Portal Selection
          </button>
          <button
            type="button"
            className={`btn tab-btn ${currentView === 'game-portal' ? 'active' : ''}`}
            onClick={() => setCurrentView('game-portal')}
          >
            Game Interface
          </button>
        </nav>
      </header>

      <main className="app-main">
        <section className="card">{renderCurrentView()}</section>
      </main>

      <footer>
        Frontend <span className="mono">{import.meta.env.VITE_API_BASE}</span>
      </footer>
    </>
  );
}
