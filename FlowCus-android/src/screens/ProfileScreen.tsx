// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { logout, updateProfileName } from '../redux/slices/auth';
import { AppDispatch, RootState } from '../redux/store';
import { useTheme } from '@react-navigation/native';

const ProfileScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        // Navigation resets automatically via RootNavigator state
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        setIsSaving(true);
        try {
            await dispatch(updateProfileName(newName)).unwrap();
            setEditModalVisible(false);
            Alert.alert("Success", "Profile updated.");
        } catch (error) {
            Alert.alert("Error", "Could not update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <ScrollView style={[tw`flex-1`, { backgroundColor: colors.background }]}>
            {/* Header / Avatar */}
            <View style={tw`items-center py-8 bg-white shadow-sm mb-6`}>
                <View style={[tw`w-24 h-24 rounded-full justify-center items-center mb-4`, { backgroundColor: colors.primary }]}>
                    <Text style={tw`text-4xl text-white font-bold`}>
                        {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>{user.name || "No Name Set"}</Text>
                <Text style={tw`text-gray-500 text-base mb-2`}>@{user.username}</Text>
                
                {/* User Type Badge */}
                <View style={[
                    tw`px-3 py-1 rounded-full`, 
                    { backgroundColor: user.isAdmin ? '#dbeafe' : '#f3f4f6' }
                ]}>
                    <Text style={[
                        tw`text-xs font-bold`, 
                        { color: user.isAdmin ? '#1e40af' : '#4b5563' }
                    ]}>
                        {user.isAdmin ? "ADMINISTRATOR" : "STANDARD USER"}
                    </Text>
                </View>
            </View>

            {/* Menu Options */}
            <View style={tw`px-6`}>
                <TouchableOpacity 
                    style={tw`flex-row items-center py-4 border-b border-gray-100`}
                    onPress={() => {
                        setNewName(user.name || '');
                        setEditModalVisible(true);
                    }}
                >
                    <View style={[tw`p-2 rounded-lg mr-4`, { backgroundColor: '#eff6ff' }]}>
                        <Icon name="account-edit-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={[tw`text-lg flex-1`, { color: colors.text }]}>Edit Name</Text>
                    <Icon name="chevron-right" size={24} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={tw`flex-row items-center py-4 mt-8`} 
                    onPress={handleLogout}
                >
                    <View style={[tw`p-2 rounded-lg mr-4`, { backgroundColor: '#fef2f2' }]}>
                        <Icon name="logout" size={24} color="#ef4444" />
                    </View>
                    <Text style={tw`text-lg flex-1 text-red-500 font-medium`}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Edit Name Modal */}
            <Modal visible={editModalVisible} transparent animationType="fade">
                <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50 px-6`}>
                    <View style={tw`bg-white w-full rounded-2xl p-6`}>
                        <Text style={tw`text-xl font-bold mb-4 text-gray-800`}>Update Profile</Text>
                        
                        <Text style={tw`text-gray-500 mb-2`}>Full Name</Text>
                        <TextInput
                            style={tw`border border-gray-300 p-4 rounded-xl text-lg mb-6 text-black`}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter your name"
                        />

                        <View style={tw`flex-row justify-end`}>
                            <TouchableOpacity 
                                onPress={() => setEditModalVisible(false)} 
                                style={tw`px-6 py-3 mr-2`}
                            >
                                <Text style={tw`text-gray-500 font-bold`}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={handleSaveName}
                                disabled={isSaving}
                                style={[tw`px-6 py-3 rounded-xl`, { backgroundColor: colors.primary }]}
                            >
                                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={tw`text-white font-bold`}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default ProfileScreen;