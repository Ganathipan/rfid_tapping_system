// Entry point for Node.js/Express backend
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json());

// TODO: Connect to PostgreSQL using pg
// TODO: Implement API endpoints for tap, crowd, admin, user, slot

app.get('/', (req, res) => {
  res.send('RFID Crowd Management API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
