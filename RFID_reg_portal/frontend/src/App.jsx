import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import PortalSelection from './pages/PortalSelection';
import RegistrationFlow from './pages/RegistrationFlow';
import TagAssignment from './pages/TagAssignment';


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
        {/* Navigation removed for cleaner UI, only RFID registration flow remains */}
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
