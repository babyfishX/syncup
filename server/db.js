const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

class Database {
  constructor() {
    this.db = null;
    this.isPostgres = false;
  }

  async init() {
    if (process.env.DATABASE_URL) {
      // PostgreSQL for production
      this.isPostgres = true;
      this.db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      // Create tables
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          dates TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.query(`
        CREATE TABLE IF NOT EXISTS availabilities (
          id SERIAL PRIMARY KEY,
          event_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          selected_slots TEXT NOT NULL,
          FOREIGN KEY (event_id) REFERENCES events(id)
        )
      `);

      console.log('PostgreSQL database initialized');
    } else {
      // SQLite for local development
      this.isPostgres = false;
      this.db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          dates TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS availabilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          selected_slots TEXT NOT NULL,
          FOREIGN KEY (event_id) REFERENCES events(id)
        )
      `);

      console.log('SQLite database initialized');
    }
  }

  async createEvent(id, name, description, dates) {
    const datesJson = JSON.stringify(dates);
    if (this.isPostgres) {
      await this.db.query(
        'INSERT INTO events (id, name, description, dates) VALUES ($1, $2, $3, $4)',
        [id, name, description, datesJson]
      );
    } else {
      await this.db.run(
        'INSERT INTO events (id, name, description, dates) VALUES (?, ?, ?, ?)',
        [id, name, description, datesJson]
      );
    }
  }

  async getEvent(id) {
    if (this.isPostgres) {
      const result = await this.db.query('SELECT * FROM events WHERE id = $1', [id]);
      return result.rows[0];
    } else {
      return await this.db.get('SELECT * FROM events WHERE id = ?', id);
    }
  }

  async getAvailabilities(eventId) {
    if (this.isPostgres) {
      const result = await this.db.query('SELECT * FROM availabilities WHERE event_id = $1', [eventId]);
      return result.rows;
    } else {
      return await this.db.all('SELECT * FROM availabilities WHERE event_id = ?', eventId);
    }
  }

  async createAvailability(eventId, userName, selectedSlots) {
    const slotsJson = JSON.stringify(selectedSlots);
    if (this.isPostgres) {
      // Try to update first
      const result = await this.db.query(
        'UPDATE availabilities SET selected_slots = $1 WHERE event_id = $2 AND user_name = $3',
        [slotsJson, eventId, userName]
      );

      // If no row was updated, insert a new one
      if (result.rowCount === 0) {
        await this.db.query(
          'INSERT INTO availabilities (event_id, user_name, selected_slots) VALUES ($1, $2, $3)',
          [eventId, userName, slotsJson]
        );
      }
    } else {
      // SQLite implementation
      const result = await this.db.run(
        'UPDATE availabilities SET selected_slots = ? WHERE event_id = ? AND user_name = ?',
        [slotsJson, eventId, userName]
      );

      if (result.changes === 0) {
        await this.db.run(
          'INSERT INTO availabilities (event_id, user_name, selected_slots) VALUES (?, ?, ?)',
          [eventId, userName, slotsJson]
        );
      }
    }
  }
}

module.exports = Database;
