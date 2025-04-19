import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tabs from './BottomMenuNavigator';
import ProfileScreen from '../../screens/ProfileScreen';
import FocusSession from '../../screens/FocusSession';
import TasksScreen from '../../screens/TasksScreen';
import AnalyticsScreen from '../../screens/AnalyticsScreen';

const Stack = createNativeStackNavigator();

const StackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={Tabs} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="FocusSession" component={FocusSession} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
  </Stack.Navigator>
);

export default StackNavigator;
