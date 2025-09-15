const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tagsRouter = require('./routes/tags');

const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get('/health', (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// mount main router
app.use('/api/tags', tagsRouter);

const host = '192.168.8.2';
const port = process.env.PORT || 4000;
app.listen(port, host, () => {
  console.log(`✅ RFID backend listening on http://${host}:${port}`);
});
