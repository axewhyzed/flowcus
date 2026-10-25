import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tabs from './BottomMenuNavigator';
import FocusSession from '../../screens/FocusSession';
import TasksScreen from '../../screens/TasksScreen';
import { MainStackParamList } from '../../navigation/types';

const Stack = createNativeStackNavigator<MainStackParamList>();

const StackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={Tabs} />
    <Stack.Screen name="FocusSession" component={FocusSession} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
  </Stack.Navigator>
);

export default StackNavigator;
