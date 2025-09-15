// rfid-test-backend/server.js

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "RFID test backend running" });
});

// RFID endpoint (matches ESP8266 code)
app.post("/api/tags/rfidRead", (req, res) => {
  const { reader, portal, tag } = req.body;
  console.log("📡 New RFID Read:");
  console.log(`   Reader: ${reader}`);
  console.log(`   Portal: ${portal}`);
  console.log(`   Tag:    ${tag}`);

  res.json({
    success: true,
    received: { reader, portal, tag },
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ RFID Test Backend running on http://localhost:${PORT}`);
});
