// src/screens/SubtypesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchCategories } from '../redux/slices/categories';
import { fetchSubtypes, createSubtype } from '../redux/slices/subtypes';

const SubtypesScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    const { list: categories } = useSelector((state: RootState) => state.categories);
    const { list: subtypes, isLoading } = useSelector((state: RootState) => state.subtypes);

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newSubtypeName, setNewSubtypeName] = useState('');

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

    const handleCreate = () => {
        if (!selectedCategoryId || !newSubtypeName.trim()) return;
        
        dispatch(createSubtype({
            categoryId: selectedCategoryId,
            name: newSubtypeName
        })).then(() => {
            setModalVisible(false);
            setNewSubtypeName('');
        });
    };

    const filteredSubtypes = subtypes.filter(s => s.categoryId === selectedCategoryId);

    return (
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={tw`px-6 pt-6 pb-4 bg-white shadow-sm z-10`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
                        <Icon name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>My Subtypes</Text>
                    <View style={tw`w-6`} />
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
                                <Text style={{ color: isSelected ? '#fff' : colors.text }}>{item.name}</Text>
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
                    contentContainerStyle={tw`p-4`}
                    renderItem={({ item }) => (
                        <View style={[tw`p-4 mb-3 rounded-xl shadow-sm border border-gray-100`, { backgroundColor: colors.card }]}>
                            <Text style={[tw`text-base font-medium`, { color: colors.text }]}>{item.name}</Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={tw`mt-10 items-center`}>
                            <Icon name="tag-off-outline" size={48} color="#e5e7eb" />
                            <Text style={tw`text-gray-400 mt-2`}>No subtypes for this category.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[
                    tw`absolute right-6 bottom-8 w-14 h-14 rounded-full justify-center items-center shadow-lg`,
                    { backgroundColor: colors.primary }
                ]}
                onPress={() => setModalVisible(true)}
            >
                <Icon name="plus" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Add Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-6`}>
                    <View style={tw`bg-white w-full rounded-2xl p-6`}>
                        <Text style={tw`text-xl font-bold mb-4 text-gray-800`}>
                            Add Subtype for {categories.find(c => c.id === selectedCategoryId)?.name}
                        </Text>
                        
                        <TextInput
                            style={tw`border border-gray-300 p-4 rounded-xl text-lg mb-6 text-black`}
                            placeholder="e.g., Homework, Project A"
                            value={newSubtypeName}
                            onChangeText={setNewSubtypeName}
                            autoFocus
                        />

                        <View style={tw`flex-row justify-end`}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`px-6 py-3 mr-2`}>
                                <Text style={tw`text-gray-500 font-bold`}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handleCreate}
                                style={[tw`px-6 py-3 rounded-xl`, { backgroundColor: colors.primary }]}
                            >
                                <Text style={tw`text-white font-bold`}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default SubtypesScreen;