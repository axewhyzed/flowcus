// src/screens/FocusSession.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Vibration, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createTask, fetchTasks } from '../redux/slices/tasks';
import { fetchDashboardStats } from '../redux/slices/dashboard';
import { clearFocusSession, createFocusSessionId, loadFocusSession, PersistedFocusSession, saveFocusSession, toFocusTaskPayload } from '../services/focusSessionStorage';
import { usePreferences } from '../components/PreferencesProvider';
import { FocusSessionScreenProps } from '../navigation/types';

const PRESETS = [15, 25, 45, 60];

const FocusSession = ({ navigation, route }: FocusSessionScreenProps) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const { list: categories } = useSelector((state: RootState) => state.categories);
    const user = useSelector((state: RootState) => state.auth.user);
    const { preferences } = usePreferences();

    const initialTaskName = route?.params?.taskName || 'Deep Work Session';
    const [sessionTitle, setSessionTitle] = useState(initialTaskName);
    const [selectedMinutes, setSelectedMinutes] = useState(25);
    const [customMinutes, setCustomMinutes] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isRestoring, setIsRestoring] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingLog, setPendingLog] = useState<PersistedFocusSession | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const activeSessionRef = useRef<PersistedFocusSession | null>(null);
    const completionInProgressRef = useRef(false);
    const startInProgressRef = useRef(false);

    const syncCompletedSession = useCallback(async (record: PersistedFocusSession) => {
        setIsSaving(true);
        setSaveError(null);
        try {
            // Keep the same idempotency key across retries so the API can
            // safely recognize a request whose response was lost.
            await saveFocusSession(record);
            await dispatch(createTask({
                idempotencyKey: record.sessionId,
                task: toFocusTaskPayload(record),
            })).unwrap();
            await clearFocusSession(record.userId);
            activeSessionRef.current = null;
            setPendingLog(null);
            setIsSaving(false);
            completionInProgressRef.current = false;
            dispatch(fetchDashboardStats());
            dispatch(fetchTasks());
            Alert.alert(
                'Session Completed!',
                `Your ${record.elapsedMinutes || 1} minute${record.elapsedMinutes === 1 ? '' : 's'} of focus has been saved.`,
                [{ text: 'Great!', onPress: () => navigation.goBack() }],
            );
        } catch (error: unknown) {
            setPendingLog(record);
            setSaveError(error instanceof Error ? error.message : 'The session is saved on this device and can be retried.');
            setIsSaving(false);
            completionInProgressRef.current = false;
            Alert.alert('Session not synced', 'Your completed session is saved on this device. Retry when your connection is available.');
        }
    }, [dispatch, navigation]);

    const handleSessionComplete = useCallback(async () => {
        const current = activeSessionRef.current;
        if (!current || current.status === 'pendingLog' || completionInProgressRef.current) return;
        completionInProgressRef.current = true;

        const remainingSeconds = current.status === 'paused'
            ? current.remainingSeconds
            : current.targetEndAt
                ? Math.max(0, Math.ceil((current.targetEndAt - Date.now()) / 1000))
                : current.remainingSeconds;
        const elapsedMinutes = Math.max(1, Math.round((current.totalSeconds - remainingSeconds) / 60));
        const completed: PersistedFocusSession = {
            ...current,
            status: 'pendingLog',
            targetEndAt: null,
            remainingSeconds,
            elapsedMinutes,
            endedAt: current.status === 'running' && current.targetEndAt && remainingSeconds === 0
                ? current.targetEndAt
                : Date.now(),
        };

        activeSessionRef.current = completed;
        setIsRunning(false);
        setIsPaused(false);
        setPendingLog(completed);
        setSecondsLeft(0);
        if (preferences.hapticsEnabled) Vibration.vibrate([0, 500, 200, 500]);
        await syncCompletedSession(completed);
    }, [preferences.hapticsEnabled, syncCompletedSession]);

    // Timer loop with timestamp diff (background safe)
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        const session = activeSessionRef.current;

        if (isRunning && !isPaused && session?.status === 'running' && session.targetEndAt) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.max(0, Math.ceil((session.targetEndAt! - now) / 1000));
                setSecondsLeft(diff);

                if (diff <= 0) {
                    if (interval) clearInterval(interval);
                    void handleSessionComplete();
                }
            }, 500);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, isPaused, handleSessionComplete]);

    useEffect(() => {
        let mounted = true;
        if (!user?.id) {
            setIsRestoring(false);
            return;
        }
        loadFocusSession(user.id).then(record => {
            if (!mounted) return;
            if (record?.status === 'pendingLog') {
                activeSessionRef.current = record;
                setPendingLog(record);
                setSessionTitle(record.title);
                setSecondsLeft(0);
            } else if (record) {
                activeSessionRef.current = record;
                setSessionTitle(record.title);
                setSelectedMinutes(Math.max(1, Math.round(record.totalSeconds / 60)));
                setSecondsLeft(record.status === 'paused'
                    ? record.remainingSeconds
                    : Math.max(0, Math.ceil(((record.targetEndAt || Date.now()) - Date.now()) / 1000)));
                setIsRunning(true);
                setIsPaused(record.status === 'paused');
                if (record.status === 'running' && (record.targetEndAt || 0) <= Date.now()) {
                    void handleSessionComplete();
                }
            }
        }).catch(() => {
            Alert.alert('Timer restore failed', 'FlowCus could not restore your saved focus session.');
        }).finally(() => {
            if (mounted) setIsRestoring(false);
        });
        return () => { mounted = false; };
    }, [handleSessionComplete, user?.id]);

    const handleSelectPreset = (mins: number) => {
        setSelectedMinutes(mins);
        setCustomMinutes('');
        setSecondsLeft(mins * 60);
    };

    const handleCustomChange = (text: string) => {
        setCustomMinutes(text);
        const parsed = parseInt(text, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setSelectedMinutes(parsed);
            setSecondsLeft(parsed * 60);
        }
    };

    const startTimer = async () => {
        if (startInProgressRef.current) return;
        if (pendingLog) {
            Alert.alert('Session waiting to sync', 'Retry or discard the saved focus log before starting another session.');
            return;
        }
        const categoryId = route?.params?.taskCategoryId || categories[0]?.id;
        if (!user?.id) {
            Alert.alert('Sign in required', 'Sign in again to start a focus session.');
            return;
        }
        if (!categoryId) {
            Alert.alert('Category required', 'Create a task category before starting a focus session.');
            return;
        }
        const totalSecs = selectedMinutes * 60;
        const startedAt = Date.now();
        const record: PersistedFocusSession = {
            userId: user.id,
            sessionId: createFocusSessionId(),
            status: 'running',
            title: sessionTitle,
            categoryId,
            startedAt,
            targetEndAt: startedAt + totalSecs * 1000,
            totalSeconds: totalSecs,
            remainingSeconds: totalSecs,
        };
        startInProgressRef.current = true;
        setIsStarting(true);
        try {
            await saveFocusSession(record);
        } catch {
            Alert.alert('Timer not started', 'FlowCus could not save the session on this device. Check storage and try again.');
            return;
        } finally {
            startInProgressRef.current = false;
            setIsStarting(false);
        }
        activeSessionRef.current = record;
        setIsRunning(true);
        setIsPaused(false);
        setPendingLog(null);
        setSecondsLeft(totalSecs);
    };

    const pauseTimer = async () => {
        if (!isRunning || isPaused) return;
        const current = activeSessionRef.current;
        if (!current?.targetEndAt) return;
        const remainingSeconds = Math.max(0, Math.ceil((current.targetEndAt - Date.now()) / 1000));
        const paused: PersistedFocusSession = { ...current, status: 'paused', targetEndAt: null, remainingSeconds };
        try {
            await saveFocusSession(paused);
        } catch {
            Alert.alert('Pause not saved', 'FlowCus could not save the paused timer. Try again.');
            return;
        }
        activeSessionRef.current = paused;
        setSecondsLeft(remainingSeconds);
        setIsPaused(true);
    };

    const resumeTimer = async () => {
        if (!isRunning || !isPaused) return;
        const current = activeSessionRef.current;
        if (!current) return;
        const resumed: PersistedFocusSession = {
            ...current,
            status: 'running',
            targetEndAt: Date.now() + current.remainingSeconds * 1000,
        };
        try {
            await saveFocusSession(resumed);
        } catch {
            Alert.alert('Timer not resumed', 'FlowCus could not save the resumed timer. Try again.');
            return;
        }
        activeSessionRef.current = resumed;
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
                        if (activeSessionRef.current) void clearFocusSession(activeSessionRef.current.userId);
                        activeSessionRef.current = null;
                        setIsRunning(false);
                        setIsPaused(false);
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
                        void handleSessionComplete();
                    }
                }
            ]
        );
    };

    const retryPendingLog = () => {
        if (pendingLog && !isSaving) void syncCompletedSession(pendingLog);
    };

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={tw`flex-grow p-6 justify-between pb-12`} keyboardShouldPersistTaps="handled">
            {/* Top Bar */}
            <View>
                <View style={tw`flex-row justify-between items-center pt-4`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityRole="button" accessibilityLabel="Go back">
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
                        editable={!isRunning && !pendingLog}
                        placeholder="What are you working on?"
                        placeholderTextColor="#9ca3af"
                        accessibilityLabel="Focus session title"
                        style={[tw`text-base font-bold`, { color: colors.text }]}
                    />
                </View>

                {pendingLog && (
                    <View style={[tw`mt-4 p-4 rounded-xl border`, { backgroundColor: colors.card, borderColor: colors.notification }]}>
                        <Text style={[tw`font-bold`, { color: colors.text }]}>Completed session waiting to sync</Text>
                        <Text style={[tw`text-sm mt-1`, { color: colors.text, opacity: 0.8 }]}>
                            {saveError || 'Your focus log is saved on this device.'}
                        </Text>
                        <View style={tw`flex-row mt-3 gap-2`}>
                            <TouchableOpacity
                                onPress={retryPendingLog}
                                disabled={isSaving}
                                style={[tw`flex-1 py-2.5 rounded-lg items-center`, { backgroundColor: colors.primary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Retry saving completed focus session"
                            >
                                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white font-bold`}>Retry save</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => Alert.alert('Discard focus log?', 'This removes the saved session from this device.', [
                                    { text: 'Keep', style: 'cancel' },
                                    { text: 'Discard', style: 'destructive', onPress: () => {
                                        if (pendingLog) void clearFocusSession(pendingLog.userId);
                                        activeSessionRef.current = null;
                                        setPendingLog(null);
                                        setSaveError(null);
                                    } },
                                ])}
                                disabled={isSaving}
                                style={tw`px-3 py-2.5 rounded-lg border border-gray-300 items-center justify-center`}
                                accessibilityRole="button"
                                accessibilityLabel="Discard saved focus log"
                            >
                                <Text style={{ color: colors.text }}>Discard</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
                {!isRunning && !pendingLog && !isRestoring && (
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
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        accessibilityLabel={`${mins} minute focus session`}
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
                                accessibilityLabel="Custom focus duration in minutes"
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
                {isRestoring ? (
                    <View style={tw`py-4 items-center`}><ActivityIndicator color={colors.primary} /></View>
                ) : pendingLog ? (
                    <Text style={[tw`text-center py-3`, { color: colors.text, opacity: 0.75 }]}>Save or discard the completed session above to continue.</Text>
                ) : !isRunning ? (
                    <TouchableOpacity
                        onPress={startTimer}
                        style={[tw`py-4 rounded-2xl items-center shadow-md`, { backgroundColor: colors.primary }]}
                        disabled={isStarting}
                        accessibilityRole="button"
                        accessibilityLabel="Start focus timer"
                    >
                        <View style={tw`flex-row items-center`}>
                            {isStarting ? <ActivityIndicator color="#fff" /> : <Icon name="play" size={24} color="#fff" style={tw`mr-2`} />}
                            <Text style={tw`text-white text-lg font-bold`}>{isStarting ? 'Starting…' : 'Start Focus'}</Text>
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
                                accessibilityRole="button"
                                accessibilityLabel={isPaused ? 'Resume focus timer' : 'Pause focus timer'}
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
                                accessibilityRole="button"
                                accessibilityLabel="Finish focus session early and save"
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
                            accessibilityRole="button"
                            accessibilityLabel="Abandon focus session"
                        >
                            <Text style={tw`text-red-500 font-semibold text-xs`}>Abandon Session</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default FocusSession;
