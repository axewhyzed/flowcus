// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchDashboardStats, fetchCurrentFocus } from '../redux/slices/dashboard';
import { fetchTasks } from '../redux/slices/tasks';
import apiClient from '../services/apiClient';
import StatsCard from "../components/StatsCard";

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    
    // Redux State
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, currentFocus, isLoading } = useSelector((state: RootState) => state.dashboard);
    const { list: taskList } = useSelector((state: RootState) => state.tasks);

    // Local State
    const [isShifting, setIsShifting] = useState(false);
    const [isRollingOver, setIsRollingOver] = useState(false);

    // Derived Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastUnfinishedTasks = taskList.filter(t => {
        if (t.isCompleted || t.isDeleted) return false;
        if (t.startTime) return new Date(t.startTime) < today;
        if (t.createdOn) return new Date(t.createdOn) < today;
        return false;
    });

    const activeTasksCount = taskList.filter(t => !t.isCompleted && !t.isDeleted).length;
    const formattedDate = new Date().toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric'
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Initial Fetch
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchDashboardStats());
        dispatch(fetchCurrentFocus());
        dispatch(fetchTasks());
    };

    const handleShiftSchedule = async (minutes: number) => {
        setIsShifting(true);
        try {
            const res = await apiClient.post('/timetable/shift-today', { minutes });
            Alert.alert("Schedule Shifted", res.data?.message || `Shifted schedule by +${minutes} minutes.`);
            loadData();
        } catch {
            Alert.alert("Notice", "Could not shift schedule. Ensure you have an active timetable.");
        } finally {
            setIsShifting(false);
        }
    };

    const handleRolloverTasks = async () => {
        setIsRollingOver(true);
        try {
            const res = await apiClient.post('/tasks/rollover-yesterday', {});
            Alert.alert("Tasks Rolled Over", res.data?.message || "Unfinished tasks moved to today!");
            loadData();
        } catch {
            Alert.alert("Error", "Failed to rollover tasks.");
        } finally {
            setIsRollingOver(false);
        }
    };

    const focusTitle = currentFocus?.title || currentFocus?.taskName || (currentFocus as any)?.categoryName;

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            <ScrollView 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={loadData} />
                }
            >
                {/* Header */}
                <View style={tw`px-6 pt-6 pb-2`}>
                    <View style={tw`flex-row justify-between items-center`}>
                        <View>
                            <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>
                                {getGreeting()}, {user?.name || user?.username || 'there'}!
                            </Text>
                            <Text style={[tw`text-base mt-1`, { color: colors.text, opacity: 0.7 }]}>
                                {formattedDate}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                            <Icon name="account-circle" size={38} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Rollover Unfinished Tasks Banner */}
                {pastUnfinishedTasks.length > 0 && (
                    <View style={tw`mx-6 my-2 p-4 rounded-xl bg-amber-50 border border-amber-200 flex-row items-center justify-between shadow-sm`}>
                        <View style={tw`flex-1 mr-3`}>
                            <View style={tw`flex-row items-center`}>
                                <Icon name="clock-alert-outline" size={18} color="#b45309" style={tw`mr-1.5`} />
                                <Text style={tw`font-bold text-amber-900 text-sm`}>
                                    {pastUnfinishedTasks.length} Unfinished {pastUnfinishedTasks.length === 1 ? 'Task' : 'Tasks'}
                                </Text>
                            </View>
                            <Text style={tw`text-xs text-amber-800 mt-0.5`}>
                                Roll over past backlog to today without guilt.
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={handleRolloverTasks}
                            disabled={isRollingOver}
                            style={tw`px-3 py-1.5 bg-amber-600 rounded-lg active:scale-95`}
                        >
                            <Text style={tw`text-white font-bold text-xs`}>
                                {isRollingOver ? '...' : 'Rollover'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Current Focus / 1-Tap Hero Card */}
                <View style={[tw`mx-6 my-3 p-5 rounded-2xl shadow-md overflow-hidden relative`, { backgroundColor: colors.primary }]}>
                    <View style={tw`flex-row items-center justify-between mb-2`}>
                        <View style={tw`flex-row items-center`}>
                            <View style={tw`w-2 h-2 rounded-full bg-emerald-400 mr-2`} />
                            <Text style={tw`text-xs font-bold text-blue-100 uppercase tracking-wider`}>Current Focus</Text>
                        </View>
                        <Icon name="fire" size={20} color="#fcd34d" />
                    </View>

                    {focusTitle ? (
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-2xl font-black text-white`}>{focusTitle}</Text>
                            {currentFocus.startTime && currentFocus.endTime && (
                                <Text style={tw`text-sm text-blue-100 mt-1`}>
                                    {currentFocus.startTime} - {currentFocus.endTime}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-xl font-bold text-white`}>Free Time / No Block Active</Text>
                            <Text style={tw`text-xs text-blue-100 mt-1`}>
                                Ready to focus? Tap below to launch a deep work session.
                            </Text>
                        </View>
                    )}

                    {/* 1-Tap Focus Trigger */}
                    <TouchableOpacity
                        style={tw`bg-white py-3 px-5 rounded-xl flex-row items-center justify-center shadow-lg active:scale-95`}
                        onPress={() => navigation.navigate('FocusSession', { taskName: focusTitle || 'Deep Work' })}
                    >
                        <Icon name="play" size={20} color={colors.primary} style={tw`mr-2`} />
                        <Text style={[tw`font-bold text-base`, { color: colors.primary }]}>
                            Start Focus Session
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Running Late / Shift Schedule Widget */}
                <View style={tw`mx-6 mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200 flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center`}>
                        <Icon name="clock-fast" size={18} color="#6b7280" style={tw`mr-1.5`} />
                        <Text style={tw`text-xs font-medium text-gray-700`}>Running Late?</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        <TouchableOpacity 
                            onPress={() => handleShiftSchedule(15)}
                            disabled={isShifting}
                            style={tw`px-2.5 py-1 bg-white border border-gray-200 rounded-md active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+15m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftSchedule(30)}
                            disabled={isShifting}
                            style={tw`px-2.5 py-1 bg-white border border-gray-200 rounded-md active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+30m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftSchedule(60)}
                            disabled={isShifting}
                            style={tw`px-2.5 py-1 bg-white border border-gray-200 rounded-md active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+1h</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 py-2`}>
                    <StatsCard
                        title="Daily Avg"
                        value={stats?.dailyAvg || "--"}
                        icon="clock-outline"
                        trend="neutral"
                    />
                    <StatsCard
                        title="Completion"
                        value={stats?.completionRate != null ? `${stats.completionRate}%` : "--"}
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
                <View style={tw`px-6 mt-3`}>
                    <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>Quick Shortcuts</Text>
                    <View style={tw`flex-row justify-between mb-4`}>
                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl`, { backgroundColor: colors.primary, width: '30%' }]}
                            onPress={() => navigation.navigate('FocusSession')}
                        >
                            <Icon name="timer-sand" size={24} color="#fff" />
                            <Text style={tw`text-white mt-2 font-medium`}>Timer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl relative border border-gray-100`, { backgroundColor: colors.card, width: '30%' }]}
                            onPress={() => navigation.navigate('Tasks')}
                        >
                            {activeTasksCount > 0 && (
                                <View style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 justify-center items-center shadow-sm`}>
                                    <Text style={tw`text-white text-xs font-bold`}>{activeTasksCount}</Text>
                                </View>
                            )}
                            <Icon name="format-list-checks" size={24} color={colors.primary} />
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Tasks</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl border border-gray-100`, { backgroundColor: colors.card, width: '30%' }]}
                            onPress={() => navigation.navigate('Timetable')}
                        >
                            <Icon name="calendar-month" size={24} color={colors.primary} />
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Schedule</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

export default HomeScreen;