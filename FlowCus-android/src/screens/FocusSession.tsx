import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import tw from 'twrnc';

const FocusSession = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [inputMinutes, setInputMinutes] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isRunning && secondsLeft > 0) {
            timer = setInterval(() => {
                setSecondsLeft(prev => prev - 1);
            }, 1000);
        } else if (secondsLeft === 0 && isRunning) {
            setIsRunning(false);
            navigation.goBack(); // Or show alert
        }

        return () => clearInterval(timer);
    }, [isRunning, secondsLeft]);

    const startTimer = () => {
        const minutes = parseInt(inputMinutes);
        if (!isNaN(minutes) && minutes > 0) {
            setSecondsLeft(minutes * 60);
            setIsRunning(true);
        }
    };

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isRunning ? (
                <View style={tw`items-center`}>
                    <Text style={[tw`text-5xl font-bold`, { color: colors.primary }]}>
                        {formatTime(secondsLeft)}
                    </Text>
                    <Text style={[tw`mt-4 text-lg`, { color: colors.text }]}>
                        Focus time in progress...
                    </Text>
                </View>
            ) : (
                <View style={tw`items-center`}>
                    <Text style={[tw`text-xl mb-4`, { color: colors.text }]}>Enter focus time (minutes)</Text>
                    <TextInput
                        value={inputMinutes}
                        onChangeText={setInputMinutes}
                        keyboardType="numeric"
                        placeholder="25"
                        style={[
                            tw`w-32 h-12 border text-center rounded-lg mb-4`,
                            { borderColor: colors.border, color: colors.text }
                        ]}
                    />
                    <TouchableOpacity
                        onPress={startTimer}
                        style={[tw`px-6 py-3 rounded-full`, { backgroundColor: colors.primary }]}
                    >
                        <Text style={tw`text-white font-semibold`}>Start Focus</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
});

export default FocusSession;
