// Kiosk-Server returns DATETIME columns as 'YYYY-MM-DD HH:mm:ss' strings without a time zone
// (mysql2 dateStrings). They are parsed by hand as local time, because new Date('YYYY-MM-DD HH:mm:ss')
// is not parsed the same way by every browser.

const pad = (value) => String(value).padStart(2, '0');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD HH:mm:ss' -> Date (local time), or null for any other value.
export function parseDbDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

// Date -> 'YYYY-MM-DD'
export function toDbDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// For the <time dateTime> attribute: 'YYYY-MM-DD HH:mm:ss' -> 'YYYY-MM-DDTHH:mm:ss'
export const toDateTimeAttr = (value) => (value ?? '').replace(' ', 'T');

// '2026-11-17 19:05:00' -> '19:05'
export function formatClock(value) {
  const date = parseDbDateTime(value);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '-';
}

// Same day as `now` -> '19:05'; another day -> '11월 16일 19:05'
export function formatOrderTime(value, now = new Date()) {
  const date = parseDbDateTime(value);
  if (!date) return '-';
  const clock = formatClock(value);
  return toDbDate(date) === toDbDate(now) ? clock : `${date.getMonth() + 1}월 ${date.getDate()}일 ${clock}`;
}

// '2026-11-17 19:05:00' -> '11월 17일 (화) 19:05'
export function formatDateTime(value) {
  const date = parseDbDateTime(value);
  return date ? `${formatDayLabel(toDbDate(date))} ${formatClock(value)}` : '-';
}

// Time since the value: '방금', '12분 전', '1시간 5분 전'
export function formatElapsed(value, now = new Date()) {
  const date = parseDbDateTime(value);
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((now - date) / 60000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours}시간 전` : `${hours}시간 ${minutes % 60}분 전`;
}

// '2026-11-17' -> '11월 17일 (화)'
export function formatDayLabel(value) {
  const date = parseDbDateTime(`${value} 00:00:00`);
  if (!date) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}
