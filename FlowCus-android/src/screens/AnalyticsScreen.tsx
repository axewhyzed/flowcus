import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeModules } from 'react-native';

const { ScreenTime } = NativeModules;

const AnalyticsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [screenTimeData, setScreenTimeData] = useState<{ [key: string]: number }>({});

  const stats = [
    { title: 'Total Focus Time', value: '28h 45m', icon: 'clock', trend: 'up' },
    { title: 'Avg Session', value: '52m', icon: 'timer', trend: 'neutral' },
    { title: 'Task Completion', value: '78%', icon: 'check', trend: 'up' },
    { title: 'Best Streak', value: '7 days', icon: 'fire', trend: 'down' },
  ];

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestAndFetchScreenTime();
    }
  }, []);

  const requestAndFetchScreenTime = async () => {
    try {
      const res = await ScreenTime.requestUsagePermission();
      console.log('Permission result:', res);

      const usage = await ScreenTime.getScreenTime();
      setScreenTimeData(usage);
    } catch (error: any) {
      console.error('Error fetching screen time:', error.message);
      Alert.alert('Screen Time Error', error.message);
    }
  };

  return (
    <ScrollView style={[tw`flex-1 p-4`, { backgroundColor: colors.background }]}>
      <Text style={[tw`text-2xl font-bold mb-6`, { color: colors.text }]}>
        Analytics
      </Text>

      <View style={tw`flex-row flex-wrap justify-between`}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[
              tw`w-[48%] p-4 mb-4 rounded-xl`,
              { backgroundColor: colors.card }
            ]}
          >
            <View style={tw`flex-row justify-between items-start`}>
              <Icon name={stat.icon} size={20} color={colors.primary} />
              {stat.trend === 'up' && (
                <Icon name="trending-up" size={16} color="#10B981" />
              )}
              {stat.trend === 'down' && (
                <Icon name="trending-down" size={16} color="#EF4444" />
              )}
              {stat.trend === 'neutral' && (
                <Icon name="trending-neutral" size={16} color="#F59E0B" />
              )}
            </View>
            <Text style={[tw`text-xl font-bold mt-2`, { color: colors.text }]}>
              {stat.value}
            </Text>
            <Text style={[tw`text-sm mt-1`, { color: colors.text, opacity: 0.7 }]}>
              {stat.title}
            </Text>
          </View>
        ))}
      </View>

      <View style={[tw`mt-4 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>
          Weekly Focus Trend
        </Text>
        <View style={tw`h-40 bg-gray-100 rounded-lg justify-center items-center`}>
          <Icon name="chart-line" size={48} color={colors.primary} />
          <Text style={[tw`mt-2`, { color: colors.text }]}>
            Your analytics chart will appear here
          </Text>
        </View>
      </View>

      {/* 🔻 Screen Time Section */}
      <View style={[tw`mt-6 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
        <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>
          Screen Time (Last 24h)
        </Text>

        {Object.keys(screenTimeData).length === 0 ? (
          <Text style={{ color: colors.text, opacity: 0.6 }}>Loading or no data available</Text>
        ) : (
          Object.entries(screenTimeData).map(([app, time], index) => (
            <View key={index} style={tw`flex-row justify-between mb-2`}>
              <Text style={{ color: colors.text }}>{app}</Text>
              <Text style={{ color: colors.text }}>
                {Math.round(time as number / 60)} min
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;