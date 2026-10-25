import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTasks } from '../redux/slices/tasks';
import { FormattedAppUsage, getScreenTime, hasUsageStatsPermission, requestUsagePermission } from '../native/ScreenTimeModule';
import { calculateTaskAnalytics, formatDuration } from './analyticsModel';

const AnalyticsScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector((state: RootState) => state.tasks.list);
  const [screenTimeData, setScreenTimeData] = useState<FormattedAppUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionRequired, setPermissionRequired] = useState(Platform.OS === 'android');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [waitingForSettings, setWaitingForSettings] = useState(false);
  const appState = useRef(AppState.currentState);
  const analytics = useMemo(() => calculateTaskAnalytics(tasks), [tasks]);

  useFocusEffect(useCallback(() => {
    dispatch(fetchTasks());
  }, [dispatch]));

  const refreshScreenTime = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setIsLoading(true);
    setPermissionError(null);
    try {
      const granted = await hasUsageStatsPermission();
      setPermissionRequired(!granted);
      if (!granted) return;
      setScreenTimeData(await getScreenTime());
    } catch (error: unknown) {
      setPermissionError(error instanceof Error ? error.message : 'Could not load app usage.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshScreenTime();
    const subscription = AppState.addEventListener('change', nextState => {
      const wasAway = appState.current.match(/inactive|background/);
      appState.current = nextState;
      if (wasAway && nextState === 'active' && waitingForSettings) {
        setWaitingForSettings(false);
        void refreshScreenTime();
      }
    });
    return () => subscription.remove();
  }, [refreshScreenTime, waitingForSettings]);

  const openUsageSettings = async () => {
    try {
      const granted = await hasUsageStatsPermission();
      if (granted) {
        await refreshScreenTime();
        return;
      }
      setWaitingForSettings(true);
      await requestUsagePermission();
    } catch (error: unknown) {
      setWaitingForSettings(false);
      setPermissionError(error instanceof Error ? error.message : 'Could not open Android usage access settings.');
    }
  };

  const maxFocusMinutes = Math.max(1, ...analytics.weeklyFocus.map(day => day.minutes));
  const stats = [
    { title: 'Focus time (7 days)', value: formatDuration(analytics.completedMinutes), icon: 'clock-outline' },
    { title: 'Average session', value: formatDuration(analytics.averageSessionMinutes), icon: 'timer-outline' },
    { title: 'Task completion (7 days)', value: `${analytics.completionRate}%`, icon: 'check-circle-outline' },
    { title: 'Current streak', value: `${analytics.streakDays} ${analytics.streakDays === 1 ? 'day' : 'days'}`, icon: 'fire' },
  ];

  return (
    <ScrollView style={[tw`flex-1`, { backgroundColor: colors.background }]} contentContainerStyle={tw`p-4 pb-10`}>
      <Text style={[tw`text-2xl font-bold mb-6`, { color: colors.text }]}>Analytics</Text>

      <View style={tw`flex-row flex-wrap justify-between`}>
        {stats.map(stat => (
          <View key={stat.title} style={[tw`w-[48%] p-4 mb-4 rounded-xl`, { backgroundColor: colors.card }]}>
            <Icon name={stat.icon} size={22} color={colors.primary} />
            <Text style={[tw`text-xl font-bold mt-3`, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[tw`text-sm mt-1`, { color: colors.text, opacity: 0.75 }]}>{stat.title}</Text>
          </View>
        ))}
      </View>

      <View style={[tw`mt-1 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-lg font-semibold mb-4`, { color: colors.text }]}>Completed focus time · last 7 days</Text>
        <View style={tw`h-44 flex-row items-end justify-between`} accessibilityRole="image" accessibilityLabel="Completed focus minutes for each of the last seven days">
          {analytics.weeklyFocus.map(day => (
            <View key={day.key} style={tw`flex-1 items-center justify-end h-full mx-0.5`}>
              <Text style={[tw`text-[10px] mb-1`, { color: colors.text, opacity: 0.8 }]}>{day.minutes ? formatDuration(day.minutes) : ''}</Text>
              <View
                style={{
                  width: '62%',
                  minHeight: day.minutes ? 4 : 2,
                  height: `${Math.max(day.minutes ? 5 : 2, (day.minutes / maxFocusMinutes) * 75)}%`,
                  backgroundColor: colors.primary,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
                accessibilityLabel={`${day.label}: ${formatDuration(day.minutes)} of completed focus time`}
              />
              <Text style={[tw`text-xs mt-2`, { color: colors.text, opacity: 0.8 }]}>{day.label}</Text>
            </View>
          ))}
        </View>
        {analytics.completedMinutes === 0 && (
          <Text style={[tw`text-sm mt-3 text-center`, { color: colors.text, opacity: 0.7 }]}>
            Completed tasks with start and end times will appear here.
          </Text>
        )}
      </View>

      {Platform.OS === 'android' && (
        <View style={[tw`mt-5 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
          <View style={tw`flex-row justify-between items-center mb-3`}>
            <Text style={[tw`text-lg font-semibold`, { color: colors.text }]}>Today's app usage</Text>
            <TouchableOpacity onPress={refreshScreenTime} accessibilityRole="button" accessibilityLabel="Refresh app usage" style={tw`p-2`}>
              <Icon name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View style={tw`py-5 items-center`}><ActivityIndicator color={colors.primary} /></View>
          ) : permissionRequired ? (
            <View>
              <Text style={[tw`text-sm mb-3`, { color: colors.text, opacity: 0.8 }]}>Allow Usage Access in Android Settings to see device app usage.</Text>
              <TouchableOpacity onPress={openUsageSettings} style={[tw`py-3 rounded-xl items-center`, { backgroundColor: colors.primary }]} accessibilityRole="button">
                <Text style={tw`text-white font-semibold`}>{waitingForSettings ? 'Waiting for Android Settings…' : 'Open Usage Access Settings'}</Text>
              </TouchableOpacity>
            </View>
          ) : permissionError ? (
            <Text style={[tw`py-3`, { color: colors.notification }]}>{permissionError}</Text>
          ) : screenTimeData.length === 0 ? (
            <Text style={[tw`text-center py-4`, { color: colors.text, opacity: 0.7 }]}>No app usage recorded today.</Text>
          ) : (
            screenTimeData.map(app => (
              <View key={app.packageName} style={[tw`flex-row items-center mb-3 p-3 rounded-lg`, { backgroundColor: colors.background }]}>
                {app.icon ? <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={tw`w-10 h-10 rounded-lg mr-3`} /> : <Icon name="application-outline" size={32} color={colors.primary} style={tw`mr-3`} />}
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-base`, { color: colors.text }]}>{app.appName}</Text>
                  <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.75 }]}>Last used: {app.lastUsed}</Text>
                </View>
                <Text style={[tw`font-semibold`, { color: colors.primary }]}>{app.screenTime}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default AnalyticsScreen;
