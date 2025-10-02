const { Client } = require('pg');
const { getDatabaseUrl } = require('../../../../config/master-config');

const channel = 'logs_reader1_cluster';
let subs = new Set();

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

async function startReader1ClusterBus() {
  const conn = process.env.DATABASE_URL || getDatabaseUrl();
  const client = new Client({ connectionString: conn });
  await client.connect();
  await client.query(`LISTEN ${channel}`);
  client.on('notification', (msg) => {
    try {
      const data = JSON.parse(msg.payload);
      for (const fn of subs) { try { fn(data); } catch (_) {} }
    } catch (_) {}
  });
  client.on('error', (e) => console.error('reader1ClusterBus error:', e.message));
  return client;
}

module.exports = { startReader1ClusterBus, subscribe };
