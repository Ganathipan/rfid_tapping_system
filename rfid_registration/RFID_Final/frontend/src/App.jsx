import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import RegistrationForm from './pages/RegistrationForm';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  // Remove tab state, not needed for combined form
  const [health, setHealth] = useState('checking…');

  async function refreshHealth() {
    try {
      const d = await api('/health');
      setHealth(`ok @ ${new Date(d.ts).toLocaleTimeString()}`);
    } catch {
      setHealth('down');
    }
  }

  useEffect(() => {
    refreshHealth();
    const t = setInterval(refreshHealth, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <header>
        <h1>RFID Registration Portal</h1>
      </header>

      <main>
        <section className="card">
          <RegistrationForm/>
        </section>

        <AdminPanel/>
      </main>

      <footer>Frontend  <span className="mono">{import.meta.env.VITE_API_BASE}</span></footer>
    </>
  );
}
