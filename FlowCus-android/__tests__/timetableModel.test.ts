import { TimetableItem } from '../src/redux/slices/timetable';
import { buildTimetableItemDraft, dateOnly, parseDateOnly, splitTimetableItems } from '../src/screens/timetableModel';

describe('timetable date handling', () => {
  const items: TimetableItem[] = [
    { id: 1, timetableId: 2, taskCategoryId: 3, dayOfWeek: 2, startTime: '09:00:00', endTime: '10:00:00', isDeleted: false },
    { id: 2, timetableId: 2, taskCategoryId: 3, dayOfWeek: 2, startTime: '11:00:00', endTime: '12:00:00', specificDate: '2026-10-27T00:00:00', isDeleted: false },
    { id: 3, timetableId: 2, taskCategoryId: 3, dayOfWeek: 4, startTime: '13:00:00', endTime: '14:00:00', specificDate: '2026-10-29', isDeleted: false },
    { id: 4, timetableId: 2, taskCategoryId: 3, dayOfWeek: 2, startTime: '15:00:00', endTime: '16:00:00', specificDate: '2026-10-27', isDeleted: true },
  ];

  it('keeps dated entries in a separate one-off list instead of repeating them by weekday', () => {
    const result = splitTimetableItems(items, 2);

    expect(result.weeklyItems.map(item => item.id)).toEqual([1]);
    expect(result.oneOffItems.map(item => item.id)).toEqual([2, 3]);
  });

  it('round-trips date-only values using local calendar dates', () => {
    const selected = new Date(2026, 9, 27, 12, 0, 0);
    expect(dateOnly(selected)).toBe('2026-10-27');
    expect(dateOnly(parseDateOnly('2026-10-27T00:00:00'))).toBe('2026-10-27');
  });

  it('preserves a one-off date in the create or edit request and derives its weekday', () => {
    const selected = parseDateOnly('2026-10-27');
    const payload = buildTimetableItemDraft({
      timetableId: 2,
      taskCategoryId: 3,
      taskSubtypeId: null,
      weeklyDay: 0,
      startTime: '09:00:00',
      endTime: '10:00:00',
      specificDate: dateOnly(selected),
    });

    expect(payload).toEqual({
      timetableId: 2,
      taskCategoryId: 3,
      taskSubtypeId: null,
      dayOfWeek: 2,
      startTime: '09:00:00',
      endTime: '10:00:00',
      specificDate: '2026-10-27',
    });
  });
});
