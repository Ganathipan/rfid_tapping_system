const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  user: "your_pg_user",
  host: "localhost",
  database: "your_pg_db",
  password: "your_pg_pass",
  port: 5432,
});

// RFID endpoint
app.post("/rfidRead", async (req, res) => {
  const { reader, portal, tag } = req.body;

  if (!reader || !portal || !tag) {
    return res.status(400).json({ error: "Missing reader, portal or tag" });
  }

  try {
    const query = `
      INSERT INTO rfid_log (log_time, rfid_card_id, portal, label)
      VALUES (NOW(), $1, $2, $3)
      RETURNING id, log_time, rfid_card_id, portal, label
    `;
    const values = [tag, portal, reader];

    const result = await pool.query(query, values);

    res.json({
      status: "success",
      entry: result.rows[0]
    });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});


// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
