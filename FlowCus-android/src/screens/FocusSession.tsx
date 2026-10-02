// src/screens/FocusSession.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Vibration } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createTask } from '../redux/slices/tasks';
import { fetchDashboardStats } from '../redux/slices/dashboard';

const PRESETS = [15, 25, 45, 60];

const FocusSession = ({ navigation, route }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const { list: categories } = useSelector((state: RootState) => state.categories);

    const initialTaskName = route?.params?.taskName || 'Deep Work Session';
    const [sessionTitle, setSessionTitle] = useState(initialTaskName);
    const [selectedMinutes, setSelectedMinutes] = useState(25);
    const [customMinutes, setCustomMinutes] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

    const targetEndTimeRef = useRef<number | null>(null);
    const remainingSecondsOnPauseRef = useRef<number>(25 * 60);

    // Timer loop with timestamp diff (background safe)
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isRunning && !isPaused && targetEndTimeRef.current) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.max(0, Math.ceil((targetEndTimeRef.current! - now) / 1000));
                setSecondsLeft(diff);

                if (diff <= 0) {
                    if (interval) clearInterval(interval);
                    handleSessionComplete();
                }
            }, 500);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, isPaused]);

    const handleSelectPreset = (mins: number) => {
        setSelectedMinutes(mins);
        setCustomMinutes('');
        setSecondsLeft(mins * 60);
        remainingSecondsOnPauseRef.current = mins * 60;
    };

    const handleCustomChange = (text: string) => {
        setCustomMinutes(text);
        const parsed = parseInt(text, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setSelectedMinutes(parsed);
            setSecondsLeft(parsed * 60);
            remainingSecondsOnPauseRef.current = parsed * 60;
        }
    };

    const startTimer = () => {
        const totalSecs = selectedMinutes * 60;
        targetEndTimeRef.current = Date.now() + totalSecs * 1000;
        remainingSecondsOnPauseRef.current = totalSecs;
        setSessionStartTime(new Date());
        setIsRunning(true);
        setIsPaused(false);
    };

    const pauseTimer = () => {
        if (!isRunning || isPaused) return;
        remainingSecondsOnPauseRef.current = secondsLeft;
        setIsPaused(true);
    };

    const resumeTimer = () => {
        if (!isRunning || !isPaused) return;
        targetEndTimeRef.current = Date.now() + remainingSecondsOnPauseRef.current * 1000;
        setIsPaused(false);
    };

    const cancelTimer = () => {
        Alert.alert(
            "Cancel Focus",
            "Are you sure you want to stop this focus session?",
            [
                { text: "Keep Going", style: "cancel" },
                {
                    text: "Stop",
                    style: "destructive",
                    onPress: () => {
                        setIsRunning(false);
                        setIsPaused(false);
                        targetEndTimeRef.current = null;
                        setSecondsLeft(selectedMinutes * 60);
                    }
                }
            ]
        );
    };

    const handleFinishEarly = () => {
        Alert.alert(
            "Finish Session Early?",
            "Do you want to complete this session now and log your focus time?",
            [
                { text: "Keep Going", style: "cancel" },
                {
                    text: "Complete & Log",
                    onPress: () => {
                        handleSessionComplete();
                    }
                }
            ]
        );
    };

    const handleSessionComplete = () => {
        setIsRunning(false);
        setIsPaused(false);
        targetEndTimeRef.current = null;
        Vibration.vibrate([0, 500, 200, 500]);

        const endTime = new Date();
        const startTime = sessionStartTime || new Date(endTime.getTime() - selectedMinutes * 60000);
        const elapsedMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
        const defaultCatId = categories.length > 0 ? categories[0].id : 1;

        // Auto-log completed session to backend tasks
        dispatch(createTask({
            title: sessionTitle.trim() || `Focus Session (${elapsedMinutes}m)`,
            description: `Completed ${elapsedMinutes}m focus sprint.`,
            taskCategoryId: defaultCatId,
            priority: 3,
            isCompleted: true,
            isDeleted: false,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        })).then(() => {
            dispatch(fetchDashboardStats());
        });

        Alert.alert(
            "Session Completed! 🎉",
            `Awesome work! You completed ${elapsedMinutes} minute${elapsedMinutes > 1 ? 's' : ''} of focused work.`,
            [
                { text: "Great!", onPress: () => navigation.goBack() }
            ]
        );
    };

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <View style={[tw`flex-1 p-6 justify-between`, { backgroundColor: colors.background }]}>
            {/* Top Bar */}
            <View>
                <View style={tw`flex-row justify-between items-center pt-4`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
                        <Icon name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Focus Timer</Text>
                    <View style={tw`w-8`} />
                </View>

                {/* Target Task Banner / Editor */}
                <View style={[
                    tw`mt-4 p-3.5 rounded-2xl border`,
                    { backgroundColor: colors.card, borderColor: isRunning ? colors.primary : '#e5e7eb' }
                ]}>
                    <View style={tw`flex-row items-center justify-between mb-1`}>
                        <Text style={tw`text-[11px] font-bold text-blue-600 uppercase tracking-wider`}>
                            Focusing On
                        </Text>
                        {!isRunning && (
                            <Text style={tw`text-[11px] text-gray-400`}>Tap to edit</Text>
                        )}
                    </View>
                    <TextInput
                        value={sessionTitle}
                        onChangeText={setSessionTitle}
                        editable={!isRunning}
                        placeholder="What are you working on?"
                        placeholderTextColor="#9ca3af"
                        style={[tw`text-base font-bold`, { color: colors.text }]}
                    />
                </View>
            </View>

            {/* Timer Display */}
            <View style={tw`items-center my-auto`}>
                <View style={[
                    tw`w-60 h-60 rounded-full justify-center items-center shadow-lg border-4`,
                    { 
                        backgroundColor: colors.card,
                        borderColor: isRunning ? (isPaused ? '#f59e0b' : colors.primary) : '#e5e7eb'
                    }
                ]}>
                    <Text style={[tw`text-5xl font-black`, { color: colors.text }]}>
                        {formatTime(secondsLeft)}
                    </Text>
                    <Text style={[tw`mt-2 text-sm font-semibold`, { color: isPaused ? '#f59e0b' : colors.primary }]}>
                        {isRunning ? (isPaused ? 'Paused' : 'Focus Mode Active') : 'Ready to Focus'}
                    </Text>
                </View>

                {/* Preset Chips (when not running) */}
                {!isRunning && (
                    <View style={tw`mt-6 w-full`}>
                        <Text style={[tw`text-center text-xs mb-3 font-medium text-gray-500`]}>
                            Select Duration
                        </Text>
                        <View style={tw`flex-row justify-center gap-2 mb-3`}>
                            {PRESETS.map((mins) => {
                                const isSelected = selectedMinutes === mins && !customMinutes;
                                return (
                                    <TouchableOpacity
                                        key={mins}
                                        onPress={() => handleSelectPreset(mins)}
                                        style={[
                                            tw`px-4 py-2 rounded-xl border`,
                                            {
                                                backgroundColor: isSelected ? colors.primary : colors.card,
                                                borderColor: isSelected ? colors.primary : '#e5e7eb'
                                            }
                                        ]}
                                    >
                                        <Text style={[tw`font-bold text-sm`, { color: isSelected ? '#fff' : colors.text }]}>
                                            {mins}m
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={tw`flex-row items-center justify-center`}>
                            <Text style={[tw`text-xs text-gray-500 mr-2`]}>Custom (mins):</Text>
                            <TextInput
                                value={customMinutes}
                                onChangeText={handleCustomChange}
                                keyboardType="numeric"
                                placeholder="30"
                                placeholderTextColor="#9ca3af"
                                maxLength={3}
                                style={[
                                    tw`w-16 px-2.5 py-1 border rounded-lg text-center text-sm`,
                                    { borderColor: '#d1d5db', color: colors.text }
                                ]}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Controls */}
            <View style={tw`pb-4`}>
                {!isRunning ? (
                    <TouchableOpacity
                        onPress={startTimer}
                        style={[tw`py-4 rounded-2xl items-center shadow-md`, { backgroundColor: colors.primary }]}
                    >
                        <View style={tw`flex-row items-center`}>
                            <Icon name="play" size={24} color="#fff" style={tw`mr-2`} />
                            <Text style={tw`text-white text-lg font-bold`}>Start Focus</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={tw`gap-3`}>
                        <View style={tw`flex-row gap-3`}>
                            <TouchableOpacity
                                onPress={isPaused ? resumeTimer : pauseTimer}
                                style={[
                                    tw`flex-1 py-3.5 rounded-2xl items-center shadow-sm`,
                                    { backgroundColor: isPaused ? colors.primary : '#f59e0b' }
                                ]}
                            >
                                <View style={tw`flex-row items-center`}>
                                    <Icon name={isPaused ? "play" : "pause"} size={22} color="#fff" style={tw`mr-1.5`} />
                                    <Text style={tw`text-white text-base font-bold`}>
                                        {isPaused ? 'Resume' : 'Pause'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleFinishEarly}
                                style={[tw`flex-1 py-3.5 rounded-2xl items-center shadow-sm bg-emerald-600`]}
                            >
                                <View style={tw`flex-row items-center`}>
                                    <Icon name="check-circle-outline" size={22} color="#fff" style={tw`mr-1.5`} />
                                    <Text style={tw`text-white text-base font-bold`}>Finish Early</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={cancelTimer}
                            style={tw`py-2.5 rounded-xl items-center bg-gray-100 dark:bg-gray-800`}
                        >
                            <Text style={tw`text-red-500 font-semibold text-xs`}>Abandon Session</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

export default FocusSession;
