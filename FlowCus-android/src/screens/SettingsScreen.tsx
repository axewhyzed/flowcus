// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, useColorScheme } from 'react-native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { logout } from '../redux/slices/auth';
import { useTheme } from '@react-navigation/native';
import { API_BASE_URL } from '@env';
import { usePreferences } from '../components/PreferencesProvider';
import { ensureNotificationPermission } from '../services/notificationPermissions';
import { SettingsScreenProps } from '../navigation/types';

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { preferences, updatePreferences } = usePreferences();
  const darkModeEnabled = preferences.theme === 'dark' || (preferences.theme === 'system' && systemColorScheme === 'dark');

  const setNotifications = async (enabled: boolean) => {
    if (enabled) {
      try {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          Alert.alert('Notifications are off', 'Allow notifications in Android Settings to receive timetable reminders.');
          return;
        }
      } catch {
        Alert.alert('Permission unavailable', 'FlowCus could not request notification permission. You can enable it in Android Settings.');
        return;
      }
    }
    try {
      await updatePreferences({ notificationsEnabled: enabled });
    } catch (error: unknown) {
      Alert.alert('Settings not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const setHaptics = async (enabled: boolean) => {
    try {
      await updatePreferences({ hapticsEnabled: enabled });
    } catch (error: unknown) {
      Alert.alert('Settings not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const setDarkMode = async (enabled: boolean) => {
    try {
      await updatePreferences({ theme: enabled ? 'dark' : 'light' });
    } catch (error: unknown) {
      Alert.alert('Settings not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of FlowCus?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => dispatch(logout()) }
      ]
    );
  };

  return (
    <ScrollView style={[tw`flex-1 p-4`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-6 pt-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mr-3`}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Account Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-3`, { color: colors.text, opacity: 0.65 }]}>Account</Text>
        <View style={[tw`flex-row items-center justify-between py-2 border-b`, { borderColor: colors.border }]}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Username</Text>
          <Text style={[tw`text-base font-medium`, { color: colors.text, opacity: 0.75 }]}>@{user?.username}</Text>
        </View>
        <View style={[tw`flex-row items-center justify-between py-2 border-b`, { borderColor: colors.border }]}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Display Name</Text>
          <Text style={[tw`text-base font-medium`, { color: colors.text, opacity: 0.75 }]}>{user?.name || "Not set"}</Text>
        </View>
        <View style={tw`flex-row items-center justify-between py-2`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Role</Text>
          <Text style={tw`text-base text-blue-600 font-bold`}>{user?.isAdmin ? "Admin" : "Standard"}</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-3`, { color: colors.text, opacity: 0.65 }]}>Preferences</Text>
        
        <View style={tw`flex-row items-center justify-between py-2 border-b border-gray-100`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="bell-outline" size={22} color={colors.primary} style={tw`mr-3`} />
            <Text style={[tw`text-base`, { color: colors.text }]}>Session Alerts</Text>
          </View>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={setNotifications}
            thumbColor={preferences.notificationsEnabled ? colors.primary : '#f4f3f4'}
            accessibilityLabel="Timetable notifications"
            accessibilityHint="Controls reminders before scheduled focus blocks"
          />
        </View>

        <View style={tw`flex-row items-center justify-between py-2`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="vibrate" size={22} color={colors.primary} style={tw`mr-3`} />
            <Text style={[tw`text-base`, { color: colors.text }]}>Haptic Feedback</Text>
          </View>
          <Switch
            value={preferences.hapticsEnabled}
            onValueChange={setHaptics}
            thumbColor={preferences.hapticsEnabled ? colors.primary : '#f4f3f4'}
            accessibilityLabel="Haptic feedback"
          />
        </View>

        <View style={tw`flex-row items-center justify-between py-2 mt-2`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="theme-light-dark" size={22} color={colors.primary} style={tw`mr-3`} />
            <Text style={[tw`text-base`, { color: colors.text }]}>Dark mode</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkMode}
            thumbColor={darkModeEnabled ? colors.primary : '#f4f3f4'}
            accessibilityLabel="Dark mode"
          />
        </View>
      </View>

      {/* Connection Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-xs font-bold uppercase tracking-wider mb-3`, { color: colors.text, opacity: 0.65 }]}>Connection</Text>
        <View style={tw`flex-row items-center justify-between py-2`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Backend Server</Text>
          <Text style={[tw`text-xs font-mono`, { color: colors.text, opacity: 0.75 }]} numberOfLines={1}>{API_BASE_URL || (__DEV__ ? 'http://10.0.2.2:7176/api' : 'API_BASE_URL not configured')}</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[tw`flex-row items-center justify-center p-4 rounded-xl mt-4 border`, { backgroundColor: colors.card, borderColor: '#ef4444' }]}
        accessibilityRole="button"
        accessibilityLabel="Log out of FlowCus"
      >
        <Icon name="logout" size={22} color="#ef4444" style={tw`mr-2`} />
        <Text style={tw`text-base font-bold text-red-600`}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
