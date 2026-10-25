import { NativeModules, Platform } from 'react-native';

const { AlarmModule } = NativeModules;

export interface TimetableReminder {
  id: number;
  title: string;
  message: string;
  dayOfWeek: number;
  startTime: string;
  specificDate?: string | null;
  reminderMinutes?: number;
}

export async function reconcileBlockReminders(reminders: TimetableReminder[]): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (!AlarmModule) throw new Error('Timetable reminders are unavailable on this device.');
  return await AlarmModule.reconcileBlockAlarms(reminders.map(reminder => ({
    ...reminder,
    reminderMinutes: reminder.reminderMinutes ?? 5,
  })));
}

export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !AlarmModule) return true;
  return await AlarmModule.canScheduleExactAlarms();
}

export async function openExactAlarmSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !AlarmModule) return false;
  return await AlarmModule.openExactAlarmSettings();
}
