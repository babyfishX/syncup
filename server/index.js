const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const initDB = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let db;

initDB().then(database => {
    db = database;
    console.log('Database initialized');
});

// Create Event
app.post('/api/events', async (req, res) => {
    const { name, description, dates } = req.body;
    const id = crypto.randomUUID();
    try {
        await db.run(
            'INSERT INTO events (id, name, description, dates) VALUES (?, ?, ?, ?)',
            [id, name, description, JSON.stringify(dates)]
        );
        res.json({ id, name, description, dates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Event
app.get('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const event = await db.get('SELECT * FROM events WHERE id = ?', id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        event.dates = JSON.parse(event.dates);

        const availabilities = await db.all('SELECT * FROM availabilities WHERE event_id = ?', id);
        const parsedAvailabilities = availabilities.map(a => ({
            ...a,
            selected_slots: JSON.parse(a.selected_slots)
        }));

        res.json({ event, availabilities: parsedAvailabilities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Availability
app.post('/api/events/:id/availability', async (req, res) => {
    const { id } = req.params;
    const { user_name, selected_slots } = req.body;
    try {
        await db.run(
            'INSERT INTO availabilities (event_id, user_name, selected_slots) VALUES (?, ?, ?)',
            [id, user_name, JSON.stringify(selected_slots)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const path = require('path');

// ... existing code ...

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
