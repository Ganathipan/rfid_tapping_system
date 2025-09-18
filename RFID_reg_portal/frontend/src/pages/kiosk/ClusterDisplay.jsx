import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';

export default function ClusterDisplay() {
  const { clusterLabel } = useParams();
  const [lastTap, setLastTap] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [err, setErr] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const esRef = useRef(null);
  const lastCallRef = useRef(0);

  useEffect(() => {
    const es = new EventSource(`/api/kiosk/cluster/${encodeURIComponent(clusterLabel)}/stream`);
    esRef.current = es;
    es.addEventListener('tap', async (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setLastTap(data);
        // debounce frequent taps (500ms) to avoid excessive API calls
        const now = Date.now();
        if (now - lastCallRef.current < 500) return;
        lastCallRef.current = now;
        if (data?.rfid_card_id) {
          const el = await api(`/api/kiosk/eligibility/by-card/${encodeURIComponent(data.rfid_card_id)}`);
          setEligibility(el);
        }
      } catch (e) {
        setErr(e.message || 'Stream error');
      }
    });
    es.addEventListener('open', () => { setDisconnected(false); });
    es.addEventListener('error', () => {
      setDisconnected(true);
      setErr('SSE disconnected… reconnecting');
    });
    return () => { es.close(); };
  }, [clusterLabel]);

  const eligible = eligibility?.eligible === true;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Cluster: {clusterLabel}</h2>
        <Link to="/kiosk" className="border" style={{ padding: '6px 10px', textDecoration: 'none' }}>All Clusters</Link>
      </div>

      {lastTap && (
        <div className="small mut">Last tap: card {lastTap.rfid_card_id} at {new Date(lastTap.log_time).toLocaleTimeString()}</div>
      )}

      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        {eligible ? (
          <div style={{ color: '#1a7f37', fontSize: 28, fontWeight: 800 }}>✅ Congrats your team is eligible to play!</div>
        ) : (
          <div style={{ color: '#b91c1c', fontSize: 28, fontWeight: 800 }}>❌ Your Team need more points! Try visiting other Clusters to earn the points</div>
        )}
      </div>
      {disconnected && (
        <div className="small" style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '6px 10px', borderRadius: 6 }}>
          {err || 'SSE disconnected… reconnecting'}
        </div>
      )}
    </div>
  );
}
