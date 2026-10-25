import React from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import tw from 'twrnc';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ContactScreenProps } from '../navigation/types';
import { useTheme } from '@react-navigation/native';

const ContactScreen = ({ navigation }: ContactScreenProps) => {
  const { colors } = useTheme();
  return (
    <ScrollView contentContainerStyle={tw`flex-1 p-6 justify-center`} style={{ backgroundColor: colors.background }}>
      <Text style={[tw`text-3xl font-bold text-center mb-6`, { color: colors.primary }]}>Get in Touch</Text>

      {/* Email */}
      <View style={tw`mb-4 flex-row items-center`}>
        <Ionicons name="mail" size={24} color={colors.primary} style={tw`mr-3`} />
        <Text style={[tw`text-base`, { color: colors.text }]}>Email us at:</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:support@flowcus.com')}>
        <Text style={[tw`ml-9 mb-5`, { color: colors.primary }]}>support@flowcus.com</Text>
      </TouchableOpacity>

      {/* Support */}
      <View style={tw`mb-4 flex-row items-center`}>
        <MaterialIcons name="support-agent" size={24} color={colors.primary} style={tw`mr-3`} />
        <Text style={[tw`text-base`, { color: colors.text }]}>Need help?</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('https://flowcus.com/support')}>
        <Text style={[tw`ml-9 mb-5`, { color: colors.primary }]}>Visit our Support Center</Text>
      </TouchableOpacity>

      {/* Feedback */}
      <View style={tw`mb-4 flex-row items-center`}>
        <Ionicons name="chatbubbles" size={24} color={colors.primary} style={tw`mr-3`} />
        <Text style={[tw`text-base`, { color: colors.text }]}>Send feedback:</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('https://flowcus.com/feedback')}>
        <Text style={[tw`ml-9 mb-5`, { color: colors.primary }]}>flowcus.com/feedback</Text>
      </TouchableOpacity>

      {/* Go Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[tw`mt-10 p-3 rounded-xl items-center`, { backgroundColor: colors.primary }]}
      >
        <Text style={tw`text-white text-lg font-semibold`}>← Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ContactScreen;
