import { NativeModules, Platform } from 'react-native';

const { AlarmModule } = NativeModules;

export interface TimetableReminderOptions {
  id: number;
  title: string;
  message: string;
  triggerAtMillis: number;
}

/**
 * Schedule an exact, device-local alarm notification before a timetable block begins.
 * Zero push servers or external APIs required.
 */
export async function scheduleBlockReminder(options: TimetableReminderOptions): Promise<boolean> {
  if (Platform.OS !== 'android' || !AlarmModule) {
    return false;
  }
  try {
    return await AlarmModule.scheduleBlockAlarm(
      options.id,
      options.title,
      options.message,
      options.triggerAtMillis
    );
  } catch (error) {
    console.error('Failed to schedule block alarm:', error);
    return false;
  }
}

/**
 * Cancel a previously scheduled timetable block alarm.
 */
export async function cancelBlockReminder(blockId: number): Promise<boolean> {
  if (Platform.OS !== 'android' || !AlarmModule) {
    return false;
  }
  try {
    return await AlarmModule.cancelBlockAlarm(blockId);
  } catch (error) {
    console.error('Failed to cancel block alarm:', error);
    return false;
  }
}

/**
 * Verify whether the app can schedule exact alarms on Android 12+ (API 31+).
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !AlarmModule) {
    return true;
  }
  try {
    return await AlarmModule.canScheduleExactAlarms();
  } catch {
    return false;
  }
}

/**
 * Calculate the next trigger timestamp (ms) for a weekly timetable block
 * triggering reminderMinutes before the block starts.
 */
export function calculateNextTriggerMillis(dayOfWeek: number, startTimeStr: string, reminderMinutes: number = 5): number {
  const now = new Date();
  const parts = startTimeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  target.setMinutes(target.getMinutes() - reminderMinutes);

  const currentDay = now.getDay();
  let dayOffset = dayOfWeek - currentDay;
  if (dayOffset < 0 || (dayOffset === 0 && target.getTime() <= now.getTime())) {
    dayOffset += 7;
  }
  target.setDate(now.getDate() + dayOffset);
  return target.getTime();
}
