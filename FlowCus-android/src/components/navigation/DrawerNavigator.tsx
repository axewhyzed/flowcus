import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import BottomTabsNavigator from './StackNavigator';
import SettingsScreen from '../../screens/SettingsScreen';
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
          <Text style={tw`mt-2 text-sm text-gray-600`}>v1.0.0</Text>
        </FcCard>
      </View>

      {/* 🔽 Navigation links */}
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  )}
    screenOptions={({ navigation }) => ({
      headerShown: true,
      headerTitle: '',
      animation: 'slide_from_right',
      headerStyle: {
        backgroundColor: 'transparent',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Icon name="bars" size={24} color={colors.primary} style={{ marginLeft: 15 }} />
        </TouchableOpacity>
      ),
    })}
  >
    <Drawer.Screen name="Main" component={BottomTabsNavigator} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
  </Drawer.Navigator>
);

export default DrawerNavigator;
