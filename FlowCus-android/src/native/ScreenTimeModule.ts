import { NativeModules, Platform } from 'react-native';
import { format, isToday } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

type AppUsageData = {
  packageName: string;
  appName: string;
  icon: string; // Base64 encoded PNG
  usageTime: number; // in seconds
  lastUsed: number; // timestamp
};

export type FormattedAppUsage = {
  packageName: string;
  appName: string;
  icon: string;
  screenTime: string; // Formatted as "Xh Ym"
  lastUsed: string; // Formatted as "HH:MM"
  usageSeconds: number;
};

const { ScreenTime } = NativeModules;

export async function requestUsagePermission(): Promise<string> {
  if (Platform.OS !== 'android' || !ScreenTime) {
    return 'Permission not applicable';
  }
  return await ScreenTime.requestUsagePermission();
}

export async function getScreenTime(): Promise<FormattedAppUsage[]> {
  if (Platform.OS !== 'android' || !ScreenTime) {
    return [];
  }

  try {
    const timezone = await getDeviceTimezone();
    const rawData: AppUsageData[] = await ScreenTime.getScreenTime();

    if (!Array.isArray(rawData)) return [];

    return rawData.map((item: AppUsageData) => ({
      packageName: item.packageName,
      appName: item.appName,
      icon: item.icon,
      screenTime: formatTime(item.usageTime),
      lastUsed: formatLastUsed(item.lastUsed, timezone),
      usageSeconds: item.usageTime
    }))
    .filter((entry): entry is FormattedAppUsage => entry.lastUsed !== '');
  } catch (error) {
    console.error('Error getting screen time:', error);
    return [];
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatLastUsed(timestamp: number, timezone: string): string {
  try {
    const zonedDate = toZonedTime(new Date(timestamp), timezone);

    if (isToday(zonedDate)) {
      return format(zonedDate, 'hh:mm a');
    }
    return '';
  } catch {
    return '';
  }
}

export async function getDeviceTimezone(): Promise<string> {
  if (Platform.OS !== 'android' || !ScreenTime) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  try {
    return await ScreenTime.getDeviceTimezone();
  } catch (error) {
    console.error("Error fetching timezone:", error);
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
