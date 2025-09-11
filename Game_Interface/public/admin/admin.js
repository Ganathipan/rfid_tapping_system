const $ = (s, el = document) => el.querySelector(s);
const API = {
  getStalls: () => fetch('/api/stalls').then(r => r.json()),
  addStall: (stall_name, base_points) =>
    fetch('/api/stalls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stall_name, base_points }),
    }).then(r => r.json()),
  updateStall: (id, patch) =>
    fetch(`/api/stalls/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => r.json()),
  deleteStall: (id) =>
    fetch(`/api/stalls/${id}`, { method: 'DELETE' }).then(r => r.json()),
};

function renderRow(stall) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${stall.id}</td>
    <td><input class="inp name" value="${stall.stall_name.replaceAll('"','&quot;')}" /></td>
    <td><input class="inp points" type="number" min="0" step="1" value="${stall.base_points}" /></td>
    <td class="actions">
      <button class="btn save">Save</button>
      <button class="btn danger del">Delete</button>
    </td>
  `;

  $('.save', tr).onclick = async () => {
    const name = $('.name', tr).value.trim();
    const points = Number($('.points', tr).value);
    if (!name) return alert('Name required');
    if (!Number.isInteger(points) || points < 0) return alert('Base points must be a non-negative integer');

    const res = await API.updateStall(stall.id, { stall_name: name, base_points: points });
    if (res.error) return alert(res.error);
    alert(`Updated: ${res.stall_name} (S=${res.base_points})`);
  };

  $('.del', tr).onclick = async () => {
    if (!confirm(`Delete stall "${stall.stall_name}"?`)) return;
    const res = await API.deleteStall(stall.id);
    if (res.error) return alert(res.error);
    await loadStalls();
  };

  return tr;
}

async function loadStalls() {
  const tbody = $('#tbl-stalls tbody');
  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
  const data = await API.getStalls();
  if (Array.isArray(data)) {
    tbody.innerHTML = '';
    data.forEach(stall => tbody.appendChild(renderRow(stall)));
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="4">No stalls yet.</td></tr>';
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${data.error || 'unknown'}</td></tr>`;
  }
}

async function addStall() {
  const name = $('#new-name').value.trim();
  const points = Number($('#new-points').value);
  if (!name) return alert('Name required');
  if (!Number.isInteger(points) || points < 0) return alert('Base points must be a non-negative integer');

  const out = $('#add-out');
  out.textContent = 'Saving…';
  const res = await API.addStall(name, points);
  out.textContent = JSON.stringify(res, null, 2);
  if (!res.error) {
    $('#new-name').value = '';
    $('#new-points').value = '20';
    await loadStalls();
  }
}

$('#btn-refresh').onclick = loadStalls;
$('#btn-add').onclick = addStall;

loadStalls();
