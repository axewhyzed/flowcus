import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Text, TouchableOpacity, Animated, TouchableWithoutFeedback } from 'react-native';
import colors from './src/config/colors';
import tw from 'twrnc';
import HomeScreen from './src/screens/HomeScreen';
import AboutScreen from './src/screens/AboutScreen';
import ContactScreen from './src/screens/ContactScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TasksScreen from './src/screens/TasksScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FocusSession from './src/screens/FocusSession';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

type TabIconProps = {
  name: string;
  color: string;
  focused: boolean;
};

const AnimatedTabIcon: React.FC<TabIconProps> = ({ name, color, focused }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [focused]);

  return (
    <Animated.View
      style={[
        tw`flex-1 justify-center items-center`, // ensure it fills and centers
        { transform: [{ scale }] },
      ]}
    >
      <Icon name={name} size={22} color={color} />
    </Animated.View>
  );
};

const Tabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: false,  // Explicitly remove the labels
      tabBarStyle: [
        tw`absolute bottom-8 mx-8 h-12 rounded-full bg-white shadow-lg border border-gray-200`,
        {
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
      ],
      tabBarIcon: ({ color, focused }) => {
        let iconName = '';
        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'About':
            iconName = 'info';
            break;
          case 'Contact':
            iconName = 'phone';
            break;
        }

        return <AnimatedTabIcon name={iconName} color={colors.text} focused={focused} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#A0A0A0',
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="About" component={AboutScreen} />
    <Tab.Screen name="Contact" component={ContactScreen} />
  </Tab.Navigator>
);

// Bottom Tabs Navigator
const BottomTabs = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={Tabs} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="FocusSession" component={FocusSession} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
  </Stack.Navigator>
);

// Drawer Navigator
const DrawerNavigator = () => (
  <Drawer.Navigator
    screenOptions={({ navigation }) => ({
      headerShown: true,
      headerTitle: 'Flowcus',
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
    <Drawer.Screen name="Main" component={BottomTabs} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
  </Drawer.Navigator>
);

export default function App() {
  return (
    <NavigationContainer>
      <DrawerNavigator />
    </NavigationContainer>
  );
}