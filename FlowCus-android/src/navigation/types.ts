import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type BottomTabParamList = {
  Home: undefined;
  About: undefined;
  Contact: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  Tasks: undefined;
  FocusSession: { taskName?: string; taskCategoryId?: number } | undefined;
};

export type DrawerParamList = {
  Dashboard: NavigatorScreenParams<MainStackParamList> | undefined;
  Timetable: undefined;
  Subtypes: undefined;
  Analytics: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainApp: NavigatorScreenParams<DrawerParamList> | undefined;
  Login: undefined;
};

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Home'>,
  CompositeScreenProps<NativeStackScreenProps<MainStackParamList>, DrawerScreenProps<DrawerParamList>>
>;
export type AboutScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'About'>,
  CompositeScreenProps<NativeStackScreenProps<MainStackParamList>, DrawerScreenProps<DrawerParamList>>
>;
export type ContactScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Contact'>,
  CompositeScreenProps<NativeStackScreenProps<MainStackParamList>, DrawerScreenProps<DrawerParamList>>
>;
export type TasksScreenProps = NativeStackScreenProps<MainStackParamList, 'Tasks'>;
export type FocusSessionScreenProps = NativeStackScreenProps<MainStackParamList, 'FocusSession'>;
export type TimetableScreenProps = DrawerScreenProps<DrawerParamList, 'Timetable'>;
export type SubtypesScreenProps = DrawerScreenProps<DrawerParamList, 'Subtypes'>;
export type ProfileScreenProps = DrawerScreenProps<DrawerParamList, 'Profile'>;
export type SettingsScreenProps = DrawerScreenProps<DrawerParamList, 'Settings'>;
