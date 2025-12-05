/**
 * Calendar utilities for generating calendar invites in various formats
 * All times are expected to be in Eastern Time (America/New_York)
 */

/**
 * Format a date for iCal format (YYYYMMDDTHHMMSS)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format (24-hour)
 * @returns {string} - Formatted datetime string for iCal
 */
const formatICalDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    return `${year}${month}${day}T${hours}${minutes}00`;
};

/**
 * Format current datetime for iCal DTSTAMP
 * @returns {string} - Current datetime in UTC for iCal format
 */
const getICalTimestamp = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Generate a unique ID for calendar events
 * @returns {string} - Unique identifier
 */
const generateEventId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@syncup.app`;
};

/**
 * Escape special characters for iCal format
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
const escapeICalText = (text) => {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
};

/**
 * Generate an iCal (.ics) file content
 * @param {Object} params - Event parameters
 * @param {string} params.title - Event title
 * @param {string} params.description - Event description
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {string} params.startTime - Start time in HH:MM format (24-hour)
 * @param {string} params.endTime - End time in HH:MM format (24-hour)
 * @param {string[]} params.attendees - Array of attendee names
 * @returns {string} - iCal file content
 */
export const generateICalFile = ({ title, description, date, startTime, endTime, attendees = [] }) => {
    const dtStart = formatICalDateTime(date, startTime);
    const dtEnd = formatICalDateTime(date, endTime);
    const dtStamp = getICalTimestamp();
    const uid = generateEventId();

    // Build description with proper newlines
    let descriptionParts = [];
    if (description) {
        descriptionParts.push(description);
    }
    if (attendees.length > 0) {
        descriptionParts.push('');
        descriptionParts.push(`Available participants: ${attendees.join(', ')}`);
    }
    descriptionParts.push('');
    descriptionParts.push('Created with SyncUp');

    const fullDescription = escapeICalText(descriptionParts.join('\n'));

    const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SyncUp//Calendar Event//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VTIMEZONE',
        'TZID:America/New_York',
        'BEGIN:DAYLIGHT',
        'TZOFFSETFROM:-0500',
        'TZOFFSETTO:-0400',
        'TZNAME:EDT',
        'DTSTART:19700308T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
        'END:DAYLIGHT',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:-0400',
        'TZOFFSETTO:-0500',
        'TZNAME:EST',
        'DTSTART:19701101T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
        'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;TZID=America/New_York:${dtStart}`,
        `DTEND;TZID=America/New_York:${dtEnd}`,
        `SUMMARY:${escapeICalText(title)}`,
        `DESCRIPTION:${fullDescription}`,
        'STATUS:TENTATIVE',
        'SEQUENCE:0',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    return icalContent;
};

/**
 * Download an iCal file
 * @param {string} icalContent - iCal file content
 * @param {string} filename - Filename for download
 */
export const downloadICalFile = (icalContent, filename = 'event.ics') => {
    // Use data URI for more reliable downloads
    const encodedUri = encodeURIComponent(icalContent);
    const dataUri = `data:text/calendar;charset=utf-8,${encodedUri}`;

    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Format datetime for URL encoding (Google, Yahoo, Outlook)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:MM format
 * @returns {string} - Formatted datetime for URLs
 */
const formatUrlDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    return `${year}${month}${day}T${hours}${minutes}00`;
};

/**
 * Generate Google Calendar URL
 * @param {Object} params - Event parameters (same as generateICalFile)
 * @returns {string} - Google Calendar URL
 */
export const generateGoogleCalendarUrl = ({ title, description, date, startTime, endTime, attendees = [] }) => {
    const startDateTime = formatUrlDateTime(date, startTime);
    const endDateTime = formatUrlDateTime(date, endTime);

    const attendeeList = attendees.length > 0
        ? `\n\nAvailable participants: ${attendees.join(', ')}`
        : '';

    const fullDescription = `${description || ''}${attendeeList}\n\nCreated with SyncUp`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        details: fullDescription,
        dates: `${startDateTime}/${endDateTime}`,
        ctz: 'America/New_York'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Yahoo Calendar URL
 * @param {Object} params - Event parameters (same as generateICalFile)
 * @returns {string} - Yahoo Calendar URL
 */
export const generateYahooCalendarUrl = ({ title, description, date, startTime, endTime, attendees = [] }) => {
    const startDateTime = formatUrlDateTime(date, startTime);
    const endDateTime = formatUrlDateTime(date, endTime);

    const attendeeList = attendees.length > 0
        ? `\n\nAvailable participants: ${attendees.join(', ')}`
        : '';

    const fullDescription = `${description || ''}${attendeeList}\n\nCreated with SyncUp`;

    const params = new URLSearchParams({
        v: '60',
        title: title,
        desc: fullDescription,
        st: startDateTime,
        et: endDateTime,
        in_loc: ''
    });

    return `https://calendar.yahoo.com/?${params.toString()}`;
};

/**
 * Generate Outlook Calendar URL
 * @param {Object} params - Event parameters (same as generateICalFile)
 * @returns {string} - Outlook Calendar URL
 */
export const generateOutlookCalendarUrl = ({ title, description, date, startTime, endTime, attendees = [] }) => {
    const startDateTime = formatUrlDateTime(date, startTime);
    const endDateTime = formatUrlDateTime(date, endTime);

    const attendeeList = attendees.length > 0
        ? `\n\nAvailable participants: ${attendees.join(', ')}`
        : '';

    const fullDescription = `${description || ''}${attendeeList}\n\nCreated with SyncUp`;

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: title,
        body: fullDescription,
        startdt: startDateTime,
        enddt: endDateTime,
        allday: 'false'
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
