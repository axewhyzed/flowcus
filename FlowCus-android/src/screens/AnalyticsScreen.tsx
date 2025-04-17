import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { requestUsagePermission, getScreenTime, FormattedAppUsage } from '../native/ScreenTimeModule';

const AnalyticsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [screenTimeData, setScreenTimeData] = useState<FormattedAppUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const stats = [
    { title: 'Total Focus Time', value: '28h 45m', icon: 'clock', trend: 'up' },
    { title: 'Avg Session', value: '52m', icon: 'timer', trend: 'neutral' },
    { title: 'Task Completion', value: '78%', icon: 'check', trend: 'up' },
    { title: 'Best Streak', value: '7 days', icon: 'fire', trend: 'down' },
  ];

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestAndFetchScreenTime();
    } else {
      setIsLoading(false);
    }
  }, [selectedDay]);

  const requestAndFetchScreenTime = async () => {
    try {
      setIsLoading(true);
      const res = await requestUsagePermission();
      console.log('Permission result:', res);

      const usage = await getScreenTime(selectedDay);
      setScreenTimeData(usage);
    } catch (error: any) {
      console.error('Error fetching screen time:', error.message);
      Alert.alert('Screen Time Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAppUsageItem = (app: FormattedAppUsage) => (
    <View key={app.packageName} style={[
      { backgroundColor: colors.card },
      tw`flex-row items-center mb-3 p-3 rounded-lg`
    ]}>
      <Image
        source={{ uri: `data:image/png;base64,${app.icon}` }}
        style={tw`w-10 h-10 rounded-lg mr-3`}
      />
      <View style={tw`flex-1`}>
        <Text style={[tw`text-base`, { color: colors.text }]}>{app.appName}</Text>
        <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.6 }]}>
          Last used: {app.lastUsed}
        </Text>
      </View>
      <Text style={[tw`font-medium`, { color: colors.primary }]}>{app.screenTime}</Text>
    </View>
  );

  return (
    <ScrollView style={[tw`flex-1 p-4`, { backgroundColor: colors.background }]}>
      <Text style={[tw`text-2xl font-bold mb-6`, { color: colors.text }]}>
        Analytics
      </Text>

      {/* Stats Cards */}
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

      {/* Weekly Focus Trend */}
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

      {/* Screen Time Section */}
      <View style={[tw`mt-6 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={[tw`text-lg font-semibold`, { color: colors.text }]}>
            {selectedDay === 'today' ? "Today's App Usage" : "Yesterday's App Usage"}
          </Text>
          <TouchableOpacity onPress={requestAndFetchScreenTime}>
            <Icon name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={tw`mb-4`}>
          <TouchableOpacity
            onPress={() => setDropdownVisible(true)}
            style={[tw`p-3 rounded border`, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text }}>{selectedDay === 'today' ? 'Today' : 'Yesterday'}</Text>
          </TouchableOpacity>

          <Modal
            transparent={true}
            visible={isDropdownVisible}
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity
              style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}
              onPress={() => setDropdownVisible(false)}
            >
              <View style={[tw`bg-white p-4 rounded`, { width: 200 }]}>
                <FlatList
                  data={['today', 'yesterday']}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDay(item as 'today' | 'yesterday');
                        setDropdownVisible(false);
                      }}
                      style={tw`p-2`}
                    >
                      <Text style={{ color: colors.text }}>{item === 'today' ? 'Today' : 'Yesterday'}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        {isLoading ? (
          <View style={tw`py-4 items-center`}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : screenTimeData.length === 0 ? (
          <Text style={[tw`text-center py-4`, { color: colors.text, opacity: 0.6 }]}>
            No screen time data available
          </Text>
        ) : (
          screenTimeData.map(renderAppUsageItem)
        )}
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;