import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Animated } from 'react-native';
import HomeScreen from '../../screens/HomeScreen';
import AboutScreen from '../../screens/AboutScreen';
import ContactScreen from '../../screens/ContactScreen';
import tw from 'twrnc';
import { BottomTabParamList } from '../../navigation/types';
import { useTheme } from '@react-navigation/native';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const AnimatedTabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[tw`flex-1 justify-center items-center`, { transform: [{ scale }] }]}>
      <Icon name={name} size={22} color={color} />
    </Animated.View>
  );
};

const Tabs = () => {
  const { colors: themeColors } = useTheme();
  return <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarAccessibilityLabel: route.name,
      tabBarStyle: [
        tw`absolute bottom-8 mx-8 h-14 rounded-full shadow-lg border`,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
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
        return <AnimatedTabIcon name={iconName} color={color || themeColors.text} focused={focused} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarAccessibilityLabel: 'Home' }} />
    <Tab.Screen name="About" component={AboutScreen} options={{ tabBarAccessibilityLabel: 'About' }} />
    <Tab.Screen name="Contact" component={ContactScreen} options={{ tabBarAccessibilityLabel: 'Contact' }} />
  </Tab.Navigator>;
};

export default Tabs;
