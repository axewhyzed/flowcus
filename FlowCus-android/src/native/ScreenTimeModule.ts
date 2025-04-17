import { NativeModules } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
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
  lastUsed: string; // Formatted as "HH:MM" or "Yesterday"
  usageSeconds: number;
};

const { ScreenTime } = NativeModules;

export async function requestUsagePermission(): Promise<string> {
  return await ScreenTime.requestUsagePermission();
}

export async function getScreenTime(day: 'today' | 'yesterday' = 'today'): Promise<FormattedAppUsage[]> {
  try {
    const timezone = await getDeviceTimezone();
    const rawData: AppUsageData[] = await ScreenTime.getScreenTime(day, timezone);

    return rawData.map((item: AppUsageData) => ({
      packageName: item.packageName,
      appName: item.appName,
      icon: item.icon,
      screenTime: formatTime(item.usageTime),
      lastUsed: formatLastUsed(item.lastUsed, timezone),
      usageSeconds: item.usageTime
    }));
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
  const zonedDate = toZonedTime(new Date(timestamp), timezone);

  if (isToday(zonedDate)) {
    return format(zonedDate, 'hh:mm a'); // e.g., "09:12 PM"
  }

  if (isYesterday(zonedDate)) {
    return 'Yesterday';
  }

  return format(zonedDate, 'dd MMM yyyy'); // fallback
}

export async function getDeviceTimezone(): Promise<string> {
  try {
    return await ScreenTime.getDeviceTimezone();
  } catch (error) {
    console.error("Error fetching timezone:", error);
    return Intl.DateTimeFormat().resolvedOptions().timeZone; // fallback
  }
}
