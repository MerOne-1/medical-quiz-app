import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MoleculesHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Flashcards Molécules Screen</Text>
      <Text style={styles.subtext}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});
