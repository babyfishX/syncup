import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import EventCalendar from './EventCalendar';
import TimeSelector from './TimeSelector';
import AvailabilityPopup from './AvailabilityPopup';
import AvailabilitySummary from './AvailabilitySummary';
import { getUserColorByName } from '../utils/colors';

const EventView = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [availabilities, setAvailabilities] = useState([]);
    const [userName, setUserName] = useState('');
    // selectedSlots: Array of { date: "YYYY-MM-DD", ranges: ["HH:MM-HH:MM"] }
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    // Modal states
    const [selectingDate, setSelectingDate] = useState(null); // Date object for TimeSelector
    const [viewingDate, setViewingDate] = useState(null); // Date string for AvailabilityPopup

    useEffect(() => {
        fetchEvent();
    }, [id]);

    const fetchEvent = async () => {
        try {
            const response = await fetch(`/api/events/${id}`);
            if (!response.ok) throw new Error('Event not found');
            const data = await response.json();
            setEvent(data.event);
            setAvailabilities(data.availabilities);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching event:', error);
            setLoading(false);
        }
    };

    const handleDateClick = (date) => {
        // If event has restricted dates, check if selected date is allowed
        if (event.dates && event.dates.length > 0) {
            const isAllowed = event.dates.some(d => isSameDay(new Date(d), date));
            if (!isAllowed) return;
        }
        setSelectingDate(date);
    };

    const handleTimeSave = (ranges) => {
        if (!selectingDate) return;
        // Use format to keep the local date string (e.g. "2023-12-14") 
        // instead of toISOString which might shift to UTC previous day
        const dateStr = format(selectingDate, 'yyyy-MM-dd');

        // Remove existing entry for this date if exists
        const newSlots = selectedSlots.filter(s => s.date !== dateStr);

        // Add new entry if ranges exist
        if (ranges.length > 0) {
            newSlots.push({ date: dateStr, ranges });
        }

        setSelectedSlots(newSlots);
        // Don't close the modal - user must click X to close
    };

    const handleViewDateClick = (date) => {
        setViewingDate(format(date, 'yyyy-MM-dd'));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userName || selectedSlots.length === 0) {
            alert('Please enter your name and select at least one date.');
            return;
        }

        try {
            await fetch(`/api/events/${id}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_name: userName, selected_slots: selectedSlots }),
            });
            setSubmitted(true);
            fetchEvent(); // Refresh data
        } catch (error) {
            console.error('Error submitting availability:', error);
            alert('Failed to submit availability');
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    if (loading) return <div className="container">Loading...</div>;
    if (!event) return (
        <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h2>Event not found</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                This event might have been deleted or the link is incorrect.
            </p>
            <a href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
                Create New Event
            </a>
        </div>
    );

    return (
        <div className="container">
            <div className="header">
                <h1>{event.name}</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>{event.description}</p>

                <div className="share-link">
                    <span>🔗</span>
                    <code>{window.location.href}</code>
                    <button onClick={copyLink} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Copy</button>
                </div>
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2rem',
                alignItems: 'flex-start',
                justifyContent: 'center'
            }}>
                {/* Left column: Mark your availability / Submitted */}
                <div className="card" style={{ flex: '1 1 400px', maxWidth: '550px', margin: 0 }}>
                    {!submitted ? (
                        <form onSubmit={handleSubmit}>
                            <h3 style={{ marginTop: 0 }}>Mark your availability</h3>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Dates & Times</label>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    {event.dates && event.dates.length > 0
                                        ? "Click an available date to add your availability."
                                        : "Click any date to add your availability."}
                                </p>
                                <EventCalendar
                                    selectedDates={selectedSlots}
                                    onDateSelect={handleDateClick}
                                    mode="input"
                                    allowedDates={event.dates}
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                Submit Availability
                            </button>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <h3 style={{ color: 'var(--color-success)' }}>Availability Submitted!</h3>
                            <p>Thanks for letting us know when you're free.</p>
                            <button onClick={() => setSubmitted(false)} style={{ marginTop: '1rem' }}>Edit Response</button>
                        </div>
                    )}
                </div>

                {/* Right column: Summary Box and Group Availability stacked */}
                <div style={{ flex: '1 1 400px', maxWidth: '550px', margin: 0, display: 'flex', flexDirection: 'column', gap: availabilities.length > 0 ? '2rem' : '0' }}>
                    {availabilities.length > 0 && (
                        <div style={{ width: '100%' }}>
                            <AvailabilitySummary availabilities={availabilities} />
                        </div>
                    )}

                    <div className="card card-accent" style={{ margin: 0, width: '100%' }}>
                        <h3 style={{ marginTop: 0 }}>Group Availability</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Click a date to see who is free and when.
                        </p>
                        <EventCalendar
                            mode="view"
                            availabilities={availabilities}
                            onDateSelect={handleViewDateClick}
                        />

                        <div style={{ marginTop: '2rem' }}>
                            <h4>Participants:</h4>
                            {availabilities.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>No responses yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {availabilities.map(a => (
                                        <span key={a.id} style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '999px',
                                            backgroundColor: getUserColorByName(a.user_name), color: 'white', fontSize: '0.875rem'
                                        }}>
                                            {a.user_name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectingDate && (
                <TimeSelector
                    date={selectingDate}
                    initialRanges={selectedSlots.find(s => s.date === format(selectingDate, 'yyyy-MM-dd'))?.ranges}
                    onSave={handleTimeSave}
                    onCancel={() => setSelectingDate(null)}
                />
            )}

            {viewingDate && (
                <AvailabilityPopup
                    date={viewingDate}
                    availabilities={availabilities}
                    onClose={() => setViewingDate(null)}
                />
            )}
        </div>
    );
};

export default EventView;
