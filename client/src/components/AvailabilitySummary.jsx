import React from 'react';
import { format, parseISO } from 'date-fns';

const AvailabilitySummary = ({ availabilities }) => {
    if (!availabilities || availabilities.length === 0) return null;

    // 1. Flatten all availability slots
    // Map: DateString -> { count: number, users: string[] }
    const dateStats = {};

    availabilities.forEach(user => {
        user.selected_slots.forEach(slot => {
            const dateStr = typeof slot === 'string' ? slot : slot.date;
            if (!dateStats[dateStr]) {
                dateStats[dateStr] = { count: 0, users: [] };
            }
            dateStats[dateStr].count++;
            dateStats[dateStr].users.push(user.user_name);
        });
    });

    // 2. Find the max count
    let maxCount = 0;
    Object.values(dateStats).forEach(stat => {
        if (stat.count > maxCount) maxCount = stat.count;
    });

    // 3. Filter dates with max count
    const bestDates = Object.keys(dateStats).filter(date => dateStats[date].count === maxCount);

    // Sort dates chronologically
    bestDates.sort();

    if (maxCount === 0) return null;

    return (
        <div className="summary-box" style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✨</span> Best Time to Meet
            </h4>

            <div style={{ fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                    <strong>{maxCount}</strong> out of <strong>{availabilities.length}</strong> people are available on:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {bestDates.map(date => (
                        <li key={date} style={{ marginBottom: '0.25rem' }}>
                            <strong>{format(parseISO(date), 'EEEE, MMMM do')}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                ({dateStats[date].users.join(', ')})
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AvailabilitySummary;
