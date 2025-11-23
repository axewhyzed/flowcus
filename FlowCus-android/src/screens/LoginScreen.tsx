// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../redux/slices/auth';
import { AppDispatch, RootState } from '../redux/store';

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error);
      dispatch(clearError());
    }
    // If authenticated, navigation is usually handled by the RootNavigator 
    // switching stacks, but explicit nav is fine too.
  }, [error, isAuthenticated]);

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    dispatch(login({ username, password }));
  };

  return (
    <View style={tw`flex-1 justify-center px-6 bg-white`}>
      <Text style={tw`text-3xl font-bold text-center mb-8 text-gray-800`}>
        Welcome Back!
      </Text>

      <View style={tw`mb-4`}>
        <Text style={tw`text-gray-600 mb-2 font-medium`}>Username</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-xl text-lg text-black`}
          placeholder="Enter your username"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={tw`mb-8`}>
        <Text style={tw`text-gray-600 mb-2 font-medium`}>Password</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-xl text-lg text-black`}
          placeholder="Enter your password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={tw`bg-blue-600 p-4 rounded-xl items-center shadow-lg`}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-lg font-bold`}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={tw`flex-row justify-center mt-6`}>
        <Text style={tw`text-gray-600`}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={tw`text-blue-600 font-bold`}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;