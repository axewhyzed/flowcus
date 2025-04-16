import React from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import tw from 'twrnc';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ContactScreen = ({ navigation }: any) => {
  return (
    <ScrollView contentContainerStyle={tw`flex-1 bg-white p-6 justify-center`}>
      <Text style={tw`text-3xl font-bold text-center mb-6 text-blue-600`}>Get in Touch</Text>

      {/* Email */}
      <View style={tw`mb-4 flex-row items-center`}>
        <Ionicons name="mail" size={24} color="#4B5563" style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Email us at:</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:support@flowcus.com')}>
        <Text style={tw`text-blue-500 ml-9 mb-5`}>support@flowcus.com</Text>
      </TouchableOpacity>

      {/* Support */}
      <View style={tw`mb-4 flex-row items-center`}>
        <MaterialIcons name="support-agent" size={24} color="#4B5563" style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Need help?</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('https://flowcus.com/support')}>
        <Text style={tw`text-blue-500 ml-9 mb-5`}>Visit our Support Center</Text>
      </TouchableOpacity>

      {/* Feedback */}
      <View style={tw`mb-4 flex-row items-center`}>
        <Ionicons name="chatbubbles" size={24} color="#4B5563" style={tw`mr-3`} />
        <Text style={tw`text-base text-gray-700`}>Send feedback:</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('https://flowcus.com/feedback')}>
        <Text style={tw`text-blue-500 ml-9 mb-5`}>flowcus.com/feedback</Text>
      </TouchableOpacity>

      {/* Go Back */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={tw`mt-10 bg-blue-600 p-3 rounded-xl items-center`}
      >
        <Text style={tw`text-white text-lg font-semibold`}>← Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ContactScreen;
