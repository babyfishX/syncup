const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function initDB() {
  // Use persistent storage on Render, fallback to local for development
  const dataDir = process.env.RENDER ? '/opt/render/project/data' : __dirname;
  const dbPath = path.join(dataDir, 'database.sqlite');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      dates TEXT NOT NULL, -- JSON string of dates
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS availabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      selected_slots TEXT NOT NULL, -- JSON string of selected slots
      FOREIGN KEY (event_id) REFERENCES events(id)
    );
  `);

  return db;
}

module.exports = initDB;
