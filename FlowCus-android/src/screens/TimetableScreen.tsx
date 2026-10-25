// src/screens/TimetableScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AppState, View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTimetables, fetchTimetableItems, createTimetableItem, updateTimetableItem, deleteTimetableItem, TimetableItem } from '../redux/slices/timetable';
import { fetchCategories } from '../redux/slices/categories';
import { fetchSubtypes } from '../redux/slices/subtypes';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../services/apiClient';
import { canScheduleExactAlarms, openExactAlarmSettings, reconcileBlockReminders } from '../native/AlarmModule';
import { usePreferences } from '../components/PreferencesProvider';
import { ensureNotificationPermission, hasNotificationPermission } from '../services/notificationPermissions';
import { TimetableScreenProps } from '../navigation/types';
import { buildTimetableItemDraft, dateOnly, parseDateOnly, splitTimetableItems } from './timetableModel';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toReminder(item: TimetableItem, categories: { id: number; name: string }[], subtypes: { id: number; name: string }[]) {
    const subtype = subtypes.find(value => value.id === item.taskSubtypeId);
    const category = categories.find(value => value.id === item.taskCategoryId);
    const title = item.subtypeName || subtype?.name || item.categoryName || category?.name || item.taskName || 'Focus block';
    return {
        id: item.id,
        title,
        message: `Your focus block starts in 5 minutes (${item.startTime.slice(0, 5)}).`,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        specificDate: item.specificDate?.slice(0, 10) ?? null,
        reminderMinutes: 5,
    };
}

