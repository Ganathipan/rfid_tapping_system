import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';

const FALLBACK_CLUSTERS = [
  { key: 'cluster1', label: 'Cluster 1' },
  { key: 'cluster2', label: 'Cluster 2' },
  { key: 'cluster3', label: 'Cluster 3' },
  { key: 'cluster4', label: 'Cluster 4' }
];

function normalizeKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export default function GamePortal() {
  const [clusterOptions, setClusterOptions] = useState(FALLBACK_CLUSTERS);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState('');
  const lastTapRef = useRef(null);
  const lastSignatureRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const portals = await api('/api/admin/portals');
        if (cancelled) return;
        const config = portals[0];
        if (!config) {
          setClusterOptions(FALLBACK_CLUSTERS);
          return;
        }

        const source = Array.isArray(config.clusters) && config.clusters.length
          ? config.clusters
          : Array.isArray(config.clusterPoints)
            ? config.clusterPoints
            : [];

        const mapped = source
          .filter(item => item && item.selected !== false)
          .map((item, index) => {
            const label = item.label || item.name || item.cluster || `Cluster ${index + 1}`;
            const key = (item.key && String(item.key)) || normalizeKey(label);
            return key ? { key, label, name: item.name || label } : null;
          })
          .filter(Boolean);

        setClusterOptions(mapped.length ? mapped : FALLBACK_CLUSTERS);
        setLoadError('');
      } catch (err) {
        if (!cancelled) {
          console.error('[GamePortal] Failed to load clusters', err);
          setClusterOptions(FALLBACK_CLUSTERS);
          setLoadError('Unable to load clusters from admin config. Using defaults.');
        }
      }
    }

    loadConfig();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    lastTapRef.current = null;
    lastSignatureRef.current = null;
    setStatus(null);
    setShowModal(false);
    if (!selectedCluster) return;

    let cancelled = false;

    const fetchScore = async () => {
      try {
        const data = await api(`/api/tags/teamScore/${selectedCluster}`);
        if (cancelled) return;
        setStatus(data);

        const signature = JSON.stringify({
          lastTap: data.lastTap || null,
          eligible: data.eligible,
          points: data.points,
          message: data.message || null,
          error: data.error || null
        });

        const newTap = data.lastTap && data.lastTap !== lastTapRef.current;
        const newState = signature !== lastSignatureRef.current;

        if (newTap || newState) {
          lastTapRef.current = data.lastTap || lastTapRef.current;
          lastSignatureRef.current = signature;
          if (data.error || data.message || typeof data.eligible === 'boolean') {
            setShowModal(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[GamePortal] teamScore fetch failed', err);
        }
      }
    };

    fetchScore();
    const interval = setInterval(fetchScore, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedCluster]);

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => setShowModal(false), 5000);
    return () => clearTimeout(timer);
  }, [showModal]);

  const optionsToRender = useMemo(() => (
    clusterOptions.length ? clusterOptions : FALLBACK_CLUSTERS
  ), [clusterOptions]);

  const currentCluster = clusterOptions.find(opt => opt.key === selectedCluster);
  const currentClusterLabel = currentCluster?.name || currentCluster?.label || selectedCluster;

  if (!selectedCluster) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '12px' }}>Select Cluster</h2>
        <p style={{ marginBottom: '16px' }}>
          Choose the cluster that matches the RFID reader.
        </p>
        {loadError && (
          <div style={{ marginBottom: '12px', color: '#c53030', fontWeight: 600 }}>{loadError}</div>
        )}
        <select
          id="cluster-select"
          value={selectedCluster}
          onChange={(e) => setSelectedCluster(e.target.value)}
          style={{ padding: '12px 16px', fontSize: '1rem', width: '100%', maxWidth: '320px' }}
        >
          <option value="" disabled>
            -- Choose Cluster --
          </option>
          {optionsToRender.map(option => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      {showModal && status && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            border: '1px solid #cbd5f5',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: '24px',
            minWidth: '260px',
            maxWidth: '90vw',
            zIndex: 10
          }}
        >
          {status.error ? (
            <p style={{ color: '#c53030', fontWeight: 600 }}>Server error: {status.error}</p>
          ) : status.message ? (
            <p>{status.message}</p>
          ) : status.eligible ? (
            <p style={{ fontWeight: 600 }}>Team is eligible to play!</p>
          ) : (
            <p style={{ fontWeight: 600 }}>Team is not eligible yet.</p>
          )}
          <p style={{ marginTop: '8px' }}>Points: {status?.points ?? 0}</p>
          <p>Threshold: {status?.threshold ?? 'Not set'}</p>
          <button
            style={{ marginTop: '16px', padding: '8px 18px', fontSize: '0.95rem' }}
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        </div>
      )}

      <div style={{ opacity: showModal ? 0.3 : 1 }}>
        <h2 style={{ marginBottom: '12px' }}>Tap your card</h2>
        <p>Listening for taps at: <strong>{currentClusterLabel}</strong></p>
        {status && !status.message && !status.error && (
          <p style={{ marginTop: '12px' }}>
            Current points: {status.points ?? 0} &nbsp;|&nbsp; Threshold: {status.threshold ?? 'Not set'}
          </p>
        )}
        <button
          style={{ marginTop: '20px', padding: '10px 24px', fontSize: '1rem' }}
          onClick={() => setSelectedCluster('')}
        >
          Back
        </button>
      </div>
    </div>
  );
}
