const mqtt = require('mqtt');
const pool = require('../db/pool');
const { MQTT_URL } = require('../config/env');

const TOPIC = 'rfid/#';

const client = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 5000,
  connectTimeout: 10000
});

client.on('connect', () => {
  console.log(`[MQTT] Connected ${MQTT_URL}, subscribing ${TOPIC}`);
  client.subscribe(TOPIC, (err) => {
    if (err) console.error('[MQTT] subscribe error:', err.message);
  });
});

client.on('message', async (topic, message) => {
  try {
    const m = JSON.parse(message.toString());

    // Support both new format {reader, label, tag_id} and legacy {portal, label, rfid_card_id, tag}
    const tagHex = String(m.tag_id ?? m.tag ?? m.rfid_card_id ?? '').trim().toUpperCase();
    const portalRaw = String(m.reader ?? m.portal ?? 'UNKNOWN').trim();
    const labelRaw  = String(m.label ?? 'UNKNOWN').trim();
    const portal = portalRaw;
    let label = labelRaw.toUpperCase();
    // Normalize semantics: REGISTER at exitout portal => EXITOUT
    if (label === 'REGISTER' && portal.toLowerCase() === 'exitout') {
      label = 'EXITOUT';
    }

    if (!tagHex || !portal) {
      console.warn('[MQTT] missing tag_id/portal:', m);
      return;
    }

    await pool.query(
      `INSERT INTO logs (log_time, rfid_card_id, portal, label) VALUES (NOW(), $1, $2, $3)`,
      [tagHex, portal, label]
    );

  console.log(`[MQTT] logged tap ${tagHex} @ ${portal} (${label})`);
  } catch (e) {
    console.error('[MQTT] handle error:', e.message);
  }
});

client.on('error', (e) => console.error('[MQTT] client error:', e.message));
client.on('offline', () => console.warn('[MQTT] offline'));
client.on('reconnect', () => console.log('[MQTT] reconnecting...'));

process.on('SIGINT', () => { try { client.end(); } catch {} process.exit(0); });
module.exports = client;