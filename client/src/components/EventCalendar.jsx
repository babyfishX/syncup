import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { getUserColorByName } from '../utils/colors';

const EventCalendar = ({
    selectedDates = [], // Array of date strings OR objects { date, ranges }
    onDateSelect,
    mode = 'input', // 'input' or 'view'
    availabilities = [],
    allowedDates = [] // Optional: Array of allowed date strings
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    // Helper to check if a date is selected (handling both simple strings and objects)
    const isSelected = (date) => {
        return selectedDates.some(d => {
            const dStr = typeof d === 'string' ? d : d.date;
            return isSameDay(new Date(dStr), date);
        });
    };

    const getDayAvailability = (date) => {
        if (mode !== 'view') return [];
        return availabilities.filter(a => {
            // a.selected_slots is now expected to be an array of objects { date, ranges }
            // But for backward compatibility or simple mode, check if it's strings
            return a.selected_slots.some(slot => {
                const slotDate = typeof slot === 'string' ? slot : slot.date;
                return isSameDay(new Date(slotDate), date);
            });
        });
    };

    const isAllowed = (date) => {
        if (!allowedDates || allowedDates.length === 0) return true;
        return allowedDates.some(d => isSameDay(new Date(d), date));
    };

    return (
        <div className="calendar-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button type="button" onClick={handlePrevMonth}>&lt;</button>
                <h3 style={{ margin: 0 }}>{format(currentMonth, 'MMMM yyyy')}</h3>
                <button type="button" onClick={handleNextMonth}>&gt;</button>
            </div>

            <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {day}
                    </div>
                ))}

                {/* Padding for start of month */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} />
                ))}

                {daysInMonth.map(date => {
                    const isPast = isBefore(date, startOfDay(new Date()));
                    const selected = isSelected(date);
                    const allowed = isAllowed(date);
                    const dayAvailabilities = getDayAvailability(date);

                    let className = 'calendar-day';
                    if (mode === 'input') {
                        if (selected) className += ' selected';
                        if (isPast || !allowed) className += ' disabled';
                    }

                    // Find my selection for this date (for input mode)
                    const mySelection = selectedDates.find(d => {
                        const dStr = typeof d === 'string' ? d : d.date;
                        return isSameDay(new Date(dStr), date);
                    });

                    return (
                        <div
                            key={date.toString()}
                            className={className}
                            onClick={() => {
                                if (mode === 'input' && !isPast && allowed && onDateSelect) {
                                    onDateSelect(date);
                                }
                            }}
                            style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <span style={{ position: 'relative', zIndex: 2 }}>{format(date, 'd')}</span>

                            {/* Show selected times in input mode */}
                            {mode === 'input' && mySelection && mySelection.ranges && (
                                <div style={{ fontSize: '0.6rem', lineHeight: '1', marginTop: '2px', textAlign: 'center' }}>
                                    {mySelection.ranges.length > 2 ? `${mySelection.ranges.length} slots` : mySelection.ranges.map((r, i) => (
                                        <div key={i}>{r}</div>
                                    ))}
                                </div>
                            )}

                            {/* Color coded dots for view mode */}
                            {mode === 'view' && dayAvailabilities.length > 0 && (
                                <div style={{
                                    position: 'absolute', bottom: 2, left: 0, right: 0,
                                    display: 'flex', justifyContent: 'center', gap: '2px', flexWrap: 'wrap', padding: '0 2px'
                                }}>
                                    {dayAvailabilities.map((a, i) => (
                                        <div key={i} style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            backgroundColor: getUserColorByName(a.user_name)
                                        }} title={a.user_name} />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EventCalendar;
