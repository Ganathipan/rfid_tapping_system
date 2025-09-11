import { useState } from 'react';
import { api } from '../api';
import MemberAssignment from './MemberAssignment';

export default function RegistrationForm() {
  const [desk, setDesk] = useState('');
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);
  const [pendingLeaderId, setPendingLeaderId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [showMemberAssign, setShowMemberAssign] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [leaderIdForMembers, setLeaderIdForMembers] = useState(null);

  async function registerAndLink() {
    if (busy) return;
    setMsg('');
    setBusy(true);
    try {
      let leaderId = pendingLeaderId;

      // 1) Register leader if not already created
      if (!leaderId) {
        if (!desk.trim()) throw new Error('Desk is required');
        if (!name.trim()) throw new Error('Name is required');
        if (!Number.isInteger(Number(count)) || Number(count) < 1) {
          throw new Error('Count must be >= 1');
        }

        const reg = await api('/api/tags/register', {
          method: 'POST',
          body: {
            desk,
            name,
            group_size: Number(count),
            // all other fields → null
            province: null,
            district: null,
            school: null,
            university: null,
            age_range: null,
            sex: null,
            lang: null
          }
        });

        leaderId = reg.id;
        setPendingLeaderId(leaderId);
      }

      // 2) Link last REGISTER tap from this desk to leader
      const link = await api('/api/tags/link', {
        method: 'POST',
        body: { desk, leaderId, asLeader: true }
      });

      setMsg(`✅ ${count > 1 ? 'Group leader' : 'Individual'} #${leaderId} linked with tag ${link.tagId}`);
      if (Number(count) > 1) {
        setLeaderIdForMembers(leaderId);
        setMemberCount(Number(count) - 1);
        setShowMemberAssign(true);
        return;
      }

      // Reset form
      resetForm();
    } catch (e) {
      setMsg(`❌ ${e.message}${pendingLeaderId ? ` (kept as #${pendingLeaderId})` : ''}`);
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setPendingLeaderId(null);
    setDesk('');
    setName('');
    setCount(1);
    setMsg('🔁 Reset — you can create a new registration now.');
  }

  if (showMemberAssign && leaderIdForMembers) {
    return (
      <MemberAssignment
        desk={desk}
        leaderId={leaderIdForMembers}
        memberCount={memberCount}
        onDone={() => {
          setShowMemberAssign(false);
          resetForm();
        }}
      />
    );
  }

  return (
    <>
      <h3>RFID Registration</h3>

      <label>Desk</label>
      <input
        value={desk}
        onChange={e => setDesk(e.target.value)}
        placeholder="Desk name (e.g., desk1)"
        disabled={!!pendingLeaderId}
      />

      <label>Name</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Leader/Individual name"
        disabled={!!pendingLeaderId}
      />

      <label>Count</label>
      <input
        type="number"
        min="1"
        value={count}
        onChange={e => setCount(e.target.value)}
        disabled={!!pendingLeaderId}
      />

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={registerAndLink} disabled={busy}>
          {pendingLeaderId ? 'Retry Linking' : 'Submit & Assign Tag'}
        </button>
        {pendingLeaderId && (
          <div className="right">
            <button className="btn" onClick={resetForm} disabled={busy}>Start New Registration</button>
          </div>
        )}
      </div>

      <div className="hr" />

      <div className="small mut" style={{ marginTop: 10 }}>
        {pendingLeaderId && <>Pending Registration: <b>#{pendingLeaderId}</b> • </>}
        {msg}
      </div>
    </>
  );
}
