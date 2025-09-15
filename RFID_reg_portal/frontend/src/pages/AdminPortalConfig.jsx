import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPortalConfig() {
  const [portals, setPortals] = useState([]);
  const [form, setForm] = useState({ clusters: '', exhibits: '', threshold: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get('/api/admin/portals').then(res => setPortals(res.data)).catch(() => setPortals([]));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    axios.post('/api/admin/portal-config', form)
      .then(res => setMsg('Config saved!'))
      .catch(() => setMsg('Error saving config'));
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center', border: '1px solid #ccc', borderRadius: 8, padding: 24 }}>
      <h2>Admin Portal Configuration</h2>
      <div style={{ marginBottom: 24 }}>
        <h4>Existing Admin Portals</h4>
        {portals.length === 0 ? <div>No portals found.</div> : (
          <ul style={{ textAlign: 'left', margin: '0 auto', maxWidth: 300 }}>
            {portals.map(p => (
              <li key={p.id}><b>{p.name}</b> - Clusters: {p.clusters}, Exhibits: {p.exhibits}, Threshold: {p.threshold}</li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Number of Clusters</label><br />
          <input name="clusters" type="number" value={form.clusters} onChange={handleChange} required style={{ width: 120 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Number of Exhibits</label><br />
          <input name="exhibits" type="number" value={form.exhibits} onChange={handleChange} required style={{ width: 120 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Threshold Points</label><br />
          <input name="threshold" type="number" value={form.threshold} onChange={handleChange} required style={{ width: 120 }} />
        </div>
        <button className="btn primary" type="submit">Save Config</button>
      </form>
      {msg && <div style={{ marginTop: 16, color: msg.includes('Error') ? 'red' : 'green' }}>{msg}</div>}
    </div>
  );
}
