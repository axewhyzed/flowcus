import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ToastAndroid, Alert, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import colors from "../config/colors";
import StatsCard from "../components/StatsCard";

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={tw`px-6 pt-6 pb-4`}>
                    <View style={tw`flex-row justify-between items-center`}>
                        <View>
                            <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>
                                Good Morning, Mihir!
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

                {/* Stats Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`px-4 py-2`}
                >
                    <StatsCard
                        title="Daily Avg"
                        value="4.2h"
                        icon="clock-outline"
                        trend="up"
                    />
                    <StatsCard
                        title="Completion"
                        value="78%"
                        icon="check-circle-outline"
                        trend="up"
                    />
                    <StatsCard
                        title="Sessions"
                        value="22"
                        icon="timer-outline"
                        trend="neutral"
                    />
                    <StatsCard
                        title="Streak"
                        value="7d"
                        icon="fire"
                        trend="up"
                    />
                </ScrollView>

                {/* Quick Actions */}
                <View style={tw`px-6 mt-4`}>
                    <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>
                        Quick Actions
                    </Text>
                    <View style={tw`flex-row justify-between mb-4`}>
                        {/* Start Focus Session Button */}
                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl`, {
                                backgroundColor: colors.primary,
                                width: '30%'
                            }]}
                            onPress={() => navigation.navigate('FocusSession')}
                        >
                            <Icon name="play" size={24} color="#fff" />
                            <Text style={tw`text-white mt-2 font-medium`}>Start</Text>
                        </TouchableOpacity>

                        {/* Tasks Button - Enhanced with badge */}
                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl relative`, {
                                backgroundColor: colors.card,
                                width: '30%'
                            }]}
                            onPress={() => navigation.navigate('Tasks')}
                        >
                            <View style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 justify-center items-center`}>
                                <Text style={tw`text-white text-xs`}>3</Text>
                            </View>
                            <Icon name="format-list-checks" size={24} color={colors.primary} />
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Tasks</Text>
                        </TouchableOpacity>

                        {/* Analytics Button - Enhanced with pulse animation */}
                        <TouchableOpacity
                            style={[tw`items-center justify-center p-4 rounded-xl`, {
                                backgroundColor: colors.card,
                                width: '30%'
                            }]}
                            onPress={() => navigation.navigate('Analytics')}
                        >
                            <View style={tw`relative`}>
                                <Icon name="chart-bar" size={24} color={colors.primary} />
                                <View style={[
                                    tw`absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full`,
                                    {
                                        transform: [{ scale: 1.2 }],
                                        opacity: 0.8
                                    }
                                ]} />
                            </View>
                            <Text style={[tw`mt-2 font-medium`, { color: colors.text }]}>Stats</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Weekly Progress */}
                <View style={[tw`mx-6 my-4 p-5 rounded-xl`, { backgroundColor: colors.card }]}>
                    <View style={tw`flex-row justify-between items-center mb-4`}>
                        <Text style={[tw`text-lg font-semibold`, { color: colors.text }]}>
                            Weekly Progress
                        </Text>
                        <TouchableOpacity>
                            <Text style={[tw`text-sm`, { color: colors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={tw`h-40 bg-gray-100 rounded-lg justify-center items-center`}>
                        <Icon name="chart-line" size={48} color={colors.primary} />
                        <Text style={[tw`mt-2`, { color: colors.text }]}>Your progress chart will appear here</Text>
                    </View>
                </View>

                {/* Recent Sessions */}
                <View style={tw`mx-6 mb-8`}>
                    <Text style={[tw`text-lg font-semibold mb-3`, { color: colors.text }]}>
                        Recent Sessions
                    </Text>
                    {[1, 2, 3].map((item) => (
                        <View
                            key={item}
                            style={[tw`p-4 rounded-xl mb-3`, { backgroundColor: colors.card }]}
                        >
                            <View style={tw`flex-row justify-between`}>
                                <Text style={[tw`font-medium`, { color: colors.text }]}>
                                    Focus Session #{item}
                                </Text>
                                <Text style={[tw`text-sm`, { color: colors.primary }]}>
                                    {item === 1 ? '25m ago' : item === 2 ? '2h ago' : 'Yesterday'}
                                </Text>
                            </View>
                            <Text style={[tw`text-sm mt-1`, { color: colors.text, opacity: 0.7 }]}>
                                Completed 4 pomodoros
                            </Text>
                            <View style={tw`flex-row mt-2`}>
                                <View style={tw`flex-1 h-2 rounded-full bg-gray-300`}>
                                    <View
                                        style={[
                                            tw`h-2 rounded-full`,
                                            {
                                                width: `${item === 1 ? 80 : item === 2 ? 65 : 90}%`,
                                                backgroundColor: colors.primary
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[tw`ml-2 text-sm`, { color: colors.primary }]}>
                                    {item === 1 ? '80%' : item === 2 ? '65%' : '90%'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[
                    tw`absolute right-6 bottom-6 w-14 h-14 rounded-full justify-center items-center shadow-lg`,
                    {
                        backgroundColor: colors.primary,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 5
                    }
                ]}
                onPress={() => Alert.alert('Start New Session')}
            >
                <Icon name="plus" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default HomeScreen;