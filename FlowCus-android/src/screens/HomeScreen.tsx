// src/screens/HomeScreen.tsx
import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Text, RefreshControl } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchDashboardStats, fetchCurrentFocus } from '../redux/slices/dashboard';
import { fetchTasks } from '../redux/slices/tasks'; // Pre-fetch tasks for badge count
import StatsCard from "../components/StatsCard";

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    
    // Redux State
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, currentFocus, isLoading } = useSelector((state: RootState) => state.dashboard);
    const { list: taskList } = useSelector((state: RootState) => state.tasks);

    // Derived Data
    const activeTasksCount = taskList.filter(t => !t.isDeleted).length;
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    // Initial Fetch
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchDashboardStats());
        dispatch(fetchCurrentFocus());
        dispatch(fetchTasks());
    };

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            <ScrollView 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={loadData} />
                }
            >
                {/* Header */}
                <View style={tw`px-6 pt-6 pb-4`}>
                    <View style={tw`flex-row justify-between items-center`}>
                        <View>
                            <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>
                                Good Morning, {user?.name || user?.username}!
                            </Text>
                            <Text style={[tw`text-base mt-1`, { color: colors.text, opacity: 0.7 }]}>
                                {formattedDate}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                            <Icon name="account-circle" size={36} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Cards (Connected) */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 py-2`}>
                    <StatsCard
                        title="Daily Avg"
                        value={stats?.dailyAvg || "--"}
                        icon="clock-outline"
                        trend="neutral"
                    />
                    <StatsCard
                        title="Completion"
                        value={stats?.completionRate ? `${stats.completionRate}%` : "--"}
                        icon="check-circle-outline"
                        trend="up"
                    />
                    <StatsCard
                        title="Sessions"
                        value={stats?.totalSessions?.toString() || "0"}
                        icon="timer-outline"
                        trend="neutral"
                    />
                    <StatsCard
                        title="Streak"
                        value={stats?.streakDays ? `${stats.streakDays}d` : "0d"}
                        icon="fire"
                        trend="up"
                    />
                </ScrollView>

                {/* Quick Actions */}
                <View style={tw`px-6 mt-4`}>
                    <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>Quick Actions</Text>
                    <View style={tw`flex-row justify-between mb-4`}>
                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl`, { backgroundColor: colors.primary, width: '30%' }]}
                            onPress={() => navigation.navigate('FocusSession')}
                        >
                            <Icon name="play" size={24} color="#fff" />
                            <Text style={tw`text-white mt-2 font-medium`}>Start</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl relative`, { backgroundColor: colors.card, width: '30%' }]}
                            onPress={() => navigation.navigate('Tasks')}
                        >
                            {activeTasksCount > 0 && (
                                <View style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 justify-center items-center`}>
                                    <Text style={tw`text-white text-xs`}>{activeTasksCount}</Text>
                                </View>
                            )}
                            <Icon name="format-list-checks" size={24} color={colors.primary} />
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Tasks</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl`, { backgroundColor: colors.card, width: '30%' }]}
                            onPress={() => navigation.navigate('Analytics')}
                        >
                            <Icon name="chart-bar" size={24} color={colors.primary} />
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Stats</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Current Focus / Up Next */}
                <View style={[tw`mx-6 my-4 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
                    <Text style={[tw`text-lg font-semibold mb-2`, { color: colors.text }]}>Current Focus</Text>
                    {currentFocus?.message ? (
                         <Text style={[tw`text-base italic`, { color: colors.text, opacity: 0.7 }]}>{currentFocus.message}</Text>
                    ) : currentFocus ? (
                        <View>
                             <Text style={[tw`text-xl font-bold text-blue-600`]}>{currentFocus.title || "Untitled Task"}</Text>
                             <Text style={[tw`text-sm mt-1`, { color: colors.text }]}>{currentFocus.startTime} - {currentFocus.endTime}</Text>
                        </View>
                    ) : (
                        <Text style={[tw`text-base`, { color: colors.text, opacity: 0.7 }]}>Loading schedule...</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default HomeScreen;