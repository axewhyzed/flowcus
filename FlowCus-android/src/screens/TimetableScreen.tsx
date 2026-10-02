// src/screens/TimetableScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTimetables, fetchTimetableItems, createTimetableItem, deleteTimetableItem } from '../redux/slices/timetable';
import { fetchCategories } from '../redux/slices/categories';
import { fetchSubtypes } from '../redux/slices/subtypes';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../services/apiClient';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TimetableScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    // Redux Data
    const { timetables, activeTimetableId, items, isLoading } = useSelector((state: RootState) => state.timetable);
    const { list: categories } = useSelector((state: RootState) => state.categories);
    const { list: subtypes } = useSelector((state: RootState) => state.subtypes);

    // UI State
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [modalVisible, setModalVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const [isShifting, setIsShifting] = useState(false);
    
    // New Item Form State
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubtypeId, setSelectedSubtypeId] = useState<number | null>(null);

    // Picker Visibility State
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

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
    }, []);

    const loadData = () => {
        dispatch(fetchCategories());
        dispatch(fetchSubtypes());
        dispatch(fetchTimetables()).then((action) => {
             if (fetchTimetables.fulfilled.match(action)) {
                 const activeId = action.payload.find((t: any) => t.isActive)?.id || action.payload[0]?.id;
                 if (activeId) dispatch(fetchTimetableItems(activeId));
             }
        });
    };

    const formatTimeForAPI = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
    };

    const formatTimeForDisplay = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleTimeChange = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
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

    const handleAddItem = () => {
        if (!activeTimetableId) {
            Alert.alert("Error", "No active timetable found to add this block to.");
            return;
        }

        if (!selectedCategoryId) {
            Alert.alert("Missing Category", "Please select a task category for this block.");
            return;
        }

        dispatch(createTimetableItem({
            timetableId: activeTimetableId,
            taskCategoryId: selectedCategoryId,
            taskSubtypeId: selectedSubtypeId,
            dayOfWeek: selectedDay,
            startTime: formatTimeForAPI(startTime),
            endTime: formatTimeForAPI(endTime),
        })).then((action) => {
            if (createTimetableItem.fulfilled.match(action)) {
                setModalVisible(false);
                dispatch(fetchTimetableItems(activeTimetableId));
            } else {
                Alert.alert("Overlap / Error", "Could not save block. Please check for overlapping time blocks.");
            }
        });
    };

    const handleDelete = (id: number) => {
        Alert.alert("Delete Block", "Are you sure you want to remove this scheduled block? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: 'destructive', 
                onPress: () => {
                    dispatch(deleteTimetableItem(id));
                }
            }
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
            const res = await apiClient.post('/timetable/apply-template', { templateName });
            Alert.alert("Template Applied! 🎉", res.data?.message || `Applied ${res.data?.name} routine.`);
            setTemplateModalVisible(false);
            loadData();
        } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.error || "Failed to apply routine template.");
        } finally {
            setIsApplyingTemplate(false);
        }
    };

    const daysItems = items.filter(i => i.dayOfWeek === selectedDay && !i.isDeleted);
    const categorySubtypes = subtypes.filter(s => s.categoryId === selectedCategoryId);

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={tw`px-6 pt-6 pb-2 bg-white shadow-sm z-10`}>
                <View style={tw`flex-row justify-between items-center mb-3`}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                        <Icon name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>Weekly Schedule</Text>
                    <View style={tw`flex-row items-center gap-2`}>
                        <TouchableOpacity 
                            onPress={() => setTemplateModalVisible(true)}
                            style={tw`px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg flex-row items-center`}
                        >
                            <Icon name="auto-fix" size={16} color="#4f46e5" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-indigo-700`}>Templates</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
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
                        <Text style={tw`text-xs text-gray-500`}>Shift {DAYS[selectedDay]}:</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(15)}
                            disabled={isShifting}
                            style={tw`px-2 py-0.5 bg-gray-100 rounded active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+15m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(30)}
                            disabled={isShifting}
                            style={tw`px-2 py-0.5 bg-gray-100 rounded active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+30m</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShiftToday(60)}
                            disabled={isShifting}
                            style={tw`px-2 py-0.5 bg-gray-100 rounded active:scale-95`}
                        >
                            <Text style={tw`text-xs font-bold text-blue-600`}>+1h</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Timetable Grid View */}
            <ScrollView style={tw`flex-1`} contentContainerStyle={{ height: 1440 }}>
                {HOURS.map((hour) => (
                    <View key={hour} style={[tw`border-b border-gray-100 flex-row`, { height: 60 }]}>
                        <View style={tw`w-16 border-r border-gray-100 justify-start items-center pt-1`}>
                            <Text style={tw`text-xs text-gray-400`}>
                                {hour.toString().padStart(2, '0')}:00
                            </Text>
                        </View>
                        <View style={tw`flex-1 bg-white`} />
                    </View>
                ))}

                {/* Render Scheduled Blocks */}
                {daysItems.map((item) => {
                    const blockStyle = getBlockStyle(item.startTime, item.endTime);
                    const blockColor = item.colorHex || colors.primary;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => handleDelete(item.id)}
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
                                {item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)} (Tap to delete)
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 1-Click Routine Templates Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={templateModalVisible}
                onRequestClose={() => setTemplateModalVisible(false)}
            >
                <View style={tw`flex-1 justify-end bg-black/50`}>
                    <View style={tw`bg-white rounded-t-3xl p-6 max-h-85%`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <View>
                                <Text style={tw`text-xl font-bold text-gray-900`}>1-Click Routine Templates</Text>
                                <Text style={tw`text-xs text-gray-500`}>Pre-configured 7-day schedules for instant productivity.</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                                <Icon name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {isApplyingTemplate ? (
                            <View style={tw`py-12 items-center`}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={tw`mt-3 text-sm text-gray-600`}>Applying schedule template...</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Student */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('student')}
                                    style={tw`p-4 mb-3 rounded-2xl bg-blue-50 border border-blue-200 active:scale-98`}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>🎓</Text>
                                        <Text style={tw`font-bold text-blue-950 text-base`}>University Student Routine</Text>
                                    </View>
                                    <Text style={tw`text-xs text-blue-800`}>
                                        Morning lectures (9-12), lunch, afternoon labs/study (1-4), evening gym, night revision.
                                    </Text>
                                </TouchableOpacity>

                                {/* Developer */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('developer')}
                                    style={tw`p-4 mb-3 rounded-2xl bg-purple-50 border border-purple-200 active:scale-98`}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>💻</Text>
                                        <Text style={tw`font-bold text-purple-950 text-base`}>Software Engineer Routine</Text>
                                    </View>
                                    <Text style={tw`text-xs text-purple-800`}>
                                        Deep focus coding (9-12), standup & code review (1-2), sprint features, workout.
                                    </Text>
                                </TouchableOpacity>

                                {/* Freelancer */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('freelancer')}
                                    style={tw`p-4 mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 active:scale-98`}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>🚀</Text>
                                        <Text style={tw`font-bold text-emerald-950 text-base`}>Freelance & Creator Routine</Text>
                                    </View>
                                    <Text style={tw`text-xs text-emerald-800`}>
                                        Client deliverables (8:30-11:30), client calls & email, creative projects, recovery.
                                    </Text>
                                </TouchableOpacity>

                                {/* General */}
                                <TouchableOpacity
                                    onPress={() => handleApplyTemplate('general')}
                                    style={tw`p-4 mb-3 rounded-2xl bg-amber-50 border border-amber-200 active:scale-98`}
                                >
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Text style={tw`text-2xl mr-2`}>⚖️</Text>
                                        <Text style={tw`font-bold text-amber-950 text-base`}>Balanced Daily Routine</Text>
                                    </View>
                                    <Text style={tw`text-xs text-amber-800`}>
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
                    <View style={tw`bg-white rounded-t-3xl p-6`}>
                        <Text style={tw`text-xl font-bold mb-4`}>Add Schedule Block</Text>

                        {/* Category Selector */}
                        <Text style={tw`mb-2 text-gray-600 font-medium`}>Category *</Text>
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
                                            : { borderColor: '#e5e7eb' }
                                    ]}
                                >
                                    <Text style={selectedCategoryId === c.id ? tw`text-white font-medium` : tw`text-gray-600`}>
                                        {c.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Subtype Selector (if available) */}
                        {categorySubtypes.length > 0 && (
                            <View style={tw`mb-4`}>
                                <Text style={tw`mb-2 text-gray-600 font-medium`}>Subtype (Optional)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSubtypeId(null)}
                                        style={[
                                            tw`px-3 py-1.5 rounded-full mr-2 border`,
                                            selectedSubtypeId === null 
                                                ? { backgroundColor: '#4b5563', borderColor: '#4b5563' } 
                                                : { borderColor: '#e5e7eb' }
                                        ]}
                                    >
                                        <Text style={selectedSubtypeId === null ? tw`text-white text-xs` : tw`text-gray-600 text-xs`}>
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
                                                    : { borderColor: '#e5e7eb' }
                                            ]}
                                        >
                                            <Text style={selectedSubtypeId === s.id ? tw`text-white text-xs` : tw`text-gray-600 text-xs`}>
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
                                <Text style={tw`mb-2 text-gray-600`}>Start Time</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowStartPicker(true)}
                                    style={tw`border border-gray-300 p-4 rounded-xl items-center flex-row justify-center bg-gray-50`}
                                >
                                    <Icon name="clock-outline" size={20} color={colors.primary} style={tw`mr-2`} />
                                    <Text style={tw`text-lg font-bold text-gray-800`}>{formatTimeForDisplay(startTime)}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={tw`w-48%`}>
                                <Text style={tw`mb-2 text-gray-600`}>End Time</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowEndPicker(true)}
                                    style={tw`border border-gray-300 p-4 rounded-xl items-center flex-row justify-center bg-gray-50`}
                                >
                                    <Icon name="clock-check-outline" size={20} color={colors.primary} style={tw`mr-2`} />
                                    <Text style={tw`text-lg font-bold text-gray-800`}>{formatTimeForDisplay(endTime)}</Text>
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

                        <TouchableOpacity 
                            onPress={handleAddItem}
                            style={[tw`p-4 rounded-xl items-center mb-3`, { backgroundColor: colors.primary }]}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Save Block</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`p-2`}>
                            <Text style={tw`text-center text-gray-500 font-medium`}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default TimetableScreen;