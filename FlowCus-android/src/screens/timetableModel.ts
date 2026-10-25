import { TimetableItem } from '../redux/slices/timetable';

export interface TimetableItemDraft {
  timetableId: number;
  taskCategoryId: number;
  taskSubtypeId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  specificDate: string | null;
}

export function splitTimetableItems(items: TimetableItem[], selectedDay: number) {
  return {
    weeklyItems: items.filter(item => !item.isDeleted && !item.specificDate && item.dayOfWeek === selectedDay),
    oneOffItems: items
      .filter(item => !item.isDeleted && Boolean(item.specificDate))
      .sort((a, b) => `${a.specificDate}|${a.startTime}`.localeCompare(`${b.specificDate}|${b.startTime}`)),
  };
}

export function dateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a date-only API value at local noon to avoid UTC date rollover. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function buildTimetableItemDraft(input: Omit<TimetableItemDraft, 'dayOfWeek'> & { weeklyDay: number }) {
  const specificDate = input.specificDate ? input.specificDate.slice(0, 10) : null;
  return {
    timetableId: input.timetableId,
    taskCategoryId: input.taskCategoryId,
    taskSubtypeId: input.taskSubtypeId,
    dayOfWeek: specificDate ? parseDateOnly(specificDate).getDay() : input.weeklyDay,
    startTime: input.startTime,
    endTime: input.endTime,
    specificDate,
  } satisfies TimetableItemDraft;
}

