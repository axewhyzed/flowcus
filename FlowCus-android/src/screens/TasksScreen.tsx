// src/screens/TasksScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchTasks, createTask, toggleTaskComplete, Task } from '../redux/slices/tasks';
import { fetchCategories, Category } from '../redux/slices/categories';

const TasksScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    // Redux Data
    const { list: tasks, isLoading: tasksLoading } = useSelector((state: RootState) => state.tasks);
    const { list: categories, isLoading: categoriesLoading } = useSelector((state: RootState) => state.categories);

    // Local State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    // Auto-select first category when loaded
    useEffect(() => {
        if (categories.length > 0 && selectedCategoryId === null) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories]);

    const loadData = () => {
        dispatch(fetchTasks());
        dispatch(fetchCategories());
    };

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        if (!selectedCategoryId) {
            console.log("Please select a category first");
            return;
        }

        dispatch(createTask({
            title: newTaskTitle,
            description: '',
            priority: 1,
            isDeleted: false,
            taskCategoryId: selectedCategoryId
        }));
        setNewTaskTitle('');
    };

    // --- Render Components ---

    const renderCategoryChip = ({ item }: { item: Category }) => {
        const isSelected = item.id === selectedCategoryId;
        return (
            <TouchableOpacity
                onPress={() => setSelectedCategoryId(item.id)}
                style={[
                    tw`px-4 py-2 rounded-lg mr-2 border`,
                    {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : '#e5e7eb'
                    }
                ]}
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

    const renderTaskItem = ({ item }: { item: Task }) => (
        <View style={[tw`p-4 mb-3 rounded-xl flex-row items-center justify-between shadow-sm border border-gray-100`, { backgroundColor: colors.card }]}>
            <View style={tw`flex-row items-center flex-1`}>
                <TouchableOpacity onPress={() => dispatch(toggleTaskComplete(item))} style={tw`p-1`}>
                    <Icon
                        name={item.isDeleted ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                        size={26}
                        color={item.isDeleted ? colors.primary : "#9ca3af"}
                    />
                </TouchableOpacity>
                <Text style={[
                    tw`ml-3 text-base flex-1`,
                    { color: colors.text },
                    item.isDeleted && tw`line-through opacity-50 text-gray-400`
                ]}>
                    {item.title}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[tw`flex-1`, { backgroundColor: "#f3f4f6" }]}>
            {/* Header */}
            <View style={[tw`px-6 pt-6 pb-4 bg-white shadow-sm z-10`]}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Tasks</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Category Selector */}
                <View style={tw`h-10`}>
                    {categoriesLoading ? (
                        <Text style={tw`text-gray-400`}>Loading categories...</Text>
                    ) : categories.length === 0 ? (
                        <Text style={tw`text-red-400`}>No categories found. Run SQL setup.</Text>
                    ) : (
                        <FlatList
                            horizontal
                            data={categories}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderCategoryChip}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={tw`pr-4`}
                        />
                    )}
                </View>

                {/* Input Area */}
                <View style={tw`mt-4 flex-row items-center`}>
                    <TextInput
                        style={[tw`flex-1 bg-gray-100 p-3 rounded-l-xl text-base`, { color: colors.text }]}
                        placeholder="What needs to be done?"
                        placeholderTextColor="#9ca3af"
                        value={newTaskTitle}
                        onChangeText={setNewTaskTitle}
                        onSubmitEditing={handleAddTask}
                    />
                    <TouchableOpacity
                        onPress={handleAddTask}
                        style={[tw`p-3 rounded-r-xl justify-center items-center`, { backgroundColor: colors.primary }]}
                    >
                        <Icon name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Task List */}
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.taskId.toString()}
                renderItem={renderTaskItem}
                contentContainerStyle={tw`p-4 pb-20`}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={tasksLoading} onRefresh={loadData} />
                }
                ListEmptyComponent={
                    <View style={tw`mt-10 items-center`}>
                        <Text style={tw`text-gray-400`}>No tasks found</Text>
                    </View>
                }
            />
        </View>
    );
};

export default TasksScreen;