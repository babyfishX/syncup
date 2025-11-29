import React, { useState } from 'react';

const TimeSelector = ({ date, initialRanges = [], onSave, onCancel }) => {
    // ranges: array of strings "HH:MM-HH:MM"
    const [ranges, setRanges] = useState(initialRanges.length > 0 ? initialRanges : []);
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('17:00');

    const addRange = () => {
        if (start >= end) {
            alert('Start time must be before end time');
            return;
        }
        const newRange = `${start}-${end}`;
        if (!ranges.includes(newRange)) {
            setRanges([...ranges, newRange].sort());
        }
    };

    const removeRange = (rangeToRemove) => {
        setRanges(ranges.filter(r => r !== rangeToRemove));
    };

    const handleSave = () => {
        onSave(ranges);
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', margin: 0 }}>
                <h3>Availability for {date.toLocaleDateString()}</h3>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ marginBottom: 0 }} />
                        <span>to</span>
                        <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ marginBottom: 0 }} />
                        <button onClick={addRange} className="btn-primary" style={{ padding: '0.5rem' }}>+</button>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                    {ranges.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No times added (Not available)</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {ranges.map(range => (
                                <span key={range} style={{
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    {range}
                                    <button onClick={() => removeRange(range)} style={{
                                        border: 'none', background: 'none', padding: 0, color: 'var(--color-danger)', cursor: 'pointer'
                                    }}>×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} style={{ background: 'transparent' }}>Cancel</button>
                    <button onClick={handleSave} className="btn-primary">Save</button>
                </div>
            </div>
        </div>
    );
};

export default TimeSelector;
