const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tagsRouter = require('./routes/tags');
const gameScoreRouter = require('./routes/gameScore');
const adminPortalRouter = require('./routes/adminPortal');
const clusterOccupancyRouter = require('./routes/zoneOccupancy');

const app = express();

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' http://localhost:4000 http://192.168.8.4:4000;"
  );
  next();
});
app.use(cors());
app.use(express.json());

// health check
app.get('/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// mount main router
app.use('/api/tags', tagsRouter);
app.use('/api/tags', gameScoreRouter);
app.use('/api/admin', adminPortalRouter);
app.use('/api', clusterOccupancyRouter);

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT) || 4000;
app.listen(port, host, () => {
  console.log(`✅ RFID backend listening on http://${host}:${port}`);
});
