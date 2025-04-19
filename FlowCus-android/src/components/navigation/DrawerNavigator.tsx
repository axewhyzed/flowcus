import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import BottomTabsNavigator from './StackNavigator';
import SettingsScreen from '../../screens/SettingsScreen';
import colors from '../../config/colors';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => (
  <Drawer.Navigator
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
