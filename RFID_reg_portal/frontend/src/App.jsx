import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import PortalSelection from './pages/PortalSelection';
import RegistrationFlow from './pages/RegistrationFlow';
import TagAssignment from './pages/TagAssignment';
import GamePortal from './pages/GamePortal';


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
      <header>
        <h1>RFID Registration System</h1>
        <div className="pill">
          <span className="small">Health: {health}</span>
        </div>
        <nav style={{ marginTop: '12px' }}>
          <button onClick={() => setCurrentView('portal-selection')}>
            Portal Selection
          </button>
          <button onClick={() => setCurrentView('game-portal')}>
            Game Interface
          </button>
        </nav>
      </header>

      <main style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 16px' }}>
        <section className="card">{renderCurrentView()}</section>
      </main>

      <footer>
        Frontend <span className="mono">{import.meta.env.VITE_API_BASE}</span>
      </footer>
    </>
  );
}
