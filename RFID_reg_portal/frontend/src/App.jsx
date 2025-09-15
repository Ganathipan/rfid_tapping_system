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
        return (
          !selectedPortal ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '70vh',
                background: 'linear-gradient(135deg, #2d3748 0%, #2d3748 100%)',
                boxShadow: '0 8px 32px rgba(60,60,120,0.12)',
                borderRadius: '24px',
                maxWidth: '500px',
                margin: '40px auto',
                padding: '48px 32px',
              }}
            >
              <h2
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  marginBottom: '32px',
                  color: '#2d3748',
                  letterSpacing: '0.02em',
                  textShadow: '0 2px 8px rgba(60,60,120,0.08)',
                }}
              >
                Select Cluster
              </h2>
              <select
                id="cluster-select"
                value={selectedPortal}
                onChange={e => setSelectedPortal(e.target.value)}
                style={{
                  padding: '18px 32px',
                  fontSize: '1.5rem',
                  borderRadius: '12px',
                  border: '2px solid #2d3748',
                  background: '#fff',
                  color: '#2d3748',
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(60,60,120,0.08)',
                  marginBottom: '32px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              >
                <option value="" disabled>
                  -- Choose Cluster --
                </option>
                <option value="Cluster1">Cluster 1</option>
                <option value="Cluster2">Cluster 2</option>
                <option value="Cluster3">Cluster 3</option>
                <option value="Cluster4">Cluster 4</option>
              </select>
            </div>
          ) : (
            <GamePortal selectedPortal={selectedPortal} onBack={() => setSelectedPortal("")} />
          )
        );

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
