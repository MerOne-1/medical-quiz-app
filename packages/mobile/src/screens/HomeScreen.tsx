import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical Quiz</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('MoleculeTheme')}
      >
        <Text style={styles.buttonText}>Molécules</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' ? {
      cursor: 'default',
    } : {}),
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#1a237e',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 12,
    minWidth: Platform.OS === 'web' ? 250 : 200,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'transform 0.2s ease-in-out',
      ':hover': {
        transform: 'scale(1.05)',
      },
    } : {}),
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
