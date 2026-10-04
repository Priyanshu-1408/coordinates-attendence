const INDIA_TIME_ZONE = 'Asia/Kolkata';

export function indiaDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function indiaClockMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function attendanceStatus(date) {
  return indiaClockMinutes(date) >= 11 * 60 ? 'Late' : 'Present';
}

export function indiaTimeLabel(date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date) + ' IST';
}
