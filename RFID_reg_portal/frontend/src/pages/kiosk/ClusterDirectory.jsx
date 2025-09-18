import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function ClusterDirectory() {
  const [clusters, setClusters] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/kiosk/clusters')
      .then((d) => setClusters(d.clusters || []))
      .catch((e) => setErr(e.message || 'Failed to load clusters'));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Cluster Directory</h2>
      {err && <div className="small mut" style={{ color: '#b00' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
        {clusters.map((c) => (
          <Link key={c} className="card" to={`/kiosk/cluster/${encodeURIComponent(c)}`} style={{ padding: 12, textDecoration: 'none' }}>
            <div style={{ fontWeight: 700 }}>{c}</div>
            <div className="small mut">Open display</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
