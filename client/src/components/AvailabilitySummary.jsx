import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
    generateICalFile,
    downloadICalFile,
    generateGoogleCalendarUrl,
    generateYahooCalendarUrl,
    generateOutlookCalendarUrl
} from '../utils/calendarUtils';


const AvailabilitySummary = ({ availabilities, event, style }) => {
    const [openDropdown, setOpenDropdown] = useState(null);

    if (!availabilities || availabilities.length === 0) return null;

    // 1. Flatten all availability slots
    const dateStats = {};

    availabilities.forEach(user => {
        user.selected_slots.forEach(slot => {
            const dateStr = typeof slot === 'string' ? slot : slot.date;
            if (!dateStats[dateStr]) {
                dateStats[dateStr] = { count: 0, users: [], timeRanges: [] };
            }
            dateStats[dateStr].count++;
            dateStats[dateStr].users.push(user.user_name);

            // Collect time ranges for this user on this date
            // If slot is string (legacy), assume full day (00:00-23:59)
            const ranges = typeof slot === 'string' ? ['00:00-23:59'] : (slot.ranges || ['00:00-23:59']);
            dateStats[dateStr].timeRanges.push(ranges);
        });
    });

    // 2. Find the max count
    let maxCount = 0;
    Object.values(dateStats).forEach(stat => {
        if (stat.count > maxCount) maxCount = stat.count;
    });

    if (maxCount === 0) return null;

    // 3. Filter dates with max count
    const bestDates = Object.keys(dateStats).filter(date => dateStats[date].count === maxCount);
    bestDates.sort();

    // Helper to convert "HH:MM" to minutes from midnight
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper to convert minutes to "HH:MM" (24-hour format)
    const toTimeStr = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // 4. Calculate overlapping time windows for best dates
    const bestDatesWithWindows = bestDates.map(date => {
        const userRanges = dateStats[date].timeRanges; // Array of arrays of strings
        // We need to find the intersection of all users' ranges

        // Start with full day as the "common" availability
        let commonIntervals = [{ start: 0, end: 24 * 60 }];

        // Intersect with each user's availability
        userRanges.forEach(ranges => {
            // Convert user's ranges to intervals
            const userIntervals = ranges.map(r => {
                const [startStr, endStr] = r.split('-');
                return { start: toMinutes(startStr), end: toMinutes(endStr) };
            });

            // Intersect current commonIntervals with userIntervals
            const newCommon = [];
            commonIntervals.forEach(common => {
                userIntervals.forEach(user => {
                    const start = Math.max(common.start, user.start);
                    const end = Math.min(common.end, user.end);
                    if (start < end) {
                        newCommon.push({ start, end });
                    }
                });
            });
            commonIntervals = newCommon;
        });

        // Format the resulting intervals
        const timeWindows = commonIntervals.map(interval =>
            `${toTimeStr(interval.start)} - ${toTimeStr(interval.end)}`
        );

        return {
            date,
            users: dateStats[date].users,
            timeWindows
        };
    });

    // Handler for calendar downloads
    const handleCalendarDownload = (date, timeWindow, type) => {
        if (!event) return;

        const [startTime, endTime] = timeWindow.split(' - ');
        const eventParams = {
            title: event.name,
            description: event.description || '',
            date,
            startTime,
            endTime,
            attendees: dateStats[date].users
        };

        if (type === 'ical') {
            const icalContent = generateICalFile(eventParams);
            const filename = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${date}.ics`;
            downloadICalFile(icalContent, filename);
        } else if (type === 'google') {
            window.open(generateGoogleCalendarUrl(eventParams), '_blank');
        } else if (type === 'yahoo') {
            window.open(generateYahooCalendarUrl(eventParams), '_blank');
        } else if (type === 'outlook') {
            window.open(generateOutlookCalendarUrl(eventParams), '_blank');
        }

        setOpenDropdown(null);
    };

    return (
        <div className="card" style={{
            margin: 0,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.15), 0 2px 4px -2px rgba(16, 185, 129, 0.1)',
            ...style
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span> Best Time to Meet (ET)
            </h4>

            <div style={{ fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 1rem 0' }}>
                    <strong>{maxCount}</strong> out of <strong>{availabilities.length}</strong> people are available on:
                    <br />
                    <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                        All times shown are in Eastern Time (ET).
                    </span>
                </p>
                <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none' }}>
                    {bestDatesWithWindows.map(({ date, users, timeWindows }) => (
                        <li key={date} style={{
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '1rem' }}>
                                {format(parseISO(date), 'EEEE, MMMM do')}
                            </div>

                            {timeWindows.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {timeWindows.map((timeWindow, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: 'rgba(56, 189, 248, 0.25)',
                                                color: '#f0fdfa',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem',
                                                border: '1px solid rgba(56, 189, 248, 0.4)'
                                            }}>
                                                {timeWindow}
                                            </div>

                                            {event && (
                                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === `${date}-${idx}` ? null : `${date}-${idx}`)}
                                                        style={{
                                                            padding: '0.25rem 0.75rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.3)',
                                                            border: '1px solid rgba(16, 185, 129, 0.6)',
                                                            borderRadius: '4px',
                                                            color: '#f0fdfa',
                                                            cursor: 'pointer',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.4)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                                                        }}
                                                    >
                                                        📅 Add to Calendar
                                                        <span style={{ fontSize: '0.6rem' }}>▼</span>
                                                    </button>

                                                    {openDropdown === `${date}-${idx}` && (
                                                        <>
                                                            {/* Backdrop to close dropdown */}
                                                            <div
                                                                onClick={() => setOpenDropdown(null)}
                                                                style={{
                                                                    position: 'fixed',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    zIndex: 999
                                                                }}
                                                            />
                                                            {/* Dropdown menu */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: '100%',
                                                                marginLeft: '0.5rem',
                                                                backgroundColor: 'var(--color-bg-secondary)',
                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                borderRadius: '6px',
                                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                                                                zIndex: 1000,
                                                                minWidth: '200px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <button
                                                                    onClick={() => handleCalendarDownload(date, timeWindow, 'ical')}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.5rem 0.75rem',
                                                                        textAlign: 'left',
                                                                        backgroundColor: 'transparent',
                                                                        border: 'none',
                                                                        color: 'var(--color-text)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        transition: 'background-color 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <img src="/icons/apple-calendar.png" alt="Apple" style={{ width: '16px', height: '16px' }} />
                                                                    Apple iCal Calendar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCalendarDownload(date, timeWindow, 'google')}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.5rem 0.75rem',
                                                                        textAlign: 'left',
                                                                        backgroundColor: 'transparent',
                                                                        border: 'none',
                                                                        color: 'var(--color-text)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        transition: 'background-color 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <img src="/icons/google-calendar.png" alt="Google" style={{ width: '16px', height: '16px' }} />
                                                                    Google Calendar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCalendarDownload(date, timeWindow, 'yahoo')}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.5rem 0.75rem',
                                                                        textAlign: 'left',
                                                                        backgroundColor: 'transparent',
                                                                        border: 'none',
                                                                        color: 'var(--color-text)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        transition: 'background-color 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <img src="/icons/yahoo-calendar.svg" alt="Yahoo" style={{ width: '16px', height: '16px' }} />
                                                                    Yahoo Calendar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCalendarDownload(date, timeWindow, 'outlook')}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.5rem 0.75rem',
                                                                        textAlign: 'left',
                                                                        backgroundColor: 'transparent',
                                                                        border: 'none',
                                                                        color: 'var(--color-text)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        transition: 'background-color 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.backgroundColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <img src="/icons/outlook-calendar.svg" alt="Outlook" style={{ width: '16px', height: '16px' }} />
                                                                    Outlook Calendar
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    No overlapping time slots
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                Available: {users.join(', ')}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AvailabilitySummary;
