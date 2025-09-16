import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export default function AdminPortalConfig() {
  const [adminAuthed, setAdminAuthed] = useState(
    () => localStorage.getItem('adminAuthed') === 'true'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [portals, setPortals] = useState([]);
  const [clusters, setClusters] = useState([
    // Example initial row
    { id: 1, name: 'Cluster 1', points: 1, selected: true },
  ]);
  const [groupSize, setGroupSize] = useState(1);
  // exhibits feature removed
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!adminAuthed) return;
    axios
      .get('/api/admin/portals')
      .then((res) => setPortals(res.data))
      .catch(() => setPortals([]));
  }, [adminAuthed]);

  const totalSelectedPoints = useMemo(
    () =>
      clusters
        .filter((c) => c.selected)
        .reduce((sum, c) => sum + (Number(c.points) || 0), 0),
    [clusters]
  );

  const threshold = useMemo(
    () => (Number(groupSize) || 0) * totalSelectedPoints,
    [groupSize, totalSelectedPoints]
  );

  function addCluster() {
    const nextId = clusters.length === 0 ? 1 : Math.max(...clusters.map((c) => c.id)) + 1;
    setClusters([
      ...clusters,
      { id: nextId, name: `Cluster ${nextId}`, points: 0, selected: false },
    ]);
  }

  function updateCluster(id, field, value) {
    setClusters((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function removeCluster(id) {
    setClusters((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      clusters: clusters.map(({ id, ...rest }) => rest),
      groupSize: Number(groupSize) || 0,
      threshold,
    };
    axios
      .post('/api/admin/portal-config', payload)
      .then(() => {
        setMsg('Config saved!');
        // Refresh list to show new entry
        return axios.get('/api/admin/portals').then((res) => setPortals(res.data));
      })
      .catch(() => setMsg('Error saving config'));
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginMsg('');
    try {
      await axios.post('/api/admin/login', { username, password });
      localStorage.setItem('adminAuthed', 'true');
      setAdminAuthed(true);
      setUsername('');
      setPassword('');
    } catch (err) {
      setLoginMsg('Invalid credentials');
    }
  }

  function handleLogout() {
    localStorage.removeItem('adminAuthed');
    setAdminAuthed(false);
  }


  if (!adminAuthed) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', padding: 24 }}>
        <h2 style={{ textAlign: 'center' }}>Admin Login</h2>
        <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn primary" type="submit">Sign in</button>
        </form>
        {loginMsg && (
          <div style={{ marginTop: 12, color: '#ef4444' }}>{loginMsg}</div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
        textAlign: 'left',
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Admin Game Scoring</h2>
        <button className="btn" onClick={handleLogout}>Log out</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h4>Last Saved Threshold</h4>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#04567cff',
            border: '1px solid #90caf9',
            color: '#eaedf0ff',
            fontWeight: 600,
          }}
        >
          {portals[0]?.threshold ?? 'Not set'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Expected Group Size</label>
            <input
              name="groupSize"
              type="number"
              min={0}
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              required
              style={{ width: 160 }}
            />
          </div>
          {/* Exhibits input removed */}
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Calculated Threshold Points</label>
            <input
              name="threshold"
              type="number"
              value={threshold}
              readOnly
              style={{
                width: 220,
                background: '#1b4052ff',      // light blue background
                border: '1px solid #1b405eff', // soft blue border
                color: '#cdd3ddff',            // darker blue text for readability
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 8 }}>Clusters and Points</h4>
          <div style={{ overflowX: 'auto', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0b5d84ff' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Include</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Cluster Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Points</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="checkbox"
                        checked={!!c.selected}
                        onChange={(e) => updateCluster(c.id, 'selected', e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateCluster(c.id, 'name', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        min={0}
                        value={c.points}
                        onChange={(e) => updateCluster(c.id, 'points', e.target.value)}
                        style={{ width: 120 }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button
                        type="button"
                        onClick={() => removeCluster(c.id)}
                        className="btn"
                        style={{ color: '#c62828' }}
                        disabled={clusters.length === 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={addCluster}>
              + Add Cluster
            </button>
          </div>
          <div style={{ marginTop: 10, color: '#555' }}>
            Selected clusters total points: <b>{totalSelectedPoints}</b>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn primary" type="submit">
            Save Config
          </button>
        </div>
      </form>
      {msg && (
        <div style={{ marginTop: 16, color: msg.includes('Error') ? 'red' : 'green' }}>{msg}</div>
      )}
    </div>
  );
}
