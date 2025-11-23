// src/screens/TimetableScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTimetables, fetchTimetableItems, createTimetableItem, deleteTimetableItem } from '../redux/slices/timetable';
import { fetchCategories } from '../redux/slices/categories';
import DateTimePicker from '@react-native-community/datetimepicker'; // <--- NEW IMPORT

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

const TimetableScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    // Redux Data
    const { timetables, activeTimetableId, items, isLoading } = useSelector((state: RootState) => state.timetable);
    const { list: categories } = useSelector((state: RootState) => state.categories);

    // UI State
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [modalVisible, setModalVisible] = useState(false);
    
    // New Item Form State (Using Date objects now)
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Picker Visibility State
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Initial Load
    useEffect(() => {
        dispatch(fetchCategories());
        dispatch(fetchTimetables()).then((action) => {
             if (fetchTimetables.fulfilled.match(action)) {
                 const activeId = action.payload.find((t: any) => t.isActive)?.id || action.payload[0]?.id;
                 if (activeId) dispatch(fetchTimetableItems(activeId));
             }
        });
        
        // Initialize default times (e.g., next hour)
        const start = new Date();
        start.setMinutes(0);
        start.setSeconds(0);
        start.setHours(start.getHours() + 1);
        setStartTime(start);

        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        setEndTime(end);
    }, []);

    // Helper: Format Date to "HH:mm:ss" for Backend
    const formatTimeForAPI = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
    };

    // Helper: Format Date to "HH:mm" for Display
    const formatTimeForDisplay = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleTimeChange = (event: any, selectedDate?: Date, type?: 'start' | 'end') => {
        if (type === 'start') setShowStartPicker(false);
        if (type === 'end') setShowEndPicker(false);

        if (selectedDate) {
            if (type === 'start') {
                setStartTime(selectedDate);
                // Smart auto-update: Ensure end time is at least 1 hour after start
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
        const startH = parseInt(startTimeStr.split(':')[0]);
        const startM = parseInt(startTimeStr.split(':')[1]);
        const endH = parseInt(endTimeStr.split(':')[0]);
        const endM = parseInt(endTimeStr.split(':')[1]);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = endMinutes - startMinutes;

        return {
            top: startMinutes, 
            height: duration,
        };
    };

    const handleAddItem = () => {
        if (!activeTimetableId || !selectedCategoryId) {
            Alert.alert("Error", "Please select a category.");
            return;
        }
        
        // Convert Date objects to "HH:mm:ss" strings
        const startStr = formatTimeForAPI(startTime);
        const endStr = formatTimeForAPI(endTime);

        if (startStr >= endStr) {
            Alert.alert("Invalid Time", "End time must be after start time.");
            return;
        }

        dispatch(createTimetableItem({
            timetableId: activeTimetableId,
            taskCategoryId: selectedCategoryId,
            dayOfWeek: selectedDay,
            startTime: startStr,
            endTime: endStr,
            isDeleted: false
        })).then(() => {
            setModalVisible(false);
            dispatch(fetchTimetableItems(activeTimetableId));
        });
    };

    const handleDelete = (id: number) => {
        Alert.alert("Delete", "Remove this block?", [
            { text: "Cancel" },
            { text: "Delete", style: 'destructive', onPress: () => dispatch(deleteTimetableItem(id)) }
        ]);
    };

    const daysItems = items.filter(i => i.dayOfWeek === selectedDay && !i.isDeleted);

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={tw`px-6 pt-6 pb-2 bg-white shadow-sm z-10`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                        <Icon name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>Weekly Schedule</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Icon name="plus" size={28} color={colors.primary} />
                    </TouchableOpacity>
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
            </View>

            {/* Timeline ScrollView */}
            <ScrollView style={tw`flex-1`}>
                <View style={[tw`flex-row`, { height: 24 * 60 }]}>
                    {/* Time Column */}
                    <View style={tw`w-16 border-r border-gray-200 bg-gray-50`}>
                        {HOURS.map(h => (
                            <Text key={h} style={[
                                tw`text-xs text-gray-400 absolute w-full text-center`,
                                { top: h * 60 - 6 }
                            ]}>
                                {h}:00
                            </Text>
                        ))}
                    </View>

                    {/* Schedule Grid */}
                    <View style={tw`flex-1 relative`}>
                        {HOURS.map(h => (
                            <View key={h} style={[
                                tw`absolute w-full border-t border-gray-100`,
                                { top: h * 60, height: 1 }
                            ]} />
                        ))}

                        {isLoading ? (
                            <ActivityIndicator style={tw`mt-20`} />
                        ) : (
                            daysItems.map(item => {
                                const pos = getBlockStyle(item.startTime.toString(), item.endTime.toString());
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handleDelete(item.id)}
                                        style={[
                                            tw`absolute left-1 right-1 rounded-md p-2 shadow-sm`,
                                            { 
                                                top: pos.top, 
                                                height: pos.height,
                                                backgroundColor: item.colorHex || colors.card,
                                                borderLeftWidth: 4,
                                                borderLeftColor: colors.primary
                                            }
                                        ]}
                                    >
                                        <Text style={[tw`text-xs font-bold`, { color: colors.text }]} numberOfLines={1}>
                                            {item.taskName || 'Busy'}
                                        </Text>
                                        <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.7 }]}>
                                            {item.startTime.toString().slice(0, 5)} - {item.endTime.toString().slice(0, 5)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Add Item Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                    <View style={tw`bg-white rounded-t-3xl p-6`}>
                        <Text style={tw`text-xl font-bold mb-4 text-gray-800`}>Add Schedule Block</Text>

                        {/* Category Selector */}
                        <Text style={tw`mb-2 text-gray-600`}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-6`}>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedCategoryId(c.id)}
                                    style={[
                                        tw`px-4 py-2 rounded-full mr-2 border`,
                                        selectedCategoryId === c.id 
                                            ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                                            : { borderColor: '#e5e7eb' }
                                    ]}
                                >
                                    <Text style={selectedCategoryId === c.id ? tw`text-white` : tw`text-gray-600`}>
                                        {c.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Time Pickers */}
                        <View style={tw`flex-row justify-between mb-8`}>
                            {/* Start Time */}
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

                            {/* End Time */}
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

                        {/* Native Time Picker Modals */}
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

                        {/* Actions */}
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