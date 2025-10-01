import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Skeleton, SkeletonGrid } from '../ui/Skeleton.jsx';
// Card components are named exports; no default Card used here.
import Loader from '../ui/Loader.jsx';
import Button from '../ui/Button.jsx';

function KPI({ label, value, suffix, tooltip }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-white/60" title={tooltip}>{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}{suffix && <span className='text-sm font-normal ml-1'>{suffix}</span>}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [live, setLive] = useState(null);
  const [range, setRange] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingRange, setLoadingRange] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const firstLoadRef = useRef(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [from, setFrom] = useState( () => new Date(Date.now() - 60*60*1000).toISOString().slice(0,16)); // last hour
  const [to, setTo] = useState( () => new Date().toISOString().slice(0,16));

  const shallowEqual = (a, b) => {
    if (!a || !b) return false;
    const keys = ['venue_total','active_cards','total_unique_cards','average_session_duration_secs','average_active_session_age_secs'];
    for (const k of keys) { if (a[k] !== b[k]) return false; }
    if ((a.clusters?.length||0) !== (b.clusters?.length||0)) return false;
    for (let i=0;i< (a.clusters?.length||0);i++) {
      if (a.clusters[i].visitors !== b.clusters[i].visitors) return false;
    }
    return true;
  };

  const fetchLive = useCallback(async () => {
    let showSpinner = firstLoadRef.current;
    if (showSpinner) setLoadingLive(true);
    try {
      const data = await api('/api/analytics/live');
      setError(null);
      setLastUpdated(new Date());
      setLive(prev => shallowEqual(prev, data) ? prev : data);
    } catch (e) {
      setError('Failed to load live analytics');
    } finally {
      if (showSpinner) {
        setLoadingLive(false);
        firstLoadRef.current = false;
      }
    }
  }, []);

  const fetchRange = useCallback(async () => {
    if (!from || !to) return;
    const fromIso = new Date(from).toISOString();
    const toIso = new Date(to).toISOString();
    if (new Date(fromIso) >= new Date(toIso)) {
      setError('From must be before To');
      return;
    }
    try {
      setLoadingRange(true);
  const data = await api(`/api/analytics/range?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`);
      setRange(data);
      setError(null);
    } catch (e) {
      setError('Failed to load range analytics');
    } finally {
      setLoadingRange(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchLive();
    pollRef.current = setInterval(fetchLive, 60000); // 60s interval
    return () => clearInterval(pollRef.current);
  }, [fetchLive]);

  function formatSecs(v){
    const s = Number(v||0);
    if (!s) return '0s';
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s/60); const r = Math.round(s%60);
    if (m < 60) return `${m}m ${r}s`;
    const h = Math.floor(m/60); const mm = m%60;
    return `${h}h ${mm}m`;
  }

  const displayClusters = (clusters) => (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {clusters.map(c => (
        <div key={c.id} className="p-3 rounded-md bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-white/60">{c.zone}</span>
          <span className="text-lg font-semibold">{c.visitors}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Crowd Analytics</h1>
          <p className="text-white/60 text-sm">Real-time cluster occupancy & visitor session metrics</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loadingLive && <Loader size="sm" />}
          <span className="text-white/50">Auto-refresh 60s</span>
          {lastUpdated && <span className="text-white/40">Last: {lastUpdated.toLocaleTimeString()}</span>}
          <Button size="sm" variant="accent" onClick={fetchLive}>Refresh Now</Button>
        </div>
      </header>
      {error && <div className="p-3 rounded bg-red-600/20 border border-red-600/30 text-sm text-red-200">{error}</div>}
      {!live && loadingLive && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_,i)=>(<Skeleton key={i} height={80} />))}
          </div>
          <div>
            <div className="h-5 w-28 bg-white/10 rounded mb-3 animate-pulse" />
            <SkeletonGrid count={16} />
          </div>
        </div>
      )}
      {live && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPI label="Venue Total" value={live.venue_total} tooltip="Active cards currently inside" />
            <KPI label="Active Cards" value={live.active_cards} />
            <KPI label="Unique Cards" value={live.total_unique_cards} tooltip={`Distinct cards in last ${live.window_hours}h`} />
            <KPI label="Avg Session" value={formatSecs(live.average_session_duration_secs)} />
            <KPI label="Avg Active Age" value={formatSecs(live.average_active_session_age_secs)} />
            <KPI label="Generated" value={new Date(live.generated_at).toLocaleTimeString()} />
          </div>
          <section>
            <h2 className="text-lg font-semibold mb-2">Clusters</h2>
            {displayClusters(live.clusters)}
          </section>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">Range Analytics</h2>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex flex-col gap-1">From
              <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="bg-white/10 px-2 py-1 rounded" />
            </label>
            <label className="flex flex-col gap-1">To
              <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="bg-white/10 px-2 py-1 rounded" />
            </label>
            <Button size="sm" onClick={fetchRange} disabled={loadingRange}>{loadingRange?'Computing…':'Compute'}</Button>
          </div>
        </div>
        {loadingRange && !range && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_,i)=>(<Skeleton key={i} height={80} />))}
            </div>
            <SkeletonGrid count={16} />
          </div>
        )}
        {range && !loadingRange && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <KPI label="Venue Total" value={range.venue_total} />
              <KPI label="Active Cards" value={range.active_cards} />
              <KPI label="Unique Cards" value={range.total_unique_cards} />
              <KPI label="Avg Session" value={formatSecs(range.average_session_duration_secs)} />
              <KPI label="Avg Active Age" value={formatSecs(range.average_active_session_age_secs)} />
              <KPI label="Generated" value={new Date(range.generated_at).toLocaleTimeString()} />
            </div>
            <div>
              <h3 className="text-md font-semibold mb-2">Clusters (Range)</h3>
              {displayClusters(range.clusters)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
