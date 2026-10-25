import { addLocalCalendarDays, localDateKey, localDateTimeToIso, toDateTimeLocalValue } from './local-date-time';

describe('local date/time helpers', () => {
  it('formats a local date key without converting through UTC', () => {
    expect(localDateKey(new Date(2026, 9, 24, 0, 15))).toBe('2026-10-24');
  });

  it('converts datetime-local values as local wall-clock times', () => {
    const input = '2026-10-24T09:30';
    expect(localDateTimeToIso(input)).toBe(new Date(input).toISOString());
  });

  it('formats persisted instants back into the local datetime-local value', () => {
    const instant = new Date(2026, 9, 24, 9, 30);
    expect(toDateTimeLocalValue(instant)).toBe('2026-10-24T09:30');
  });

  it('adds calendar days while preserving local time', () => {
    const start = new Date(2026, 9, 24, 9, 30);
    const result = addLocalCalendarDays(start, 1);
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(25);
    expect(result!.getHours()).toBe(9);
    expect(result!.getMinutes()).toBe(30);
  });
});
