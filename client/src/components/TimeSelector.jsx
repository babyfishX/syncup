import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const TimeSelector = ({ date, initialRanges = [], onSave, onCancel }) => {
    // Convert initial ranges to editable slots
    const [slots, setSlots] = useState(() => {
        if (initialRanges.length > 0) {
            return initialRanges.map((range, idx) => {
                const [start, end] = range.split('-');
                return { id: idx, start, end };
            });
        }
        return [{ id: 0, start: '', end: '' }];
    });

    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

    const timezones = [
        { value: 'America/New_York', label: 'Eastern Time (ET)' },
        { value: 'America/Chicago', label: 'Central Time (CT)' },
        { value: 'America/Denver', label: 'Mountain Time (MT)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Kolkata', label: 'India (IST)' },
        { value: 'Asia/Shanghai', label: 'China (CST)' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Seoul', label: 'Seoul (KST)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    ];

    const mergeRanges = (rangesToMerge) => {
        if (rangesToMerge.length === 0) return [];

        const toMinutes = (time) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const fromMinutes = (mins) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
        };

        const sortedIntervals = rangesToMerge.map(r => {
            const [s, e] = r.split('-');
            return { start: toMinutes(s), end: toMinutes(e) };
        }).sort((a, b) => a.start - b.start);

        const merged = [];
        let current = sortedIntervals[0];

        for (let i = 1; i < sortedIntervals.length; i++) {
            const next = sortedIntervals[i];
            if (current.end >= next.start) {
                current.end = Math.max(current.end, next.end);
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);

        return merged.map(i => `${fromMinutes(i.start)}-${fromMinutes(i.end)}`);
    };

    const handleSave = () => {
        // Filter out empty slots and convert to ranges
        const validRanges = slots
            .filter(slot => slot.start && slot.end && slot.start < slot.end)
            .map(slot => `${slot.start}-${slot.end}`);

        const merged = mergeRanges(validRanges);
        onSave(merged, timezone);
        onCancel();
    };

    const updateSlot = (id, field, value) => {
        const updatedSlots = slots.map(slot =>
            slot.id === id ? { ...slot, [field]: value } : slot
        );
        setSlots(updatedSlots);
    };

    const addSlot = () => {
        const newId = Math.max(...slots.map(s => s.id), 0) + 1;
        const updatedSlots = [...slots, { id: newId, start: '', end: '' }];
        setSlots(updatedSlots);
    };

    const deleteSlot = (id) => {
        const updatedSlots = slots.filter(slot => slot.id !== id);
        // Ensure at least one empty slot remains
        if (updatedSlots.length === 0) {
            updatedSlots.push({ id: 0, start: '', end: '' });
        }
        setSlots(updatedSlots);
    };

    // Ensure there's always an empty slot at the end, but only add one when all slots are complete
    useEffect(() => {
        const allSlotsComplete = slots.every(slot => slot.start && slot.end);
        const hasEmptySlot = slots.some(slot => !slot.start && !slot.end);

        if (allSlotsComplete && !hasEmptySlot) {
            const newId = Math.max(...slots.map(s => s.id), 0) + 1;
            setSlots([...slots, { id: newId, start: '', end: '' }]);
        }
    }, [slots]);

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: 0, marginBottom: '1rem' }}>Availability for {date.toLocaleDateString()}</h3>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Timezone</label>
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    >
                        {timezones.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                        {!timezones.some(tz => tz.value === timezone) && (
                            <option value={timezone}>{timezone} (Detected)</option>
                        )}
                    </select>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Add your available time slots in your selected timezone.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {slots.map((slot, index) => {
                        const isEmpty = !slot.start && !slot.end;
                        const isOnlySlot = slots.length === 1;

                        return (
                            <div key={slot.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: isEmpty ? 'transparent' : 'var(--color-surface)',
                                borderRadius: '4px',
                                border: isEmpty ? '1px dashed var(--color-border)' : '1px solid var(--color-border)'
                            }}>
                                <button
                                    type="button"
                                    onClick={addSlot}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--color-primary)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        flexShrink: 0
                                    }}
                                >
                                    +
                                </button>

                                <input
                                    type="text"
                                    value={slot.start}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/[^0-9:]/g, '');
                                        // Auto-format as user types
                                        if (value.length === 2 && !value.includes(':')) {
                                            value = value + ':';
                                        }
                                        // Limit to HH:MM format
                                        if (value.length > 5) value = value.substring(0, 5);
                                        updateSlot(slot.id, 'start', value);
                                    }}
                                    onBlur={(e) => {
                                        // Validate and format on blur
                                        const value = e.target.value;
                                        if (value && value.match(/^\d{1,2}:\d{2}$/)) {
                                            const [h, m] = value.split(':');
                                            const hour = parseInt(h);
                                            const min = parseInt(m);
                                            if (hour >= 0 && hour < 24 && min >= 0 && min < 60) {
                                                const formatted = `${hour.toString().padStart(2, '0')}:${m}`;
                                                updateSlot(slot.id, 'start', formatted);
                                            }
                                        }
                                    }}
                                    placeholder="HH:MM"
                                    pattern="[0-2][0-9]:[0-5][0-9]"
                                    style={{
                                        flex: 1,
                                        marginBottom: 0,
                                        fontSize: '0.9rem'
                                    }}
                                />

                                <span style={{ color: 'var(--color-text-muted)' }}>to</span>

                                <input
                                    type="text"
                                    value={slot.end}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/[^0-9:]/g, '');
                                        // Auto-format as user types
                                        if (value.length === 2 && !value.includes(':')) {
                                            value = value + ':';
                                        }
                                        // Limit to HH:MM format
                                        if (value.length > 5) value = value.substring(0, 5);
                                        updateSlot(slot.id, 'end', value);
                                    }}
                                    onBlur={(e) => {
                                        // Validate and format on blur
                                        const value = e.target.value;
                                        if (value && value.match(/^\d{1,2}:\d{2}$/)) {
                                            const [h, m] = value.split(':');
                                            const hour = parseInt(h);
                                            const min = parseInt(m);
                                            if (hour >= 0 && hour < 24 && min >= 0 && min < 60) {
                                                const formatted = `${hour.toString().padStart(2, '0')}:${m}`;
                                                updateSlot(slot.id, 'end', formatted);
                                            }
                                        }
                                    }}
                                    placeholder="HH:MM"
                                    pattern="[0-2][0-9]:[0-5][0-9]"
                                    style={{
                                        flex: 1,
                                        marginBottom: 0,
                                        fontSize: '0.9rem'
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() => deleteSlot(slot.id)}
                                    disabled={isOnlySlot && isEmpty}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        color: isOnlySlot && isEmpty ? 'var(--color-text-muted)' : 'var(--color-danger)',
                                        cursor: isOnlySlot && isEmpty ? 'not-allowed' : 'pointer',
                                        fontSize: '1.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        flexShrink: 0,
                                        opacity: isOnlySlot && isEmpty ? 0.3 : 1
                                    }}
                                    title="Delete slot"
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                    Adjacent time slots will be automatically merged.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button onClick={handleSave} className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimeSelector;
