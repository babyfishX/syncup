import React from 'react';
import { format, parseISO } from 'date-fns';

const AvailabilitySummary = ({ availabilities, style }) => {
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
                                <div style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'rgba(56, 189, 248, 0.25)',
                                    color: '#f0fdfa',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem',
                                    border: '1px solid rgba(56, 189, 248, 0.4)'
                                }}>
                                    {timeWindows.join(', ')}
                                </div>
                            ) : (
                                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    No overlapping time slots
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
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
