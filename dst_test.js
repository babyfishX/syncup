const { zonedTimeToUtc, format: formatTz } = require('date-fns-tz');

const timeZone = 'America/New_York';
const london = 'Europe/London';

// Date in Summer (DST active in both usually)
const summerDate = '2024-07-01T12:00:00';
const summerUtc = zonedTimeToUtc(summerDate, london);
const summerNy = formatTz(summerUtc, 'yyyy-MM-dd HH:mm zzz', { timeZone });

// Date in Winter (DST inactive)
const winterDate = '2024-01-01T12:00:00';
const winterUtc = zonedTimeToUtc(winterDate, london);
const winterNy = formatTz(winterUtc, 'yyyy-MM-dd HH:mm zzz', { timeZone });

console.log(`London ${summerDate} -> NY: ${summerNy}`);
console.log(`London ${winterDate} -> NY: ${winterNy}`);
