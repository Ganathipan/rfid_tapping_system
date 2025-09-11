// server.js — Stalls Points Admin API + Static Admin UI
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

/** ─────────────────────────────────────────────────────────
 *  PostgreSQL Pool
 *  .env keys:
 *    PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 *    PORT (default 4000)
 *    ADMIN_USER, ADMIN_PASS  (for Basic Auth)
 *  ───────────────────────────────────────────────────────── */
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'rfid_exhibition',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30_000,
});

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'change-me';

/** Basic Auth for admin endpoints */
function adminAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Auth required');
  }
  const decoded = Buffer.from(hdr.slice(6), 'base64').toString();
  const [u, p] = decoded.split(':');
  if (u === ADMIN_USER && p === ADMIN_PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Invalid credentials');
}

/** Health check */
app.get('/health', (_req, res) => res.json({ ok: true }));

/** ─────────────────────────────────────────────────────────
 *  Stalls CRUD (only admins can write)
 *  GET is public so the kiosk/clients can read S values.
 *  ───────────────────────────────────────────────────────── */
app.get('/api/stalls', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, stall_name, base_points FROM stalls ORDER BY id ASC;'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/stalls', adminAuth, async (req, res) => {
  try {
    const { stall_name, base_points } = req.body;
    if (!stall_name || base_points == null) {
      return res.status(400).json({ error: 'stall_name and base_points required' });
    }
    const bp = Number(base_points);
    if (!Number.isInteger(bp) || bp < 0) {
      return res.status(400).json({ error: 'base_points must be a non-negative integer' });
    }
    const { rows } = await pool.query(
      'INSERT INTO stalls(stall_name, base_points) VALUES ($1, $2) RETURNING id, stall_name, base_points;',
      [stall_name.trim(), bp]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/stalls/:id', adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

    const { stall_name, base_points } = req.body;
    if (stall_name == null && base_points == null) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const updates = [];
    const vals = [];
    let i = 1;

    if (stall_name != null) {
      updates.push(`stall_name = $${i++}`);
      vals.push(String(stall_name).trim());
    }
    if (base_points != null) {
      const bp = Number(base_points);
      if (!Number.isInteger(bp) || bp < 0) {
        return res.status(400).json({ error: 'base_points must be a non-negative integer' });
      }
      updates.push(`base_points = $${i++}`);
      vals.push(bp);
    }
    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE stalls SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, stall_name, base_points;`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'stall not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/stalls/:id', adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid id' });

    const { rowCount } = await pool.query('DELETE FROM stalls WHERE id = $1;', [id]);
    if (!rowCount) return res.status(404).json({ error: 'stall not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Serve Admin UI (protected) */
app.use(
  '/admin',
  adminAuth,
  express.static(path.join(__dirname, 'public', 'admin'), { index: 'index.html' })
);

/** Optional: default route → quick hint */
app.get('/', (_req, res) => {
  res.type('text/plain').send('RFID Exhibition API. Admin UI at /admin');
});

/** 404 + error handlers */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Server running  : http://localhost:${PORT}`);
  console.log(`Admin portal    : http://localhost:${PORT}/admin`);
});
