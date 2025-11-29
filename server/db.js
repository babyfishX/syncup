const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDB() {
  const db = await open({
    filename: './database.sqlite',
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
