import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { zonedTimeToUtc, format as formatTz } from 'date-fns-tz';
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

    const handleTimeSave = (ranges, timezone) => {
        if (!selectingDate) return;

        // We need to process the ranges and convert them to ET
        // ranges is ["HH:MM-HH:MM", ...]
        // timezone is e.g. "America/Los_Angeles"

        const etSlotsToAdd = [];

        ranges.forEach(range => {
            const [start, end] = range.split('-');

            // Construct full ISO strings for the selected date and time in the user's timezone
            const baseDateStr = format(selectingDate, 'yyyy-MM-dd');
            const startIso = `${baseDateStr}T${start}:00`;
            const endIso = `${baseDateStr}T${end}:00`;

            // Convert to UTC object
            const startUtc = zonedTimeToUtc(startIso, timezone);
            const endUtc = zonedTimeToUtc(endIso, timezone);

            // Format to ET
            // We want to know the date and time in ET
            const etStartStr = formatTz(startUtc, 'yyyy-MM-dd HH:mm', { timeZone: 'America/New_York' });
            const etEndStr = formatTz(endUtc, 'yyyy-MM-dd HH:mm', { timeZone: 'America/New_York' });

            const [etStartDate, etStartTime] = etStartStr.split(' ');
            const [etEndDate, etEndTime] = etEndStr.split(' ');

            // Handle case where start and end might be on different days in ET (e.g. overnight)
            // But for now, let's assume we split the range if it crosses midnight in ET?
            // Actually, simpler: just push the start and end. 
            // If they are on the same day in ET, great. 
            // If different days, we might need to split the slot? 
            // "Adjacent time slots will be automatically merged" in TimeSelector, but here we are storing them.
            // Our storage format is { date: "YYYY-MM-DD", ranges: ["HH:MM-HH:MM"] }

            if (etStartDate === etEndDate) {
                etSlotsToAdd.push({ date: etStartDate, range: `${etStartTime}-${etEndTime}` });
            } else {
                // Crosses midnight in ET. Split into two.
                // 1. Start -> 23:59 on StartDate
                // 2. 00:00 -> End on EndDate
                etSlotsToAdd.push({ date: etStartDate, range: `${etStartTime}-24:00` });
                etSlotsToAdd.push({ date: etEndDate, range: `00:00-${etEndTime}` });
            }
        });

        // Strategy: When editing a date, we need to clear ALL slots that might have been
        // created from this selectingDate in a previous save (which could span multiple ET dates
        // due to timezone conversion). Then add the new slots.
        // 
        // To identify which slots to clear: we need to determine which ET dates could have
        // been created from selectingDate. This is tricky because we don't know the previous timezone.
        // 
        // Simplified approach: When user clicks on a date to edit, we'll clear slots for:
        // 1. The exact selectingDate (in case it was entered in ET originally)
        // 2. The day before selectingDate (in case a late night slot in a western timezone created this date)
        // 3. The day after selectingDate (in case an early morning slot in an eastern timezone created this date)

        const selectingDateStr = format(selectingDate, 'yyyy-MM-dd');
        const dayBefore = format(new Date(selectingDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const dayAfter = format(new Date(selectingDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Remove slots for these three dates
        let newSelectedSlots = selectedSlots.filter(s =>
            s.date !== selectingDateStr && s.date !== dayBefore && s.date !== dayAfter
        );

        // Now add the new slots
        const slotsByDate = {};
        etSlotsToAdd.forEach(item => {
            if (!slotsByDate[item.date]) slotsByDate[item.date] = [];
            slotsByDate[item.date].push(item.range);
        });

        Object.keys(slotsByDate).forEach(date => {
            newSelectedSlots.push({ date, ranges: slotsByDate[date] });
        });

        setSelectedSlots(newSelectedSlots);
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

                <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '1.5rem',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                }}>
                    Share this link with participants so they can mark their availability for the event:
                </p>
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
                <div className="card" style={{ flex: '1 1 300px', maxWidth: '550px', margin: 0 }}>
                    {!submitted ? (
                        <form onSubmit={handleSubmit}>
                            <h3 style={{ marginTop: 0 }}>Mark Your Availability</h3>
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
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <span>•</span>
                                            <span>
                                                {event.dates && event.dates.length > 0
                                                    ? "Click an available date to add your availability based on your current timezone."
                                                    : "Click any date to add your availability based on your current timezone."}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <span>•</span>
                                            <span>Times entered will be automatically converted to and displayed in Eastern Time (ET).</span>
                                        </div>
                                    </div>
                                </div>
                                <EventCalendar
                                    selectedDates={selectedSlots}
                                    onDateSelect={handleDateClick}
                                    mode="input"
                                    allowedDates={event.dates}
                                    initialMonth={event.dates && event.dates.length > 0 ? new Date(event.dates[0]) : new Date()}
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                Confirm Availability
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
                <div style={{ flex: '1 1 300px', maxWidth: '550px', margin: 0, display: 'flex', flexDirection: 'column', gap: availabilities.length > 0 ? '2rem' : '0' }}>
                    {availabilities.length > 0 && (
                        <div style={{ width: '100%' }}>
                            <AvailabilitySummary availabilities={availabilities} event={event} style={{ maxWidth: '100%' }} />
                        </div>
                    )}

                    <div className="card card-accent" style={{ margin: 0, width: '100%', maxWidth: '100%' }}>
                        <h3 style={{ marginTop: 0 }}>Group Availability</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Click a date to see who is free and when.
                            <br />
                            <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                All times shown are in Eastern Time (ET).
                            </span>
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
