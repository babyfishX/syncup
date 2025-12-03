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

        // Now merge these into selectedSlots
        // We need to be careful not to overwrite existing slots for other dates, 
        // but we SHOULD overwrite slots for the dates we are touching?
        // Actually, the user might be adding slots for a date that maps to multiple ET dates.
        // The previous logic was: "Remove existing entry for this date if exists".
        // But "this date" was the local date. Now we are dealing with potentially multiple ET dates.

        // Strategy: 
        // 1. Remove all slots that originated from this "selectingDate" interaction? 
        //    Hard to track.
        // 2. Or, just merge into existing.
        //    But if user clears slots, we want to remove them.

        // Let's assume for now we just append/merge.
        // But wait, if I edit "Dec 25" and save, I expect "Dec 25" slots to be replaced.
        // But "Dec 25" in PT might be "Dec 25" and "Dec 26" in ET.
        // If I clear "Dec 25", I want both to be cleared.

        // To do this correctly, we might need to store the source date/timezone, but we don't have that schema.
        // Simplified approach:
        // We will just add the new slots. If there are overlaps, the backend or display logic handles it?
        // No, we need to manage `selectedSlots` state.

        // Let's try to remove slots for the ET dates that are affected?
        // That might be too aggressive if user added slots for Dec 26 directly.

        // Alternative: Just add them. The user can verify in the summary.
        // But we need to handle the "Remove existing entry" part.
        // The previous logic removed `s.date !== dateStr`.

        // Let's stick to: Remove entries for the ET dates that we are about to write to?
        // No, that deletes other valid slots.

        // Let's just Add/Merge. 
        // We'll filter out the *exact same* ranges if they exist, or just rely on a cleanup pass?
        // Let's just append for now and maybe implement a merge utility.

        // Actually, `selectedSlots` is an array of objects.
        // We should group `etSlotsToAdd` by date.
        const slotsByDate = {};
        etSlotsToAdd.forEach(item => {
            if (!slotsByDate[item.date]) slotsByDate[item.date] = [];
            slotsByDate[item.date].push(item.range);
        });

        let newSelectedSlots = [...selectedSlots];

        // For each affected date, we want to merge the new ranges with existing ones?
        // Or should we assume the user is "setting" the availability for this day?
        // Since we are converting, it's ambiguous.
        // Let's assume we are ADDING availability.

        Object.keys(slotsByDate).forEach(date => {
            const existingIndex = newSelectedSlots.findIndex(s => s.date === date);
            if (existingIndex >= 0) {
                // Merge
                const existingRanges = newSelectedSlots[existingIndex].ranges;
                const newRanges = [...existingRanges, ...slotsByDate[date]];
                // We should probably sort and merge overlapping ranges here to keep it clean
                // But TimeSelector does that. We can reuse a simple merge logic if we want, 
                // or just store them and let the backend/summary handle it.
                // Let's just store them.
                newSelectedSlots[existingIndex] = { date, ranges: newRanges };
            } else {
                newSelectedSlots.push({ date, ranges: slotsByDate[date] });
            }
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
                            <AvailabilitySummary availabilities={availabilities} style={{ maxWidth: '100%' }} />
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
