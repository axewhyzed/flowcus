// src/screens/TasksScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTasks, createTask, toggleTaskComplete, deleteTask, Task } from '../redux/slices/tasks';
import { fetchCategories, Category } from '../redux/slices/categories';
import * as chrono from 'chrono-node';
import { TasksScreenProps } from '../navigation/types';
import { filterVisibleTasks } from './taskFilters';

interface ParsedDraft {
    cleanTitle: string;
    dateText: string | null;
    startDate: Date | null;
    endDate: Date | null;
    categoryTag: string | null;
    priority: number | null;
}

const TasksScreen = ({ navigation }: TasksScreenProps) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    // Redux Data
    const { list: tasks, isLoading: tasksLoading, error: tasksError } = useSelector((state: RootState) => state.tasks);
    const { list: categories, isLoading: categoriesLoading } = useSelector((state: RootState) => state.categories);

    // Local State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [parsedDraft, setParsedDraft] = useState<ParsedDraft | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
    const draftVersion = useRef(0);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchTasks());
        dispatch(fetchCategories());
    };

    // Real-time NLP parsing
    const handleTextChange = (text: string) => {
        draftVersion.current += 1;
        setNewTaskTitle(text);
        if (!text.trim()) {
            setParsedDraft(null);
            return;
        }

        let workingText = text.trim();
        let categoryTag: string | null = null;
        let priority: number | null = null;

        // 1. Tag #category
        const catMatch = workingText.match(/#([a-zA-Z0-9_-]+)/);
        if (catMatch) {
            categoryTag = catMatch[1].toLowerCase();
            workingText = workingText.replace(catMatch[0], ' ');
        }

        // 2. Priority p1-p5 or !high
        const prioMatch = workingText.match(/\b(?:p([1-5])|!(high|med|medium|low))\b/i);
        if (prioMatch) {
            if (prioMatch[1]) {
                priority = parseInt(prioMatch[1], 10);
            } else if (prioMatch[2]) {
                const val = prioMatch[2].toLowerCase();
                if (val === 'high') priority = 1;
                else if (val === 'med' || val === 'medium') priority = 3;
                else if (val === 'low') priority = 5;
            }
            workingText = workingText.replace(prioMatch[0], ' ');
        }

        // 3. Chrono parse
        const parsed = chrono.parse(workingText);
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        let dateText: string | null = null;

        if (parsed.length > 0) {
            const first = parsed[0];
            startDate = first.start.date();
            if (first.end) {
                endDate = first.end.date();
            } else {
                endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
            }
            dateText = first.text;
            workingText = workingText.replace(first.text, ' ');
        }

        const cleanTitle = workingText.replace(/\s+/g, ' ').trim();

        setParsedDraft({
            cleanTitle: cleanTitle || text.trim(),
            dateText,
            startDate,
            endDate,
            categoryTag,
            priority
        });
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        const submittedDraftVersion = draftVersion.current;

        let categoryId = selectedCategoryId;
        let titleToUse = newTaskTitle.trim();
        let prio = 3;
        let startISO: string | undefined = undefined;
        let endISO: string | undefined = undefined;

        if (parsedDraft && parsedDraft.cleanTitle) {
            titleToUse = parsedDraft.cleanTitle;
            if (parsedDraft.priority) prio = parsedDraft.priority;
            if (parsedDraft.startDate) startISO = parsedDraft.startDate.toISOString();
            if (parsedDraft.endDate) endISO = parsedDraft.endDate.toISOString();

            if (parsedDraft.categoryTag) {
                const found = categories.find(c => 
                    c.name.toLowerCase().includes(parsedDraft.categoryTag!) ||
                    parsedDraft.categoryTag!.includes(c.name.toLowerCase())
                );
                if (found) categoryId = found.id;
            }
        }

        if (!categoryId && categories.length > 0) {
            categoryId = categories[0].id;
        }

        if (!categoryId) {
            Alert.alert("Notice", "Please select a category first.");
            return;
        }

        try {
            await dispatch(createTask({
                title: titleToUse,
                description: '',
                priority: prio,
                startTime: startISO,
                endTime: endISO,
                isCompleted: false,
                isDeleted: false,
                taskCategoryId: categoryId
            })).unwrap();
            if (draftVersion.current === submittedDraftVersion) {
                setNewTaskTitle('');
                setParsedDraft(null);
            }
        } catch (error: unknown) {
            Alert.alert('Task not saved', error instanceof Error ? error.message : 'Check your connection and try again. Your draft is still here.');
        }
    };

    const handleDeleteTask = (task: Task) => {
        Alert.alert(
            "Delete Task",
            `Are you sure you want to delete "${task.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: async () => {
                    try { await dispatch(deleteTask(task.taskId)).unwrap(); }
                    catch { Alert.alert('Task not deleted', 'Check your connection and try again.'); }
                } }
            ]
        );
    };

    // Filter tasks based on status and category
    const filteredTasks = filterVisibleTasks(tasks, selectedCategoryId, filterStatus);

    const getCategoryName = (catId: number) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.name || 'General';
    };

    const renderCategoryChip = ({ item }: { item: Category }) => {
        const isSelected = item.id === selectedCategoryId;
        return (
            <TouchableOpacity
                onPress={() => setSelectedCategoryId(item.id)}
                style={[
                    tw`px-4 py-2 rounded-lg mr-2 border min-h-10 justify-center`,
                    {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : '#e5e7eb'
                    }
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filter by ${item.name}`}
            >
                <Text style={[
                    tw`text-sm font-medium`,
                    { color: isSelected ? '#fff' : colors.text }
                ]}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderTaskItem = ({ item }: { item: Task }) => {
        const isDone = !!item.isCompleted;
        return (
            <View style={[
                tw`p-4 mb-3 rounded-xl flex-row items-center justify-between shadow-sm border border-gray-100`,
                { backgroundColor: colors.card },
                isDone && tw`opacity-70`
            ]}>
                <View style={tw`flex-row items-center flex-1`}>
                    <TouchableOpacity
                        onPress={async () => {
                            try { await dispatch(toggleTaskComplete(item)).unwrap(); }
                            catch { Alert.alert('Task not updated', 'Check your connection and try again.'); }
                        }}
                        style={tw`p-2 min-w-11 min-h-11 items-center justify-center`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isDone }}
                        accessibilityLabel={`${isDone ? 'Mark incomplete' : 'Complete'} ${item.title}`}
                    >
                        <Icon
                            name={isDone ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                            size={26}
                            color={isDone ? "#10b981" : "#9ca3af"}
                        />
                    </TouchableOpacity>
                    <View style={tw`ml-3 flex-1`}>
                        <Text style={[
                            tw`text-base font-medium`,
                            { color: colors.text },
                            isDone && tw`line-through`
                        ]}>
                            {item.title}
                        </Text>
                        <View style={tw`flex-row items-center mt-1 flex-wrap gap-1`}>
                            <Text style={[tw`text-xs px-2 py-0.5 rounded-full mr-1`, { color: colors.primary, backgroundColor: colors.background }]}>
                                {getCategoryName(item.taskCategoryId)}
                            </Text>
                            {item.priority && (
                                <Text style={[tw`text-xs px-2 py-0.5 rounded-full mr-1`, { color: colors.text, backgroundColor: colors.background }]}>
                                    P{item.priority}
                                </Text>
                            )}
                            {item.startTime && (
                                <Text style={[tw`text-xs px-2 py-0.5 rounded-full`, { color: colors.text, backgroundColor: colors.background }]}>
                                    {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Quick Actions: Focus Timer & Delete */}
                <View style={tw`flex-row items-center ml-2`}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('FocusSession', { taskName: item.title, taskCategoryId: item.taskCategoryId })}
                        style={[tw`p-2 min-w-11 min-h-11 rounded-lg mr-1.5 items-center justify-center`, { backgroundColor: colors.background }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Start focus timer for ${item.title}`}
                    >
                        <Icon name="play" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDeleteTask(item)} style={tw`p-2 min-w-11 min-h-11 items-center justify-center`} accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`}>
                        <Icon name="trash-can-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[tw`px-6 pt-6 pb-4 shadow-sm z-10`, { backgroundColor: colors.card }]}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <View>
                        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Tasks</Text>
                        <Text style={[tw`text-xs`, { color: colors.text, opacity: 0.75 }]}>{filteredTasks.length} tasks in view</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close tasks">
                        <Icon name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Category Selector */}
                <View style={tw`h-10`}>
                    {categoriesLoading ? (
                        <Text style={{ color: colors.text }}>Loading categories...</Text>
                    ) : categories.length === 0 ? (
                        <Text style={tw`text-red-400`}>No categories found.</Text>
                    ) : (
                        <View style={tw`flex-row items-center`}>
                            <TouchableOpacity
                                onPress={() => setSelectedCategoryId(null)}
                                style={[
                                    tw`px-4 py-2 rounded-lg mr-2 border min-h-10 justify-center`,
                                    {
                                        backgroundColor: selectedCategoryId === null ? colors.primary : colors.card,
                                        borderColor: selectedCategoryId === null ? colors.primary : '#e5e7eb',
                                    },
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: selectedCategoryId === null }}
                                accessibilityLabel="Show all categories"
                            >
                                <Text style={{ color: selectedCategoryId === null ? '#fff' : colors.text, fontWeight: '600' }}>All</Text>
                            </TouchableOpacity>
                            <FlatList
                                horizontal
                                style={tw`flex-1`}
                                data={categories}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderCategoryChip}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`pr-4`}
                            />
                        </View>
                    )}
                </View>

                {/* Status Filter Tabs */}
                <View style={[tw`flex-row mt-3 p-1 rounded-lg`, { backgroundColor: colors.background }]}>
                    {(['all', 'active', 'completed'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setFilterStatus(tab)}
                            accessibilityRole="tab"
                            accessibilityLabel={`${tab[0].toUpperCase()}${tab.slice(1)} tasks`}
                            accessibilityState={{ selected: filterStatus === tab }}
                            style={[
                                tw`flex-1 min-h-11 py-1.5 rounded-md items-center justify-center`,
                                filterStatus === tab && [tw`shadow-sm`, { backgroundColor: colors.card }]
                            ]}
                        >
                            <Text style={[
                                tw`text-xs font-semibold capitalize`,
                                { color: filterStatus === tab ? colors.primary : colors.text, opacity: filterStatus === tab ? 1 : 0.75 }
                            ]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Natural Language Quick-Add Input */}
                <View style={tw`mt-4 flex-row items-center`}>
                    <TextInput
                        style={[tw`flex-1 p-3 rounded-l-xl text-base`, { color: colors.text, backgroundColor: colors.card }]}
                        accessibilityLabel="New task title"
                        placeholder="Try 'Review code tomorrow 3pm #work p1'"
                        placeholderTextColor="#9ca3af"
                        value={newTaskTitle}
                        onChangeText={handleTextChange}
                        onSubmitEditing={handleAddTask}
                    />
                    <TouchableOpacity
                        onPress={handleAddTask}
                        style={[tw`p-3.5 rounded-r-xl justify-center items-center`, { backgroundColor: colors.primary }]}
                        accessibilityRole="button"
                        accessibilityLabel="Add task"
                    >
                        <Icon name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* NLP Parsed Draft Preview Pills */}
                {parsedDraft && parsedDraft.cleanTitle && (
                    <View style={tw`flex-row flex-wrap items-center mt-2.5 pt-2 border-t border-gray-100 gap-1.5`}>
                        <Text style={[tw`text-xs mr-1`, { color: colors.text }]}>Parsed:</Text>
                        <View style={[tw`px-2 py-0.5 rounded-md border`, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>{parsedDraft.cleanTitle}</Text>
                        </View>
                        {parsedDraft.dateText && (
                            <View style={[tw`px-2 py-0.5 rounded-md border`, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>{parsedDraft.dateText}</Text>
                            </View>
                        )}
                        {parsedDraft.categoryTag && (
                            <View style={[tw`px-2 py-0.5 rounded-md border`, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>#{parsedDraft.categoryTag}</Text>
                            </View>
                        )}
                        {parsedDraft.priority && (
                            <View style={[tw`px-2 py-0.5 rounded-md border`, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>P{parsedDraft.priority}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Task List */}
            {tasksError && tasks.length > 0 && (
                <View style={[tw`mx-4 mt-3 p-3 rounded-xl border`, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole="alert">
                    <Text style={{ color: colors.text }}>Could not refresh tasks. Your last loaded list is still shown.</Text>
                    <TouchableOpacity onPress={loadData} style={tw`min-h-11 justify-center`} accessibilityRole="button" accessibilityLabel="Retry refreshing tasks">
                        <Text style={{ color: colors.primary }}>Try again</Text>
                    </TouchableOpacity>
                </View>
            )}
            <FlatList
                data={filteredTasks}
                keyExtractor={(item) => item.taskId.toString()}
                renderItem={renderTaskItem}
                contentContainerStyle={tw`p-4 pb-20`}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={tasksLoading} onRefresh={loadData} />
                }
                ListEmptyComponent={
                    <View style={tw`mt-10 items-center`}>
                        {tasksLoading ? (
                            <>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={[tw`mt-2`, { color: colors.text }]} accessibilityLiveRegion="polite">Loading tasks…</Text>
                            </>
                        ) : tasksError ? (
                            <>
                                <Icon name="alert-circle-outline" size={42} color={colors.primary} />
                                <Text style={[tw`mt-2 text-center`, { color: colors.text }]} accessibilityRole="alert">Tasks could not be loaded.</Text>
                                <TouchableOpacity onPress={loadData} style={tw`min-h-11 justify-center`} accessibilityRole="button" accessibilityLabel="Retry loading tasks">
                                    <Text style={{ color: colors.primary }}>Try again</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Icon name="clipboard-check-outline" size={48} color={colors.border} />
                                <Text style={[tw`mt-2`, { color: colors.text }]}>{tasks.length === 0 ? 'No tasks yet' : 'No tasks in this view'}</Text>
                            </>
                        )}
                    </View>
                }
            />
        </View>
    );
};

export default TasksScreen;
