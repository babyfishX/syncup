const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const database = new Database();

database.init().then(() => {
    console.log('Database ready');
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// Create Event
app.post('/api/events', async (req, res) => {
    const { name, description, dates } = req.body;
    const id = crypto.randomUUID();
    try {
        await database.createEvent(id, name, description, dates);
        res.json({ id, name, description, dates });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Event
app.get('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const event = await database.getEvent(id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        event.dates = JSON.parse(event.dates);

        const availabilities = await database.getAvailabilities(id);
        const parsedAvailabilities = availabilities.map(a => ({
            ...a,
            selected_slots: JSON.parse(a.selected_slots)
        }));

        res.json({ event, availabilities: parsedAvailabilities });
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({ error: err.message });
    }
});

// Submit Availability
app.post('/api/events/:id/availability', async (req, res) => {
    const { id } = req.params;
    const { user_name, selected_slots } = req.body;
    try {
        await database.createAvailability(id, user_name, selected_slots);
        res.json({ success: true });
    } catch (err) {
        console.error('Error submitting availability:', err);
        res.status(500).json({ error: err.message });
    }
});

const path = require('path');

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
