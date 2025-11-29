import React from 'react';
import { format } from 'date-fns';
import { getUserColorByName } from '../utils/colors';

const DayView = ({ date, availabilities, onClose }) => {
    // Filter availabilities for this date
    const dayAvailabilities = availabilities.filter(a =>
        a.selected_slots.some(slot => {
            const slotDate = typeof slot === 'string' ? slot : slot.date;
            return slotDate.startsWith(date.toISOString().split('T')[0]);
        })
    ).map(a => {
        const slot = a.selected_slots.find(s => {
            const slotDate = typeof s === 'string' ? s : s.date;
            return slotDate.startsWith(date.toISOString().split('T')[0]);
        });
        return {
            user_name: a.user_name,
            ranges: typeof slot === 'string' ? ['All Day'] : (slot.ranges || ['All Day'])
        };
    });

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', margin: 0, maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>{format(date, 'EEEE, MMMM do')}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {dayAvailabilities.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>No one is available on this day.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {dayAvailabilities.map((a, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-bg)'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    backgroundColor: getUserColorByName(a.user_name),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
                                }}>
                                    {a.user_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{a.user_name}</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                        {a.ranges.map((range, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '0.8rem', padding: '0.1rem 0.4rem',
                                                borderRadius: '4px', border: '1px solid var(--color-border)',
                                                color: 'var(--color-text-muted)'
                                            }}>
                                                {range}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DayView;
