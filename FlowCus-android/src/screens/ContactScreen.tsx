import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const ContactScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📞 Contact Screen</Text>
      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, marginBottom: 20 },
});

export default ContactScreen;