const TimetableScreen = ({ navigation }: TimetableScreenProps) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    // Redux Data
    const { activeTimetableId, items, isLoading, error: timetableError } = useSelector((state: RootState) => state.timetable);
    const { list: categories } = useSelector((state: RootState) => state.categories);
    const { list: subtypes } = useSelector((state: RootState) => state.subtypes);
    const { preferences } = usePreferences();

    // UI State
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<TimetableItem | null>(null);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const [isShifting, setIsShifting] = useState(false);
    const [reminderDataReady, setReminderDataReady] = useState(false);
    const exactAlarmPromptShown = useRef(false);
    
    // New Item Form State
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubtypeId, setSelectedSubtypeId] = useState<number | null>(null);
    const [specificDate, setSpecificDate] = useState<Date | null>(null);

    // Picker Visibility State
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const loadData = useCallback(() => {
        setReminderDataReady(false);
        dispatch(fetchCategories());
        dispatch(fetchSubtypes());
        dispatch(fetchTimetables()).then((action) => {
             if (fetchTimetables.fulfilled.match(action)) {
                 const activeId = action.payload.find(timetable => timetable.isActive)?.id;
                 if (activeId) {
                    dispatch(fetchTimetableItems(activeId)).unwrap().then(() => setReminderDataReady(true)).catch(() => {});
                 } else {
                    setReminderDataReady(true);
                 }
             }
        });
    }, [dispatch]);

    // Initial Load
    useEffect(() => {
        loadData();

        const start = new Date();
        start.setMinutes(0);
        start.setSeconds(0);
        start.setHours(start.getHours() + 1);
        setStartTime(start);

        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        setEndTime(end);
    }, [loadData]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') loadData();
        });
        return () => subscription.remove();
    }, [loadData]);

    useEffect(() => {
        if (!reminderDataReady) return;
        let cancelled = false;
        const reconcile = async () => {
            if (!preferences.notificationsEnabled) {
                if (!cancelled) await reconcileBlockReminders([]);
                return;
            }
            if (!await hasNotificationPermission()) return;
            const canSchedule = await canScheduleExactAlarms();
            if (!canSchedule) {
                if (!exactAlarmPromptShown.current) {
                    exactAlarmPromptShown.current = true;
                    Alert.alert(
                        'Allow precise reminders',
                        'Android needs exact-alarm access to remind you before scheduled blocks.',
                        [
                            { text: 'Later', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => { void openExactAlarmSettings(); } },
                        ],
                    );
                }
                return;
            }
            exactAlarmPromptShown.current = false;
            const reminders = items.filter(item => !item.isDeleted).map(item => toReminder(item, categories, subtypes));
            if (!cancelled) await reconcileBlockReminders(reminders);
        };
        reconcile().catch(error => console.warn('Could not reconcile timetable reminders:', error));
        return () => { cancelled = true; };
    }, [reminderDataReady, preferences.notificationsEnabled, items, categories, subtypes]);

    const formatTimeForAPI = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
    };

    const formatTimeForDisplay = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleTimeChange = (_event: unknown, selectedDate?: Date, type?: 'start' | 'end') => {
        if (type === 'start') setShowStartPicker(false);
        if (type === 'end') setShowEndPicker(false);

        if (selectedDate) {
            if (type === 'start') {
                setStartTime(selectedDate);
                if (selectedDate >= endTime) {
                    const newEnd = new Date(selectedDate);
                    newEnd.setHours(newEnd.getHours() + 1);
                    setEndTime(newEnd);
                }
            } else {
                setEndTime(selectedDate);
            }
        }
    };

    const getBlockStyle = (startTimeStr: string, endTimeStr: string) => {
        const startH = parseInt(startTimeStr.split(':')[0], 10);
        const startM = parseInt(startTimeStr.split(':')[1], 10);
        const endH = parseInt(endTimeStr.split(':')[0], 10);
        const endM = parseInt(endTimeStr.split(':')[1], 10);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = Math.max(30, endMinutes - startMinutes);

        return {
            top: startMinutes, 
            height: duration,
        };
    };

    const openCreateForm = () => {
        setEditingItem(null);
        setSpecificDate(null);
        setSelectedCategoryId(categories[0]?.id ?? null);
        setSelectedSubtypeId(null);
        setModalVisible(true);
    };

    const openEditForm = (item: TimetableItem) => {
        const start = new Date();
        const [startHour, startMinute] = item.startTime.split(':').map(Number);
        start.setHours(startHour, startMinute, 0, 0);
        const end = new Date(start);
        const [endHour, endMinute] = item.endTime.split(':').map(Number);
        end.setHours(endHour, endMinute, 0, 0);
        setEditingItem(item);
        setSelectedDay(item.dayOfWeek);
        setStartTime(start);
        setEndTime(end);
        setSelectedCategoryId(item.taskCategoryId);
        setSelectedSubtypeId(item.taskSubtypeId ?? null);
        setSpecificDate(item.specificDate ? parseDateOnly(item.specificDate) : null);
        setModalVisible(true);
    };

    const handleSaveItem = async () => {
        if (!activeTimetableId) {
            Alert.alert("Error", "No active timetable found to add this block to.");
            return;
        }

        if (!selectedCategoryId) {
            Alert.alert("Missing Category", "Please select a task category for this block.");
            return;
        }

        let notificationGranted = true;
        if (preferences.notificationsEnabled) {
            try {
                notificationGranted = await ensureNotificationPermission();
            } catch {
                notificationGranted = false;
            }
        }

        const draft = buildTimetableItemDraft({
            timetableId: activeTimetableId,
            taskCategoryId: selectedCategoryId,
            taskSubtypeId: selectedSubtypeId,
            weeklyDay: selectedDay,
            startTime: formatTimeForAPI(startTime),
            endTime: formatTimeForAPI(endTime),
            specificDate: specificDate ? dateOnly(specificDate) : null,
        });
        const action = editingItem
            ? await dispatch(updateTimetableItem({ id: editingItem.id, item: draft }))
            : await dispatch(createTimetableItem(draft));
        const saved = createTimetableItem.fulfilled.match(action) || updateTimetableItem.fulfilled.match(action);
        if (saved) {
            setModalVisible(false);
            setEditingItem(null);
            dispatch(fetchTimetableItems(activeTimetableId));
            if (preferences.notificationsEnabled && !notificationGranted) {
                Alert.alert('Block saved', 'Allow notifications in Android Settings to receive timetable reminders.');
            }
        } else {
            const message = action.error.message || 'Please check the schedule details and try again.';
            Alert.alert('Could not save block', message);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert("Delete Block", "Are you sure you want to remove this scheduled block? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: 'destructive', 
                    onPress: () => { dispatch(deleteTimetableItem(id)); }
            }
        ]);
    };

    const handleBlockOptions = (item: TimetableItem) => {
        const category = item.categoryName || item.taskName || 'Scheduled block';
        const date = item.specificDate ? ` · ${parseDateOnly(item.specificDate).toLocaleDateString()}` : ` · ${DAYS[item.dayOfWeek]}`;
        Alert.alert(`${category}${date}`, `${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}`, [
            { text: 'Edit', onPress: () => openEditForm(item) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleShiftToday = async (minutes: number) => {
        setIsShifting(true);
        try {
            const res = await apiClient.post('/timetable/shift-today', { minutes, dayOfWeek: selectedDay });
            Alert.alert("Schedule Shifted", res.data?.message || `Shifted blocks by +${minutes} minutes.`);
            if (activeTimetableId) dispatch(fetchTimetableItems(activeTimetableId));
        } catch {
            Alert.alert("Notice", "Could not shift schedule.");
        } finally {
            setIsShifting(false);
        }
    };

    const handleApplyTemplate = async (templateName: string) => {
        setIsApplyingTemplate(true);
        try {
            let notificationGranted = true;
            if (preferences.notificationsEnabled) {
                try {
                    notificationGranted = await ensureNotificationPermission();
                } catch {
                    notificationGranted = false;
                }
            }
            const res = await apiClient.post('/timetable/apply-template', { templateName });
            Alert.alert("Template Applied! 🎉", res.data?.message || `Applied ${res.data?.name} routine.`);
            setTemplateModalVisible(false);
            loadData();
            if (preferences.notificationsEnabled && !notificationGranted) {
                Alert.alert('Template applied', 'Allow notifications in Android Settings to receive timetable reminders.');
            }
        } catch (err: unknown) {
            const serverMessage = axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
                ? err.response.data.error
                : null;
            Alert.alert("Error", serverMessage || "Failed to apply routine template.");
        } finally {
            setIsApplyingTemplate(false);
        }
    };

    const { weeklyItems, oneOffItems } = splitTimetableItems(items, selectedDay);
    const categorySubtypes = subtypes.filter(s => s.categoryId === selectedCategoryId);

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[tw`px-6 pt-6 pb-2 shadow-sm z-10`, { backgroundColor: colors.card }]}>
                <View style={tw`flex-row justify-between items-center mb-3`}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()} accessibilityRole="button" accessibilityLabel="Open navigation menu">
                        <Icon name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>Weekly Schedule</Text>
                    <View style={tw`flex-row items-center gap-2`}>
                        <TouchableOpacity 
                            onPress={() => setTemplateModalVisible(true)}
                            style={[tw`px-3 min-h-11 border rounded-lg flex-row items-center`, { backgroundColor: colors.background, borderColor: colors.border }]}
                            accessibilityRole="button"
                            accessibilityLabel="Open schedule templates"
                        >
                            <Icon name="auto-fix" size={16} color={colors.primary} style={tw`mr-1`} />
                            <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>Templates</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openCreateForm} accessibilityRole="button" accessibilityLabel="Add schedule block" style={tw`p-1`}>
                            <Icon name="plus" size={28} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Day Selector */}
                <View style={tw`flex-row justify-between pb-2`}>
                    {DAYS.map((day, index) => {
                        const isSelected = selectedDay === index;
                        return (
                            <TouchableOpacity
                                key={day}
                                onPress={() => setSelectedDay(index)}
                                style={[
                                    tw`p-2 rounded-lg items-center w-11`,
                                    isSelected ? { backgroundColor: colors.primary } : null
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`Show ${day} schedule`}
                            >
                                <Text style={[
                                    tw`font-medium text-xs`,
                                    { color: isSelected ? '#fff' : colors.text }
                                ]}>{day}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Shift Schedule Quick Bar */}
                <View style={tw`flex-row items-center justify-between pt-1 pb-1 border-t border-gray-100`}>
                    <View style={tw`flex-row items-center`}>
                        <Icon name="clock-fast" size={16} color="#6b7280" style={tw`mr-1`} />
                        <Text style={[tw`text-xs`, { color: colors.text }]}>Shift {DAYS[selectedDay]}:</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(15)}
                            disabled={isShifting}
                            style={[tw`px-3 min-h-11 justify-center rounded active:scale-95`, { backgroundColor: colors.background }]}
                            accessibilityRole="button"
                            accessibilityLabel="Shift schedule by 15 minutes"
                        >
                            <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>+15m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(30)}
                            disabled={isShifting}
                            style={[tw`px-3 min-h-11 justify-center rounded active:scale-95`, { backgroundColor: colors.background }]}
                            accessibilityRole="button"
                            accessibilityLabel="Shift schedule by 30 minutes"
                        >
                            <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>+30m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(60)}
                            disabled={isShifting}
                            style={[tw`px-3 min-h-11 justify-center rounded active:scale-95`, { backgroundColor: colors.background }]}
                            accessibilityRole="button"
                            accessibilityLabel="Shift schedule by 60 minutes"
                        >
                            <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>+1h</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Timetable Grid View */}
            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-8`}>
              {isLoading ? (
                <View style={tw`py-16 items-center`} accessibilityRole="progressbar" accessibilityLabel="Loading timetable">
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[tw`mt-3`, { color: colors.text }]} accessibilityLiveRegion="polite">Loading schedule…</Text>
                </View>
              ) : timetableError ? (
                <View style={tw`p-6 items-center`} accessibilityRole="alert">
                    <Text style={[tw`text-center`, { color: colors.text }]}>Schedule could not be loaded.</Text>
                    <TouchableOpacity onPress={loadData} style={tw`min-h-11 justify-center`} accessibilityRole="button" accessibilityLabel="Retry loading schedule">
                        <Text style={{ color: colors.primary }}>Try again</Text>
                    </TouchableOpacity>
                </View>
              ) : <>
              <View style={[tw`mx-5 mt-4 mb-3 p-4 rounded-xl border`, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[tw`text-lg font-bold mb-1`, { color: colors.text }]}>One-off blocks</Text>
                <Text style={[tw`text-xs mb-3`, { color: colors.text, opacity: 0.75 }]}>Dated blocks happen once and never repeat weekly.</Text>
                {oneOffItems.length === 0 ? (
                    <Text style={[tw`py-2 text-sm`, { color: colors.text, opacity: 0.75 }]}>No dated blocks yet.</Text>
                ) : oneOffItems.map(item => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => handleBlockOptions(item)}
                        style={[tw`mb-2 min-h-11 p-4 rounded-xl border flex-row items-center justify-between`, { backgroundColor: colors.background, borderColor: colors.border }]}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.categoryName || item.taskName || 'Block'}, ${item.specificDate ? parseDateOnly(item.specificDate).toLocaleDateString() : ''}, ${item.startTime.slice(0, 5)} to ${item.endTime.slice(0, 5)}. Edit or delete.`}
                    >
                        <View style={tw`flex-1 mr-3`}>
                            <Text style={[tw`font-semibold`, { color: colors.text }]}>{item.categoryName || item.taskName || 'Focus block'}</Text>
                            <Text style={[tw`text-xs mt-1`, { color: colors.text, opacity: 0.8 }]}>{item.specificDate ? parseDateOnly(item.specificDate).toLocaleDateString() : ''} · {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}</Text>
                        </View>
                        <Icon name="dots-horizontal" size={22} color={colors.text} />
                    </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 1440 }}>
                {HOURS.map((hour) => (
                    <View key={hour} style={[tw`border-b border-gray-100 flex-row`, { height: 60 }]}>
                        <View style={tw`w-16 border-r border-gray-100 justify-start items-center pt-1`}>
                            <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.75 }]}>
                                {hour.toString().padStart(2, '0')}:00
                            </Text>
                        </View>
                        <View style={[tw`flex-1`, { backgroundColor: colors.card }]} />
                    </View>
                ))}

                {/* Render Scheduled Blocks */}
                {weeklyItems.map((item) => {
                    const blockStyle = getBlockStyle(item.startTime, item.endTime);
                    const blockColor = item.colorHex || colors.primary;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => handleBlockOptions(item)}
                            style={[
                                tw`absolute left-16 right-4 rounded-lg p-2.5 shadow-sm justify-between`,
                                {
                                    top: blockStyle.top,
                                    height: blockStyle.height,
                                    backgroundColor: blockColor,
                                    opacity: 0.92
                                }
                            ]}
                        >
                            <View>
                                <Text style={tw`text-white font-bold text-sm`}>
                                    {item.categoryName}
                                </Text>
                                {item.subtypeName && (
                                    <Text style={tw`text-white/80 text-xs mt-0.5`}>
                                        {item.subtypeName}
                                    </Text>
                                )}
                            </View>
                            <Text style={tw`text-white/70 text-[10px]`}>
                                {item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)} (Tap for options)
                            </Text>
                        </TouchableOpacity>
                    );
                })}
              </View>

              </>}
            </ScrollView>

            {/* 1-Click Routine Templates Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={templateModalVisible}
                onRequestClose={() => setTemplateModalVisible(false)}
            >
                <View style={tw`flex-1 justify-end bg-black/50`}>
                    <View style={[tw`rounded-t-3xl p-6 max-h-85%`, { backgroundColor: colors.card }]}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <View>
                                <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>1-Click Routine Templates</Text>
                                <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.8 }]}>Pre-configured 7-day schedules for instant productivity.</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                                <Icon name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {isApplyingTemplate ? (
                            <View style={tw`py-12 items-center`}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[tw`mt-3 text-sm`, { color: colors.text }]}>Applying schedule template...</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Student */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('student')}
                                    style={[tw`p-4 mb-3 rounded-2xl border active:scale-98`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>🎓</Text>
                                        <Text style={[tw`font-bold text-base`, { color: colors.text }]}>University Student Routine</Text>
                                    </View>
                                    <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.85 }]}>
                                        Morning lectures (9-12), lunch, afternoon labs/study (1-4), evening gym, night revision.
                                    </Text>
                                </TouchableOpacity>

                                {/* Developer */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('developer')}
                                    style={[tw`p-4 mb-3 rounded-2xl border active:scale-98`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>💻</Text>
                                        <Text style={[tw`font-bold text-base`, { color: colors.text }]}>Software Engineer Routine</Text>
                                    </View>
                                    <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.85 }]}>
                                        Deep focus coding (9-12), standup & code review (1-2), sprint features, workout.
                                    </Text>
                                </TouchableOpacity>

                                {/* Freelancer */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('freelancer')}
                                    style={[tw`p-4 mb-3 rounded-2xl border active:scale-98`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>🚀</Text>
                                        <Text style={[tw`font-bold text-base`, { color: colors.text }]}>Freelance & Creator Routine</Text>
                                    </View>
                                    <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.85 }]}>
                                        Client deliverables (8:30-11:30), client calls & email, creative projects, recovery.
                                    </Text>
                                </TouchableOpacity>

                                {/* General */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('general')}
                                    style={[tw`p-4 mb-3 rounded-2xl border active:scale-98`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>⚖️</Text>
                                        <Text style={[tw`font-bold text-base`, { color: colors.text }]}>Balanced Daily Routine</Text>
                                    </View>
                                    <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.85 }]}>
                                        Morning primary focus block, afternoon secondary tasks, evening exercise.
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Add Block Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={tw`flex-1 justify-end bg-black/50`}>
                    <ScrollView style={[tw`rounded-t-3xl max-h-85%`, { backgroundColor: colors.card }]} contentContainerStyle={tw`p-6`} keyboardShouldPersistTaps="handled">
                        <Text style={[tw`text-xl font-bold mb-4`, { color: colors.text }]}>{editingItem ? 'Edit Schedule Block' : 'Add Schedule Block'}</Text>

                        <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Repeats</Text>
                        <View style={tw`flex-row mb-4`}>
                            <TouchableOpacity
                                onPress={() => setSpecificDate(null)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: specificDate === null }}
                                style={[tw`px-4 py-2 rounded-full mr-2 border`, specificDate === null ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
                            >
                                <Text style={{ color: specificDate === null ? '#fff' : colors.text }}>Weekly</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSpecificDate(current => current || new Date())}
                                accessibilityRole="button"
                                accessibilityState={{ selected: specificDate !== null }}
                                style={[tw`px-4 py-2 rounded-full border`, specificDate !== null ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
                            >
                                <Text style={{ color: specificDate !== null ? '#fff' : colors.text }}>One-off</Text>
                            </TouchableOpacity>
                        </View>
                        {specificDate && (
                            <View style={tw`mb-4`}>
                                <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[tw`border p-3 rounded-xl`, { borderColor: colors.border, backgroundColor: colors.background }]} accessibilityRole="button" accessibilityLabel={`Choose one-off date, ${specificDate.toLocaleDateString()}`}>
                                    <Text style={{ color: colors.text }}>{specificDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={specificDate}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                                        onChange={(_event, date) => {
                                            setShowDatePicker(false);
                                            if (date) setSpecificDate(date);
                                        }}
                                    />
                                )}
                            </View>
                        )}

                        {/* Category Selector */}
                        <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Category *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
                            {categories.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => {
                                        setSelectedCategoryId(c.id);
                                        setSelectedSubtypeId(null);
                                    }}
                                    style={[
                                        tw`px-4 py-2 rounded-full mr-2 border`,
                                        selectedCategoryId === c.id 
                                            ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                                            : { borderColor: colors.border }
                                    ]}
                                >
                                    <Text style={selectedCategoryId === c.id ? tw`text-white font-medium` : { color: colors.text }}>
                                        {c.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Subtype Selector (if available) */}
                        {categorySubtypes.length > 0 && (
                            <View style={tw`mb-4`}>
                                <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Subtype (Optional)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSubtypeId(null)}
                                        style={[
                                            tw`px-3 py-1.5 rounded-full mr-2 border`,
                                            selectedSubtypeId === null 
                                                ? { backgroundColor: '#4b5563', borderColor: '#4b5563' } 
                                                : { borderColor: colors.border }
                                        ]}
                                    >
                                        <Text style={selectedSubtypeId === null ? tw`text-white text-xs` : { color: colors.text }}>
                                            None
                                        </Text>
                                    </TouchableOpacity>
                                    {categorySubtypes.map((s) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            onPress={() => setSelectedSubtypeId(s.id)}
                                            style={[
                                                tw`px-3 py-1.5 rounded-full mr-2 border`,
                                                selectedSubtypeId === s.id 
                                                    ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                                                : { borderColor: colors.border }
                                            ]}
                                        >
                                            <Text style={selectedSubtypeId === s.id ? tw`text-white text-xs` : { color: colors.text }}>
                                                {s.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Time Pickers */}
                        <View style={tw`flex-row justify-between mb-8`}>
                            <View style={tw`w-48%`}>
                                <Text style={[tw`mb-2`, { color: colors.text }]}>Start Time</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowStartPicker(true)}
                                    style={[tw`border p-4 rounded-xl items-center flex-row justify-center`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <Icon name="clock-outline" size={20} color={colors.primary} style={tw`mr-2`} />
                                    <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>{formatTimeForDisplay(startTime)}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={tw`w-48%`}>
                                <Text style={[tw`mb-2`, { color: colors.text }]}>End Time</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowEndPicker(true)}
                                    style={[tw`border p-4 rounded-xl items-center flex-row justify-center`, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <Icon name="clock-check-outline" size={20} color={colors.primary} style={tw`mr-2`} />
                                    <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>{formatTimeForDisplay(endTime)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showStartPicker && (
                            <DateTimePicker
                                value={startTime}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={(e, date) => handleTimeChange(e, date, 'start')}
                            />
                        )}

                        {showEndPicker && (
                            <DateTimePicker
                                value={endTime}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={(e, date) => handleTimeChange(e, date, 'end')}
                            />
                        )}

                        {!specificDate && (
                            <Text style={[tw`mb-3 text-xs`, { color: colors.text, opacity: 0.8 }]}>Weekly block for {DAYS[selectedDay]}</Text>
                        )}

                        <TouchableOpacity 
                            onPress={handleSaveItem}
                            style={[tw`p-4 rounded-xl items-center mb-3`, { backgroundColor: colors.primary }]}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>{editingItem ? 'Save Changes' : 'Save Block'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`p-2`}>
                            <Text style={[tw`text-center font-medium`, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

export default TimetableScreen;
