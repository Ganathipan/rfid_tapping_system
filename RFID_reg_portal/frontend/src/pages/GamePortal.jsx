import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function GamePortal() {
  const [availableClusters, setAvailableClusters] = useState([]);
  const [currentCluster, setCurrentCluster] = useState('');
  const [teamScore, setTeamScore] = useState(0);
  const [lastTap, setLastTap] = useState(null);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [recentTaps, setRecentTaps] = useState([]);
  const [eligibility, setEligibility] = useState({ 
    eligible: false, 
    threshold: 0, 
    maxTeamSize: 0, 
    teamSize: 0,
    eligibilityType: 'points'
  });

  // Load available clusters
  useEffect(() => {
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
        setAvailableClusters(clusterData);
        if (clusterData.length > 0 && !currentCluster) {
          setCurrentCluster(clusterData[0].name);
        }
      } catch (err) {
        console.error('Failed to load clusters:', err);
      }
    };
    loadClusters();
  }, [currentCluster]);

  // RFID Detection handler
  const handleRfidDetection = useCallback(async (rfid) => {
    if (!rfid || !currentCluster) return;

    try {
      const mainReader = `reader${currentCluster.replace('cluster', '')}`;

      const response = await api('/api/tags/rfid-detected', {
        method: 'POST',
        body: JSON.stringify({
          rfid,
          portal: mainReader
        })
      });
      
      if (response.success) {
        setTeamScore(response.totalPoints);
        setLastTap(new Date().toLocaleTimeString());
        
        // Save to recent taps
        setRecentTaps(prev => [
          { 
            rfid, 
            reader: mainReader, 
            points: response.pointsAwarded || 0, 
            time: new Date().toLocaleTimeString() 
          },
          ...prev.slice(0, 9)
        ]);

        // Check eligibility
        const eligibilityResponse = await api(`/api/tags/status/${rfid}`);
        const eligibilityType = eligibilityResponse.maxTeamSize > 0 ? 'teamSize' : 'points';
        
        setEligibility({
          eligible: eligibilityResponse.eligible,
          threshold: eligibilityResponse.threshold,
          maxTeamSize: eligibilityResponse.maxTeamSize,
          teamSize: eligibilityResponse.teamSize,
          eligibilityType
        });

        // Show popup
        setPopupMessage(`RFID ${rfid} tapped successfully!`);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    } catch (err) {
      console.error('RFID detection error:', err);
    }
  }, [currentCluster]);

  // ============== JSX Render ==============
  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button 
          className="btn" 
          onClick={() => setCurrentCluster('')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          ← Back to Clusters
        </button>
      </div>

      {/* Cluster Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        background: 'var(--card)',
        border: '1px solid #1f2942',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e6eefc', margin: '0 0 8px 0' }}>
          {currentCluster.toUpperCase()}
        </h2>
        <p style={{ color: 'var(--mut)', fontSize: '0.9rem', margin: 0 }}>
          Last tap: {lastTap || 'None'}
        </p>
      </div>

      {/* Tap Instruction */}
      <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#e6eefc', margin: '0 0 16px 0' }}>
          Tap Your RFID Card
        </h3>
        <p style={{ fontSize: '1rem', color: 'var(--mut)', margin: 0 }}>
          Place your RFID card on the reader to see your score and eligibility
        </p>
      </div>

      {/* Recent Taps */}
      {recentTaps.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#e6eefc', margin: '0 0 16px 0', textAlign: 'center' }}>
            Recent Taps
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#0d1426' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: 'var(--mut)', borderBottom: '1px solid #1f2942' }}>RFID</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: 'var(--mut)', borderBottom: '1px solid #1f2942' }}>Reader</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--mut)', borderBottom: '1px solid #1f2942' }}>Points</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--mut)', borderBottom: '1px solid #1f2942' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTaps.map((tap, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #1f2942' }}>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: '#e6eefc' }}>{tap.rfid}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--mut)' }}>{tap.reader}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--ok)', fontWeight: '600' }}>+{tap.points}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--mut)' }}>{tap.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--card)',
          border: '2px solid var(--pri)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          zIndex: 1000,
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          {/* Score Display */}
          <div style={{ marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, var(--pri) 0%, #1d4ed8 100%)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#e6eefc', opacity: 0.9 }}>Current Score</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', color: '#e6eefc' }}>{teamScore}</div>
            <div style={{ fontSize: '1rem', color: '#e6eefc', opacity: 0.8 }}>POINTS</div>
          </div>

          {/* Eligibility Display */}
          <div style={{ padding: '16px',
            backgroundColor: eligibility.eligible ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${eligibility.eligible ? 'var(--ok)' : 'var(--err)'}`,
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '8px', color: '#e6eefc', fontWeight: '600' }}>Game Eligibility</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px', color: eligibility.eligible ? 'var(--ok)' : 'var(--err)' }}>
              {eligibility.eligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
            </div>
            
            {eligibility.eligibilityType === 'teamSize' ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--mut)' }}>
                Team Size: {eligibility.teamSize}/{eligibility.maxTeamSize} members
                {!eligibility.eligible && (
                  <div style={{ marginTop: '4px' }}>
                    Need {eligibility.maxTeamSize - eligibility.teamSize} more members
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--mut)' }}>
                Threshold: {eligibility.threshold} points
                {!eligibility.eligible && (
                  <div style={{ marginTop: '4px' }}>
                    Need {eligibility.threshold - teamScore} more points
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tap Message */}
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#e6eefc' }}>
            {popupMessage}
          </div>
        </div>
      )}
    </div>
  );
}
