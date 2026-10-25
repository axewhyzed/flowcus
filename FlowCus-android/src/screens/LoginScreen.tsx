// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../redux/slices/auth';
import { AppDispatch, RootState } from '../redux/store';
import { useTheme } from '@react-navigation/native';

const LoginScreen = () => {
  const { colors } = useTheme();
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[tw`flex-grow justify-center px-6 py-8`, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <Text style={[tw`text-3xl font-bold text-center mb-8`, { color: colors.text }]}>
        Welcome Back!
      </Text>

      <View style={tw`mb-4`}>
        <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Username</Text>
        <TextInput
          style={[tw`border p-4 rounded-xl text-lg`, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Enter your username"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          accessibilityLabel="Username"
        />
      </View>

      <View style={tw`mb-8`}>
        <Text style={[tw`mb-2 font-medium`, { color: colors.text }]}>Password</Text>
        <TextInput
          style={[tw`border p-4 rounded-xl text-lg`, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Enter your password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
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

      <Text style={[tw`text-center mt-6`, { color: colors.text, opacity: 0.8 }]} accessibilityRole="text">
        Need an account? Contact your administrator.
      </Text>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
