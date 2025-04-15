import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Text, TouchableOpacity, View } from 'react-native';
import colors from './src/config/colors';
import HomeScreen from './src/screens/HomeScreen';
import AboutScreen from './src/screens/AboutScreen';
import ContactScreen from './src/screens/ContactScreen';
import TasksScreen from './src/screens/TasksScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Placeholder screen
const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>⚙️ Settings Screen</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const Tabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.text,
      tabBarStyle: { backgroundColor: colors.surface },
      tabBarLabel: ({ color, focused }) => (
        <Text style={{
          color,
          fontSize: focused ? 12 : 10,
          marginBottom: 3
        }}>
          {focused ? 'Selected' : 'Tab'}
        </Text>
      )
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Icon name="home" color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="About"
      component={AboutScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'About',
        tabBarIcon: ({ color }) => <Icon name="info" color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="Contact"
      component={ContactScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'Contact',
        tabBarIcon: ({ color }) => <Icon name="phone" color={color} size={24} />,
      }}
    />
  </Tab.Navigator>
);


// Bottom Tabs Navigator
const BottomTabs = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={Tabs} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
  </Stack.Navigator>
);

// Drawer Navigator
const DrawerNavigator = () => (
  <Drawer.Navigator
    screenOptions={({ navigation }) => ({
      headerShown: true,  // Keep header visible
      headerTitle: 'Flowcus',    // Remove title text
      animation: 'slide_from_right',
      headerStyle: {
        backgroundColor: 'transparent',
        elevation: 0,      // Remove shadow on Android
        shadowOpacity: 0,  // Remove shadow on iOS
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Icon name="bars" size={24} color={colors.primary} style={{ marginLeft: 15 }} />
        </TouchableOpacity>
      ),
    })}
  >
    <Drawer.Screen
      name="Main"
      component={BottomTabs}
      options={{
        drawerLabel: 'Home',
        drawerIcon: ({ color }) => <Icon name="home" color={color} size={20} />,
      }}
    />
    <Drawer.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        drawerLabel: 'Settings',
        drawerIcon: ({ color }) => <Icon name="cog" color={color} size={20} />,
      }}
    />
  </Drawer.Navigator>
);

export default function App() {
  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
}