const fs = require("fs");
const path = require("path");

// Container hosts (Railway, Render) give the app an ephemeral filesystem, so in
// production the SQLite file has to live on a mounted volume or it is wiped on
// every deploy and restart. DB_PATH points at that volume; without it we fall
// back to the repo-local file used in development.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "training.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

module.exports = { DB_PATH };
