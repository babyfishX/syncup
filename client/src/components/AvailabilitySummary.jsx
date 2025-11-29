import React from 'react';
import { format, parseISO } from 'date-fns';

const AvailabilitySummary = ({ availabilities }) => {
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

    // Helper to convert minutes to "h:mm a"
    const toTimeStr = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
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
        <div className="summary-box" style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span> Best Time to Meet
            </h4>

            <div style={{ fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 1rem 0' }}>
                    <strong>{maxCount}</strong> out of <strong>{availabilities.length}</strong> people are available on:
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
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem'
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
