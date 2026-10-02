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
