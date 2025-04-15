import { NativeModules } from 'react-native';

type AppScreenTime = {
  appName: string;
  screenTime: string;
};

const { ScreenTimeModule } = NativeModules;

export async function getScreenTime(): Promise<AppScreenTime[]> {
  const result: AppScreenTime[] = await ScreenTimeModule.getScreenTime();
  return result;
}
