import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import tw from 'twrnc';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SettingsScreen = ({ navigation }: any) => {
  return (
    <ScrollView style={tw`flex-1 bg-white p-4`}>
      <Text style={tw`text-2xl font-bold mb-6 text-blue-600`}>Settings</Text>

      <TouchableOpacity style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="notifications-outline" size={22} style={tw`mr-3`} />
          <Text style={tw`text-base text-gray-700`}>Notifications</Text>
        </View>
        <Switch />
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="lock-closed-outline" size={22} style={tw`mr-3`} />
          <Text style={tw`text-base text-gray-700`}>Privacy</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="color-palette-outline" size={22} style={tw`mr-3`} />
          <Text style={tw`text-base text-gray-700`}>Appearance</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center justify-between mt-6`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="log-out-outline" size={22} style={tw`mr-3`} />
          <Text style={tw`text-base text-red-500`}>Logout</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
