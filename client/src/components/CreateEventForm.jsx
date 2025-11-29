import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eachDayOfInterval, startOfDay } from 'date-fns';

const CreateEventForm = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name) {
            alert('Please enter a name.');
            return;
        }

        let selectedDates = [];
        if (startDate && endDate) {
            if (startDate > endDate) {
                alert('Start date must be before end date.');
                return;
            }
            try {
                const range = eachDayOfInterval({
                    start: startOfDay(new Date(startDate)),
                    end: startOfDay(new Date(endDate))
                });
                selectedDates = range.map(d => d.toISOString());
            } catch (err) {
                console.error("Invalid date range", err);
                alert("Invalid date range");
                return;
            }
        }

        try {
            const response = await fetch('http://localhost:3001/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, dates: selectedDates }),
            });
            const data = await response.json();
            navigate(`/event/${data.id}`);
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event');
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>SyncUp</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Coordinate group schedules effortlessly.</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Event Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Birthday Dinner"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Details about the event..."
                            rows={3}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Potential Date Range (Optional)</label>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            Define a range of dates for the event, or leave blank for open-ended.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        Create Event
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateEventForm;
