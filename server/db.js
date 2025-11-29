```javascript
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { Pool } = require('pg');

async function initDB() {
  // Use PostgreSQL on Render, SQLite locally
  if (process.env.DATABASE_URL) {
    // PostgreSQL for production
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dates TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

      CREATE TABLE IF NOT EXISTS availabilities(
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  selected_slots TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES events(id)
);
`);

    // Return a wrapper that mimics sqlite API
    return {
      get: async (sql, ...params) => {
        const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${ params.indexOf(_) + 1 } `), params);
        return result.rows[0];
      },
      all: async (sql, ...params) => {
        const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${ params.indexOf(_) + 1 } `), params);
        return result.rows;
      },
      run: async (sql, ...params) => {
        const pgSql = sql.replace(/\?/g, (match, offset) => {
          const index = sql.substring(0, offset).split('?').length;
          return `$${ index } `;
        });
        await pool.query(pgSql, params);
      }
    };
  } else {
    // SQLite for local development
    const db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  dates TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

      CREATE TABLE IF NOT EXISTS availabilities(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  selected_slots TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES events(id)
);
`);

    return db;
  }
}

module.exports = initDB;
```
