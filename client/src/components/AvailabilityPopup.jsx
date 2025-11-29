import React from 'react';
import { format } from 'date-fns';

const AvailabilityPopup = ({ date, availabilities, onClose }) => {
    if (!date) return null;

    // Filter availabilities for this date
    const relevantAvailabilities = availabilities.filter(a =>
        a.selected_slots.some(slot => slot.date === date)
    ).map(a => {
        const slot = a.selected_slots.find(s => s.date === date);
        return {
            name: a.user_name,
            ranges: slot.ranges
        };
    });

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h3>Availability for {format(new Date(date), 'MMMM d, yyyy')}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="popup-body">
                    {relevantAvailabilities.length === 0 ? (
                        <p>No availability marked for this date.</p>
                    ) : (
                        <table className="availability-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Time Slots</th>
                                </tr>
                            </thead>
                            <tbody>
                                {relevantAvailabilities.map((user, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{user.name}</td>
                                        <td>
                                            {user.ranges.length > 0 ? (
                                                <div className="ranges-list">
                                                    {user.ranges.map((range, i) => (
                                                        <span key={i} className="range-badge">
                                                            {range}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted">Full Day</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvailabilityPopup;
