import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import tw from 'twrnc';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { logout } from '../slices/auth';

const ProfileScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigation.replace('Login');
  };

  return (
    <ScrollView style={tw`flex-1 bg-white p-6`}>
      <View style={tw`items-center mb-6`}>
        <Image
          source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
          style={tw`w-24 h-24 rounded-full mb-3`}
        />
        <Text style={tw`text-xl font-bold`}>John Doe</Text>
        <Text style={tw`text-gray-500`}>johndoe@example.com</Text>
      </View>

      <TouchableOpacity style={tw`flex-row items-center mb-4`}>
        <Ionicons name="person-outline" size={22} style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center mb-4`}>
        <Ionicons name="key-outline" size={22} style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center mb-4`}>
        <Ionicons name="settings-outline" size={22} style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Account Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={tw`flex-row items-center mt-6`} onPress={handleLogout}>
        <Ionicons name="exit-outline" size={22} style={tw`mr-3`} color="red" />
        <Text style={tw`text-base text-red-500`}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfileScreen;

