import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import tw from 'twrnc';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/auth'; // Adjust the path as necessary

const LoginScreen = () => {
    const dispatch = useDispatch();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter both username and password.');
            return;
        }

        setLoading(true);

        // Hardcoded credentials
        const validUsername = 'admin';
        const validPassword = 'mihir';

        // Simulate authentication process
        setTimeout(() => {
            if (username === validUsername && password === validPassword) {
                dispatch(login({ username }));
            } else {
                Alert.alert('Invalid Credentials', 'The username or password is incorrect.');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <View style={tw`flex-1 justify-center items-center bg-white px-6`}>
            <Text style={tw`text-2xl font-bold mb-6`}>Welcome Back</Text>

            <View style={tw`w-full mb-4`}>
                <Text style={tw`text-gray-700 mb-1`}>Username</Text>
                <TextInput
                    style={tw`w-full border border-gray-300 rounded px-4 py-2`}
                    placeholder="Enter your username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
            </View>

            <View style={tw`w-full mb-6`}>
                <Text style={tw`text-gray-700 mb-1`}>Password</Text>
                <TextInput
                    style={tw`w-full border border-gray-300 rounded px-4 py-2 text-black`}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    autoCapitalize="none"
                />
            </View>


            <TouchableOpacity
                style={tw`w-full bg-blue-500 rounded py-3`}
                onPress={handleLogin}
                disabled={loading}
            >
                <Text style={tw`text-white text-center text-lg`}>
                    {loading ? 'Logging in...' : 'Login'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
