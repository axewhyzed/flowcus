// src/components/navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomTabsNavigator from './StackNavigator';
import TimetableScreen from '../../screens/TimetableScreen';
import SubtypesScreen from '../../screens/SubtypesScreen'; // <--- NEW IMPORT
import ProfileScreen from '../../screens/ProfileScreen';   // <--- Link Profile Directly in Drawer? 
// Or usually Profile is accessed via header, but we can put it here too.

import colors from '../../config/colors';
import FcCard from '../design/FcCard';
import tw from 'twrnc';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <DrawerContentScrollView {...props} contentContainerStyle={tw`pt-0`}>
        <View style={tw`px-4 pt-4`}>
          <FcCard showDivider={false} containerStyle={tw`mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>Flowcus</Text>
            <Text style={tw`text-sm text-gray-500`}>@flowcus</Text>
          </FcCard>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
    )}
    screenOptions={{
      headerShown: false,
      drawerActiveTintColor: colors.primary,
    }}
  >
    <Drawer.Screen 
        name="Dashboard" 
        component={BottomTabsNavigator} 
        options={{ drawerIcon: ({color}) => <Icon name="view-dashboard" size={22} color={color} /> }}
    />
    <Drawer.Screen 
        name="Timetable" 
        component={TimetableScreen} 
        options={{ drawerIcon: ({color}) => <Icon name="calendar-clock" size={22} color={color} /> }}
    />
    <Drawer.Screen 
        name="Subtypes" 
        component={SubtypesScreen} // <--- NEW
        options={{ drawerIcon: ({color}) => <Icon name="tag-multiple" size={22} color={color} /> }}
    />
    <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ drawerIcon: ({color}) => <Icon name="account" size={22} color={color} /> }}
    />
  </Drawer.Navigator>
);

export default DrawerNavigator;