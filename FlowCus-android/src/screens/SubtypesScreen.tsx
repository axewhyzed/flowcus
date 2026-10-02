// src/screens/SubtypesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchCategories } from '../redux/slices/categories';
import { fetchSubtypes, createSubtype, deleteSubtype, Subtype } from '../redux/slices/subtypes';

const MAX_SUBTYPES = 5;

const SubtypesScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    const { list: categories } = useSelector((state: RootState) => state.categories);
    const { list: subtypes, isLoading } = useSelector((state: RootState) => state.subtypes);

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newSubtypeName, setNewSubtypeName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        dispatch(fetchCategories());
        dispatch(fetchSubtypes());
    }, []);

    // Set default category
    useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories]);

    const handleOpenModal = () => {
        if (subtypes.length >= MAX_SUBTYPES) {
            Alert.alert("Limit Reached", `You can have at most ${MAX_SUBTYPES} active subtypes. Please delete one before creating another.`);
            return;
        }
        setModalVisible(true);
    };

    const handleCreate = async () => {
        if (!selectedCategoryId || !newSubtypeName.trim()) return;
        
        setIsSubmitting(true);
        try {
            const resultAction = await dispatch(createSubtype({
                categoryId: selectedCategoryId,
                name: newSubtypeName.trim()
            }));

            if (createSubtype.fulfilled.match(resultAction)) {
                setModalVisible(false);
                setNewSubtypeName('');
            } else if (createSubtype.rejected.match(resultAction)) {
                Alert.alert("Error", String(resultAction.payload || "Failed to create subtype"));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (item: Subtype) => {
        Alert.alert(
            "Delete Subtype",
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const result = await dispatch(deleteSubtype(item.id));
                        if (deleteSubtype.rejected.match(result)) {
                            Alert.alert("Error", String(result.payload || "Failed to delete subtype"));
                        }
                    }
                }
            ]
        );
    };

    const filteredSubtypes = subtypes.filter(s => s.categoryId === selectedCategoryId);

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={tw`px-6 pt-6 pb-4 bg-white shadow-sm z-10`}>
                <View style={tw`flex-row justify-between items-center mb-3`}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                        <Icon name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>My Subtypes</Text>
                    <View style={tw`px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200`}>
                        <Text style={tw`text-xs font-bold text-blue-700`}>
                            {subtypes.length}/{MAX_SUBTYPES} Used
                        </Text>
                    </View>
                </View>

                {/* Category Chips */}
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`pb-2`}
                    renderItem={({ item }) => {
                        const isSelected = selectedCategoryId === item.id;
                        return (
                            <TouchableOpacity
                                onPress={() => setSelectedCategoryId(item.id)}
                                style={[
                                    tw`px-4 py-2 rounded-full mr-2 border`,
                                    { 
                                        backgroundColor: isSelected ? colors.primary : 'transparent',
                                        borderColor: isSelected ? colors.primary : '#e5e7eb'
                                    }
                                ]}
                            >
                                <Text style={{ color: isSelected ? '#fff' : colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Subtypes List */}
            {isLoading && subtypes.length === 0 ? (
                <ActivityIndicator style={tw`mt-10`} color={colors.primary} />
            ) : (
                <FlatList
                    data={filteredSubtypes}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={tw`p-4 pb-24`}
                    renderItem={({ item }) => (
                        <View style={[
                            tw`p-4 mb-3 rounded-xl shadow-sm border border-gray-100 flex-row items-center justify-between`,
                            { backgroundColor: colors.card }
                        ]}>
                            <View style={tw`flex-row items-center flex-1`}>
                                <View style={[
                                    tw`w-3 h-3 rounded-full mr-3`,
                                    { backgroundColor: item.colorHex || colors.primary }
                                ]} />
                                <Text style={[tw`text-base font-medium flex-1`, { color: colors.text }]}>
                                    {item.name}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => handleDelete(item)} style={tw`p-2`}>
                                <Icon name="trash-can-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={tw`mt-10 items-center`}>
                            <Icon name="tag-off-outline" size={48} color="#d1d5db" />
                            <Text style={tw`text-gray-400 mt-2`}>No subtypes for this category.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[
                    tw`absolute right-6 bottom-8 w-14 h-14 rounded-full justify-center items-center shadow-lg`,
                    { backgroundColor: subtypes.length >= MAX_SUBTYPES ? '#9ca3af' : colors.primary }
                ]}
                onPress={handleOpenModal}
            >
                <Icon name="plus" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-6`}>
                    <View style={tw`bg-white w-full rounded-2xl p-6`}>
                        <Text style={tw`text-xl font-bold mb-2 text-gray-800`}>
                            Add Subtype
                        </Text>
                        <Text style={tw`text-sm text-gray-500 mb-4`}>
                            For {categories.find(c => c.id === selectedCategoryId)?.name || 'category'} (Limit: {subtypes.length}/{MAX_SUBTYPES})
                        </Text>
                        
                        <TextInput
                            style={tw`border border-gray-300 p-4 rounded-xl text-base mb-6 text-black`}
                            placeholder="e.g., Coding, Homework, Cardio"
                            placeholderTextColor="#9ca3af"
                            value={newSubtypeName}
                            onChangeText={setNewSubtypeName}
                            autoFocus
                        />

                        <View style={tw`flex-row justify-end`}>
                            <TouchableOpacity 
                                onPress={() => setModalVisible(false)} 
                                style={tw`px-6 py-3 mr-2`}
                                disabled={isSubmitting}
                            >
                                <Text style={tw`text-gray-500 font-bold`}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handleCreate}
                                disabled={isSubmitting || !newSubtypeName.trim()}
                                style={[
                                    tw`px-6 py-3 rounded-xl flex-row items-center`,
                                    { backgroundColor: colors.primary, opacity: isSubmitting || !newSubtypeName.trim() ? 0.6 : 1 }
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={tw`text-white font-bold`}>Add</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default SubtypesScreen;