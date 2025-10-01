// Use centralized configuration
const { getBackendEnv } = require('../../../config/master-config.js');
const config = getBackendEnv();

const PORT = config.PORT || 4000;
const app = require('./app');

const server = app.listen(PORT, () => {
  console.log(`✅ RFID Backend listening on port ${PORT} (try http://localhost:${PORT})`);
});
