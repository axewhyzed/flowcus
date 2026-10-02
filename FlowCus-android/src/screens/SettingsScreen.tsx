// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { logout } from '../redux/slices/auth';
import { useTheme } from '@react-navigation/native';
import { API_URL } from '@env';

const SettingsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of FlowCus?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => dispatch(logout()) }
      ]
    );
  };

  return (
    <ScrollView style={[tw`flex-1 p-4`, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-6 pt-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mr-3`}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Account Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wider mb-3`}>Account</Text>
        <View style={tw`flex-row items-center justify-between py-2 border-b border-gray-100`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Username</Text>
          <Text style={tw`text-base text-gray-500 font-medium`}>@{user?.username}</Text>
        </View>
        <View style={tw`flex-row items-center justify-between py-2 border-b border-gray-100`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Display Name</Text>
          <Text style={tw`text-base text-gray-500 font-medium`}>{user?.name || "Not set"}</Text>
        </View>
        <View style={tw`flex-row items-center justify-between py-2`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Role</Text>
          <Text style={tw`text-base text-blue-600 font-bold`}>{user?.isAdmin ? "Admin" : "Standard"}</Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wider mb-3`}>Preferences</Text>
        
        <View style={tw`flex-row items-center justify-between py-2 border-b border-gray-100`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="bell-outline" size={22} color={colors.primary} style={tw`mr-3`} />
            <Text style={[tw`text-base`, { color: colors.text }]}>Session Alerts</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={tw`flex-row items-center justify-between py-2`}>
          <View style={tw`flex-row items-center`}>
            <Icon name="vibrate" size={22} color={colors.primary} style={tw`mr-3`} />
            <Text style={[tw`text-base`, { color: colors.text }]}>Haptic Feedback</Text>
          </View>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            thumbColor={hapticEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Connection Section */}
      <View style={[tw`p-4 rounded-xl mb-4 border border-gray-100 shadow-sm`, { backgroundColor: colors.card }]}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wider mb-3`}>Connection</Text>
        <View style={tw`flex-row items-center justify-between py-2`}>
          <Text style={[tw`text-base`, { color: colors.text }]}>Backend Server</Text>
          <Text style={tw`text-xs text-gray-500 font-mono`} numberOfLines={1}>{API_URL || 'Local / Production API'}</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[tw`flex-row items-center justify-center p-4 rounded-xl mt-4 bg-red-50 border border-red-200`]}
      >
        <Icon name="logout" size={22} color="#ef4444" style={tw`mr-2`} />
        <Text style={tw`text-base font-bold text-red-600`}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
