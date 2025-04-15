import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TasksScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    
    const tasks = [
        { id: '1', title: 'Complete project proposal', completed: false },
        { id: '2', title: 'Review analytics dashboard', completed: true },
        { id: '3', title: 'Prepare for team meeting', completed: false },
        { id: '4', title: 'Fix UI bugs', completed: false },
    ];

    return (
        <View style={[tw`flex-1 p-4`, { backgroundColor: colors.background }]}>
            <Text style={[tw`text-2xl font-bold mb-6`, { color: colors.text }]}>
                My Tasks
            </Text>
            
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        tw`flex-row items-center p-4 mb-3 rounded-lg`,
                        { backgroundColor: colors.card }
                    ]}>
                        <TouchableOpacity>
                            <Icon 
                                name={item.completed ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                                size={24} 
                                color={item.completed ? colors.primary : colors.text} 
                            />
                        </TouchableOpacity>
                        <Text style={[
                            tw`ml-3 flex-1`,
                            { 
                                color: colors.text,
                                textDecorationLine: item.completed ? 'line-through' : 'none',
                                opacity: item.completed ? 0.6 : 1
                            }
                        ]}>
                            {item.title}
                        </Text>
                        <Icon name="dots-vertical" size={20} color={colors.text} />
                    </View>
                )}
            />
            
            <TouchableOpacity
                style={[
                    tw`absolute right-6 bottom-6 w-14 h-14 rounded-full justify-center items-center`,
                    { backgroundColor: colors.primary }
                ]}
                onPress={() => navigation.navigate('AddTask')}
            >
                <Icon name="plus" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

export default TasksScreen;