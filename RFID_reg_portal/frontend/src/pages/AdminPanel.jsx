import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [adminAuthed, setAdminAuthed] = useState(() =>
    localStorage.getItem('adminAuthed') === 'true'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [teams, setTeams] = useState([]);
  const [config, setConfig] = useState({
    eligibility_threshold: { value: 50, description: '' },
    max_team_size: { value: 0, description: '' }
  });
  const [useTeamSize, setUseTeamSize] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [newCluster, setNewCluster] = useState({ name: '', points: 0 });
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    if (adminAuthed) {
      loadConfig();
      loadTeams();
      loadClusters();
    }
  }, [adminAuthed]);

  const loadConfig = async () => {
    try {
      const data = await api('/api/admin/config');
      setConfig(data);
      setUseTeamSize(data.max_team_size?.value > 0);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await api('/api/admin/teams');
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  const loadClusters = async () => {
    try {
      const data = await api('/api/admin/config');
      const clusterData = [];
      Object.keys(data).forEach(key => {
        if (key.endsWith('_points')) {
          const clusterName = key.replace('_points', '');
          clusterData.push({
            name: clusterName,
            points: data[key].value
          });
        }
      });
      setClusters(clusterData);
    } catch (err) {
      console.error('Failed to load clusters:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg('');
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('adminAuthed', 'true');
      setAdminAuthed(true);
      setUsername('');
      setPassword('');
    } catch (err) {
      setLoginMsg('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthed');
    setAdminAuthed(false);
    setTeams([]);
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: parseInt(value) || 0
      }
    }));
  };

  const addCluster = () => {
    if (newCluster.name.trim() && newCluster.points >= 0) {
      setClusters([...clusters, { ...newCluster }]);
      setNewCluster({ name: '', points: 0 });
    }
  };

  const removeCluster = (index) => {
    setClusters(clusters.filter((_, i) => i !== index));
  };

  const updateCluster = (index, field, value) => {
    const updated = [...clusters];
    updated[index] = { ...updated[index], [field]: value };
    setClusters(updated);
  };

  const saveConfig = async () => {
    try {
      const configData = {};
      
      Object.keys(config).forEach(key => {
        if (key === 'max_team_size') {
          configData[key] = useTeamSize ? config[key].value : 0;
        } else {
          configData[key] = config[key].value;
        }
      });

      clusters.forEach(cluster => {
        configData[`${cluster.name}_points`] = cluster.points;
      });

      await api('/api/admin/config', {
        method: 'POST',
        body: { config: configData }
      });
      setMsg('Configuration saved successfully');
      loadConfig();
      loadClusters();
    } catch (err) {
      setMsg('Error saving configuration');
    }
  };

  if (!adminAuthed) {
    return (
      <div className="admin-login-card">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Admin Login</h2>
        <p className="mut" style={{ textAlign: 'center', marginBottom: '20px' }}>
          Enter your admin credentials to access the control panel
        </p>

        <form onSubmit={handleLogin} className="admin-form">
          <div className="admin-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {loginMsg && (
            <div className="admin-msg err">
              {loginMsg}
            </div>
          )}

          <button type="submit" className="btn primary" style={{ width: '100%' }}>
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-config-header" style={{ textAlign: 'center' }}>
        <h2>Admin Control Panel</h2>
        <button className="btn err" onClick={handleLogout} style={{ margin: '0 auto' }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="tabbar" style={{ justifyContent: 'center' }}>
        <button
          className={`btn tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button
          className={`btn tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          Clusters
        </button>
        <button
          className={`btn tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </button>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="admin-section">
          <h3 style={{ marginTop: 0 }}>System Configuration</h3>
          
          <div className="admin-config-form">
            <div className="admin-config-grid">
              <div className="admin-field">
                <label htmlFor="eligibility-threshold">Eligibility Threshold (Points)</label>
                <input
                  id="eligibility-threshold"
                  name="eligibility-threshold"
                  type="number"
                  min="0"
                  value={config.eligibility_threshold?.value || 0}
                  onChange={(e) => updateConfig('eligibility_threshold', e.target.value)}
                  placeholder="Enter minimum points"
                />
                <div className="field-hint">
                  Minimum points required to be eligible for the game
                </div>
              </div>

              <div className="admin-field">
                <div className="threshold-field">
                  <div className="threshold-toggle">
                    <button
                      type="button"
                      className={`btn tab-btn ${!useTeamSize ? 'active' : ''}`}
                      onClick={() => setUseTeamSize(false)}
                    >
                      Points Only
                    </button>
                    <button
                      type="button"
                      className={`btn tab-btn ${useTeamSize ? 'active' : ''}`}
                      onClick={() => setUseTeamSize(true)}
                    >
                      Team Size
                    </button>
                  </div>
                  
                  {useTeamSize && (
                    <>
                      <label htmlFor="team-size">Minimum Team Size</label>
                      <input
                        id="team-size"
                        name="team-size"
                        type="number"
                        min="1"
                        value={config.max_team_size?.value || 0}
                        onChange={(e) => updateConfig('max_team_size', e.target.value)}
                        placeholder="Enter minimum team size"
                      />
                      <div className="field-hint">
                        Minimum number of members required for eligibility
                      </div>
                    </>
                  )}
                  
                  {!useTeamSize && (
                    <div className="field-hint">
                      Eligibility will be based on points threshold only
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-form-footer" style={{ textAlign: 'center' }}>
              <button onClick={saveConfig} className="btn primary">
                Save Configuration & Clusters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clusters Tab */}
      {activeTab === 'clusters' && (
        <div className="admin-section">
          <h3 style={{ marginTop: 0 }}>Cluster Management</h3>
          
          <div className="admin-field">
            <label htmlFor="new-cluster-name">Add New Cluster</label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <input
                id="new-cluster-name"
                name="new-cluster-name"
                type="text"
                placeholder="Cluster name (e.g., cluster1)"
                value={newCluster.name}
                onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
                style={{ flex: 1, maxWidth: '300px' }}
              />
              <input
                id="new-cluster-points"
                name="new-cluster-points"
                type="number"
                placeholder="Points"
                value={newCluster.points}
                onChange={(e) => setNewCluster({ ...newCluster, points: parseInt(e.target.value) || 0 })}
                style={{ width: '100px' }}
              />
              <button onClick={addCluster} className="btn primary">
                Add
              </button>
            </div>
          </div>

          {clusters.length > 0 && (
            <div className="cluster-table-wrapper">
              <table className="cluster-table">
                <thead>
                  <tr>
                    <th>Cluster Name</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((cluster, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          id={`cluster-name-${index}`}
                          name={`cluster-name-${index}`}
                          type="text"
                          value={cluster.name}
                          onChange={(e) => updateCluster(index, 'name', e.target.value)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'inherit',
                            width: '100%',
                            padding: '4px 0'
                          }}
                        />
                      </td>
                      <td>
                        <input
                          id={`cluster-points-${index}`}
                          name={`cluster-points-${index}`}
                          type="number"
                          value={cluster.points}
                          onChange={(e) => updateCluster(index, 'points', parseInt(e.target.value) || 0)}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'inherit',
                            width: '100%',
                            padding: '4px 0'
                          }}
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => removeCluster(index)}
                          className="btn err"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="admin-section">
          <h3 style={{ marginTop: 0 }}>Team Scores</h3>
          
          {teams.length > 0 ? (
            <div className="cluster-table-wrapper">
              <table className="cluster-table">
                <thead>
                  <tr>
                    <th>Team ID</th>
                    <th>Score</th>
                    <th>Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr key={index}>
                      <td className="mono">{team.teamId}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{team.points}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`pill ${team.points >= 50 ? 'ok' : ''}`}>
                          {team.points >= 50 ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mut" style={{ textAlign: 'center', padding: '40px' }}>
              No teams found
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {msg && (
        <div className={`admin-msg ${msg.includes('successfully') ? 'ok' : 'err'}`}>
          {msg}
        </div>
      )}
    </div>
  );
}