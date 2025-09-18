import { useEffect, useMemo, useState } from 'react';
import { gameLite } from '../../api';

export default function GameLiteAdmin() {
  const [cfg, setCfg] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [draftRule, setDraftRule] = useState({ cluster_label: '', award_points: 0, redeemable: false, redeem_points: 0 });
  const [redeemForm, setRedeemForm] = useState({ registration_id: '', cluster_label: '', redeemed_by: '' });

  const load = async () => {
    try {
      const [c, e] = await Promise.all([gameLite.getConfig(), gameLite.getEligibleTeams()]);
      setCfg(c);
      setEligible(e);
    } catch (e) {
      setMsg(e.message || 'Failed to load Game Lite data');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const rulesArray = useMemo(() => {
    const rules = cfg?.rules?.clusterRules || {};
    return Object.entries(rules).map(([cluster_label, v]) => ({
      cluster_label,
      award_points: v.awardPoints ?? 0,
      redeemable: !!v.redeemable,
      redeem_points: v.redeemPoints ?? 0,
    }));
  }, [cfg]);

  const saveConfig = async (patch) => {
    setSaving(true);
    try {
      const res = await gameLite.setConfig({ rules: patch.rules ? patch.rules : patch, enabled: patch.enabled });
      setCfg(res);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveRules = async (arr) => {
    setSaving(true);
    try {
      const res = await gameLite.setClusterRules(arr);
      setCfg(res);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addOrUpdateRule = async () => {
    const key = draftRule.cluster_label.trim().toUpperCase();
    if (!key) return;
    const arr = [
      ...rulesArray.filter((r) => r.cluster_label !== key),
      { ...draftRule, cluster_label: key },
    ];
    await saveRules(arr);
    setDraftRule({ cluster_label: '', award_points: 0, redeemable: false, redeem_points: 0 });
  };

  const updateRule = async (idx, patch) => {
    const arr = rulesArray.slice();
    arr[idx] = { ...arr[idx], ...patch };
    await saveRules(arr);
  };

  const doRedeem = async () => {
    setMsg('');
    if (!redeemForm.registration_id || !redeemForm.cluster_label) return;
    try {
      const out = await gameLite.redeem(redeemForm);
      setMsg(out?.ok ? `Redeemed for team ${redeemForm.registration_id} at ${redeemForm.cluster_label}` : 'Redeem completed');
      setRedeemForm({ registration_id: '', cluster_label: '', redeemed_by: '' });
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (!cfg) {
    return (
      <div style={{ padding: 16 }}>
        <div>Loading Game Lite…</div>
        {msg && (
          <div style={{ marginTop: 8, color: '#b00' }}>
            {msg}
          </div>
        )}
        <button className="border" style={{ marginTop: 8, padding: '6px 10px' }} onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ margin: '8px 0' }}>Game Lite Admin</h2>

      <section className="card" style={{ padding: 12, marginBottom: 12 }}>
        <h3>Config</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => saveConfig({ enabled: e.target.checked })} />
            Enabled
          </label>
          <label>
            Label Prefix
            <input className="border" style={{ width: '100%', padding: 4 }}
              value={cfg.rules?.eligibleLabelPrefix || 'CLUSTER'}
              onChange={(e) => saveConfig({ rules: { eligibleLabelPrefix: e.target.value } })} />
          </label>
          <label>
            Min group
            <input type="number" className="border" style={{ width: '100%', padding: 4 }}
              value={cfg.rules?.minGroupSize ?? 1}
              onChange={(e) => saveConfig({ rules: { minGroupSize: Number(e.target.value) } })} />
          </label>
          <label>
            Max group
            <input type="number" className="border" style={{ width: '100%', padding: 4 }}
              value={cfg.rules?.maxGroupSize ?? 9999}
              onChange={(e) => saveConfig({ rules: { maxGroupSize: Number(e.target.value) } })} />
          </label>
          <label>
            Min points
            <input type="number" className="border" style={{ width: '100%', padding: 4 }}
              value={cfg.rules?.minPointsRequired ?? 0}
              onChange={(e) => saveConfig({ rules: { minPointsRequired: Number(e.target.value) } })} />
          </label>
          {saving && <div className="small mut">Saving…</div>}
        </div>
      </section>

      <section className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Per-Cluster Rules</h3>
          <button className="border" onClick={load} style={{ padding: '6px 10px' }}>Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="border p-1">Cluster</th>
                <th className="border p-1">Award</th>
                <th className="border p-1">Redeemable</th>
                <th className="border p-1">Redeem</th>
              </tr>
            </thead>
            <tbody>
              {rulesArray.map((r, i) => (
                <tr key={r.cluster_label}>
                  <td className="border p-1 mono">
                    <input
                      className="border"
                      style={{ width: 140, padding: 4 }}
                      value={r.cluster_label}
                      onChange={(e) => updateRule(i, { cluster_label: e.target.value.toUpperCase() })}
                      onBlur={async (e) => {
                        const newKey = String(e.target.value || '').trim().toUpperCase();
                        if (!newKey || newKey === r.cluster_label) return;
                        // Rename the key by rebuilding rules array (unique keys)
                        const arr = rulesArray
                          .filter((x, idx) => idx !== i && x.cluster_label !== newKey)
                          .concat([{ ...r, cluster_label: newKey }]);
                        await saveRules(arr);
                      }}
                    />
                  </td>
                  <td className="border p-1">
                    <input type="number" className="border" style={{ width: 80, padding: 4 }}
                      value={r.award_points}
                      onChange={(e) => updateRule(i, { award_points: Number(e.target.value) })} />
                  </td>
                  <td className="border p-1" style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!r.redeemable}
                      onChange={(e) => updateRule(i, { redeemable: e.target.checked })} />
                  </td>
                  <td className="border p-1">
                    <input type="number" className="border" style={{ width: 80, padding: 4 }}
                      value={r.redeem_points}
                      onChange={(e) => updateRule(i, { redeem_points: Number(e.target.value) })} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border p-1">
                  <input placeholder="CLUSTER1" className="border" style={{ width: 120, padding: 4 }}
                    value={draftRule.cluster_label}
                    onChange={(e) => setDraftRule({ ...draftRule, cluster_label: e.target.value.toUpperCase() })} />
                </td>
                <td className="border p-1">
                  <input type="number" className="border" style={{ width: 80, padding: 4 }}
                    value={draftRule.award_points}
                    onChange={(e) => setDraftRule({ ...draftRule, award_points: Number(e.target.value) })} />
                </td>
                <td className="border p-1" style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={draftRule.redeemable}
                    onChange={(e) => setDraftRule({ ...draftRule, redeemable: e.target.checked })} />
                </td>
                <td className="border p-1">
                  <input type="number" className="border" style={{ width: 80, padding: 4 }}
                    value={draftRule.redeem_points}
                    onChange={(e) => setDraftRule({ ...draftRule, redeem_points: Number(e.target.value) })} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button className="border" style={{ marginTop: 8, padding: '6px 10px' }} onClick={addOrUpdateRule}>Add / Update Rule</button>
      </section>

      <section className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Eligible Teams</h3>
          <button className="border" onClick={load} style={{ padding: '6px 10px' }}>Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="border p-1">Reg ID</th>
                <th className="border p-1">Group</th>
                <th className="border p-1">Score</th>
                <th className="border p-1">Latest</th>
                <th className="border p-1">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((t) => (
                <tr key={t.registration_id}>
                  <td className="border p-1">{t.registration_id}</td>
                  <td className="border p-1">{t.group_size}</td>
                  <td className="border p-1">{t.score}</td>
                  <td className="border p-1 mono">{t.latest_label || '-'}</td>
                  <td className="border p-1">{t.latest_time ? new Date(t.latest_time).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ padding: 12, marginBottom: 12 }}>
        <h3>Redeem</h3>
        <div style={{ marginBottom: 8, color: '#2674d6', fontWeight: 500 }}>
          Clusters marked as <b>redeemable</b> will automatically redeem points when a visitor taps the cluster reader. Manual redeem is disabled for these clusters.
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <label>
            Registration ID
            <input className="border" style={{ width: 120, padding: 4 }}
              value={redeemForm.registration_id}
              onChange={(e) => setRedeemForm({ ...redeemForm, registration_id: e.target.value })} />
          </label>
          <label>
            Cluster
            <select className="border" style={{ padding: 4 }} value={redeemForm.cluster_label}
              onChange={(e) => setRedeemForm({ ...redeemForm, cluster_label: e.target.value })}>
              <option value="">Choose cluster</option>
              {rulesArray.filter(r => !r.redeemable).map(r => (
                <option key={r.cluster_label} value={r.cluster_label}>{r.cluster_label} (−{r.redeem_points})</option>
              ))}
            </select>
          </label>
          <label>
            By
            <input className="border" style={{ width: 160, padding: 4 }}
              value={redeemForm.redeemed_by}
              onChange={(e) => setRedeemForm({ ...redeemForm, redeemed_by: e.target.value })} />
          </label>
          <button className="border" style={{ padding: '6px 10px' }} onClick={doRedeem} disabled={rulesArray.find(r => r.cluster_label === redeemForm.cluster_label)?.redeemable}>Redeem</button>
        </div>
        {msg && <div className="small mut" style={{ marginTop: 8 }}>{msg}</div>}
      </section>
    </div>
  );
}
