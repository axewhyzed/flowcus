import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';

const AboutScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <ScrollView contentContainerStyle={tw`pb-10`} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={tw`items-center mt-8 mb-6`}>
        <Icon name="information-outline" size={60} color={colors.primary} />
        <Text style={[tw`text-3xl font-bold mt-4`, { color: colors.text }]}>About Flowcus</Text>
        <Text style={[tw`text-lg mt-2 text-center px-8`, { color: colors.text }]}>
          Your productivity companion for focused work sessions
        </Text>
      </View>

      <View style={tw`mx-6 mb-8`}>
        <Text style={[tw`text-xl font-semibold mb-4`, { color: colors.primary }]}>Our Mission</Text>
        <Text style={[tw`text-base leading-6`, { color: colors.text }]}>
          Flowcus is designed to help you achieve deep focus and maximize your productivity using scientifically-proven techniques like the Pomodoro method and flow state principles.
        </Text>
      </View>

      <View style={tw`mx-6 mb-8`}>
        <Text style={[tw`text-xl font-semibold mb-4`, { color: colors.primary }]}>Features</Text>
        {[
          { icon: 'timer-outline', text: 'Customizable focus timers with analytics' },
          { icon: 'chart-line', text: 'Progress tracking and insights' },
          { icon: 'weather-night', text: 'Dark mode and customizable themes' },
        ].map((item, index) => (
          <View key={index} style={tw`mb-3 flex-row items-start`}>
            <Icon name={item.icon} size={24} color={colors.primary} style={tw`mr-3 mt-1`} />
            <Text style={[tw`text-base flex-1`, { color: colors.text }]}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* 👨‍💻 Developer Info */}
      <View style={tw`mx-6 mb-10 items-center`}>
        <Text style={[tw`text-base font-medium mb-2 text-center`, { color: colors.text }]}>
          Developed with 💙 by Mihir Bambhaniya
        </Text>
        <Text style={[tw`text-xl font-semibold mb-4`, { color: colors.primary }]}>Connect With Us</Text>
        <View style={tw`flex-row items-center`}>
          <Icon
            name="github"
            size={30}
            color={colors.primary}
            style={tw`mx-4`}
            onPress={() => openLink('https://github.com/axewhyzed')}
          />
          <Icon
            name="linkedin"
            size={30}
            color={colors.primary}
            style={tw`mx-4`}
            onPress={() => openLink('https://linkedin.com/in/mihir-bambhaniya')}
          />
          <Icon 
            name="email-outline" 
            size={30} 
            color={colors.primary} 
            style={tw`mx-4`} 
            onPress={() => openLink('mailto:support@flowcus.com')} 
          />
        </View>
      </View>

      <View style={tw`mx-6`}>
        <Text style={[tw`text-center text-sm`, { color: colors.text }]}>
          © {new Date().getFullYear()} Flowcus App. All rights reserved.
        </Text>
        <Text style={[tw`text-center text-xs mt-2`, { color: colors.text }]}>
          Version 1.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AboutScreen;
