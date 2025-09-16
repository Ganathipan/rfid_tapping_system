import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export default function AdminPortalConfig() {
  const [adminAuthed, setAdminAuthed] = useState(() =>
    localStorage.getItem('adminAuthed') === 'true'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [portals, setPortals] = useState([]);
  const [clusters, setClusters] = useState([
    { id: 1, name: 'Cluster 1', points: 1, selected: true }
  ]);
  const [groupSize, setGroupSize] = useState(1);
  const [msg, setMsg] = useState('');
  const [thresholdMode, setThresholdMode] = useState('auto');
  const [thresholdManual, setThresholdManual] = useState('');

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

  const selectedClusterCount = useMemo(
    () => clusters.filter((c) => c.selected).length,
    [clusters]
  );

  const parsedGroupSize = useMemo(() => {
    if (groupSize === '' || groupSize === null) return null;
    const num = Number(groupSize);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }, [groupSize]);

  const autoThresholdValue = useMemo(() => {
    if (parsedGroupSize === null) return null;
    return parsedGroupSize * totalSelectedPoints;
  }, [parsedGroupSize, totalSelectedPoints]);

  const manualThresholdNumber = useMemo(() => {
    if (thresholdManual === '' || thresholdManual === null) return null;
    const num = Number(thresholdManual);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }, [thresholdManual]);

  const effectiveThreshold =
    thresholdMode === 'manual' ? manualThresholdNumber : autoThresholdValue;
  const thresholdDisplay = effectiveThreshold ?? '\u2014';

  const activePortal = portals[0];

  const lastUpdated = useMemo(() => {
    if (!activePortal?.createdAt) return '\u2014';
    const dt = new Date(activePortal.createdAt);
    return Number.isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleString();
  }, [activePortal?.createdAt]);

  const savedClusterSummary = useMemo(() => {
    if (!activePortal) return '\u2014';
    const list = Array.isArray(activePortal.clusters)
      ? activePortal.clusters
      : [];
    if (list.length === 0) {
      if (typeof activePortal.clusterCount === 'number') {
        return activePortal.clusterCount;
      }
      return '\u2014';
    }
    const selected = list.filter((c) => c.selected !== false).length;
    return selected + '/' + list.length;
  }, [activePortal]);

  function addCluster() {
    const nextId =
      clusters.length === 0
        ? 1
        : Math.max(...clusters.map((c) => c.id)) + 1;
    setClusters((prev) => [
      ...prev,
      { id: nextId, name: 'Cluster ' + nextId, points: 0, selected: false }
    ]);
  }

  function updateCluster(id, field, value) {
    setClusters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function removeCluster(id) {
    setClusters((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      clusters: clusters.map(({ id, ...rest }) => rest),
      groupSize: parsedGroupSize,
      threshold: effectiveThreshold
    };
    axios
      .post('/api/admin/portal-config', payload)
      .then(() => {
        setMsg('Configuration saved successfully');
        return axios
          .get('/api/admin/portals')
          .then((res) => setPortals(res.data));
      })
      .catch(() => setMsg('Error saving configuration'));
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
    setPortals([]);
  }

  if (!adminAuthed) {
    return (
      <div className="admin-login-card">
        <h2>Admin Game Scoring</h2>
        <p className="mut small">
          Sign in to manage cluster weights and thresholds.
        </p>
        <form className="admin-form" onSubmit={handleLogin}>
          <div className="admin-field">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="admin-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="btn primary" type="submit">
            Sign in
          </button>
        </form>
        {loginMsg && <div className="admin-msg err">{loginMsg}</div>}
      </div>
    );
  }

  return (
    <div className="admin-config-page">
      <header className="admin-config-header">
        <div>
          <h2>Admin Game Scoring</h2>
          <p className="mut small">
            Adjust cluster weighting and threshold rules for the live scoreboard.
          </p>
        </div>
        <button type="button" className="btn" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <section className="admin-summary-card">
        <div className="summary-item">
          <span className="summary-label">Last Saved Threshold</span>
          <span className="summary-value">
            {activePortal?.threshold ?? 'Not set'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Saved Group Size</span>
          <span className="summary-value">
            {activePortal?.groupSize ?? activePortal?.exhibits ?? '\u2014'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Clusters Weighted</span>
          <span className="summary-value">{savedClusterSummary}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Last Updated</span>
          <span className="summary-value">{lastUpdated}</span>
        </div>
      </section>

      <section className="admin-section">
        <h3>Configuration</h3>
        <form className="admin-config-form" onSubmit={handleSubmit}>
          <div className="admin-config-grid">
            <div className="admin-field">
              <label>Expected Group Size</label>
              <input
                name="groupSize"
                type="number"
                min={0}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
              />
            </div>

            <div className="admin-field threshold-field">
              <label>Threshold Points</label>
              <div className="threshold-toggle">
                <button
                  type="button"
                  className={`btn tab-btn ${
                    thresholdMode === 'auto' ? 'active' : ''
                  }`}
                  onClick={() => setThresholdMode('auto')}
                >
                  Auto
                </button>
                <button
                  type="button"
                  className={`btn tab-btn ${
                    thresholdMode === 'manual' ? 'active' : ''
                  }`}
                  onClick={() => setThresholdMode('manual')}
                >
                  Manual
                </button>
              </div>

              {thresholdMode === 'manual' ? (
                <input
                  name="threshold"
                  type="number"
                  min={0}
                  value={thresholdManual}
                  onChange={(e) => setThresholdManual(e.target.value)}
                />
              ) : (
                <input
                  name="threshold"
                  type="number"
                  value={autoThresholdValue ?? ''}
                  readOnly
                  className="readonly"
                  placeholder="Not set"
                />
              )}
              <span className="field-hint">
                {thresholdMode === 'manual'
                  ? 'Enter a custom threshold or leave blank to disable.'
                  : 'Computed automatically from group size x selected cluster points.'}
              </span>
            </div>
          </div>

          <div className="admin-meta">
            <span>
              Selected clusters: <strong>{selectedClusterCount}</strong>
            </span>
            <span>
              Total points: <strong>{totalSelectedPoints}</strong>
            </span>
            <span>
              Threshold to save: <strong>{thresholdDisplay}</strong>
            </span>
          </div>

          <div>
            <h4>Clusters and Points</h4>
            <div className="cluster-table-wrapper">
              <table className="cluster-table">
                <thead>
                  <tr>
                    <th>Include</th>
                    <th>Cluster Name</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!c.selected}
                          onChange={(e) =>
                            updateCluster(c.id, 'selected', e.target.checked)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) =>
                            updateCluster(c.id, 'name', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={c.points}
                          onChange={(e) =>
                            updateCluster(c.id, 'points', e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn err"
                          onClick={() => removeCluster(c.id)}
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

            <div className="admin-table-actions">
              <button type="button" className="btn" onClick={addCluster}>
                + Add Cluster
              </button>
            </div>
          </div>

          <div className="admin-form-footer">
            <button className="btn primary" type="submit">
              Save Config
            </button>
          </div>
        </form>

        {msg && (
          <div
            className={'admin-msg ' + (msg.includes('Error') ? 'err' : 'ok')}
          >
            {msg}
          </div>
        )}
      </section>
    </div>
  );
}
