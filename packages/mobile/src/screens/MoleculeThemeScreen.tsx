import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getThemes } from '../services/firebase';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Theme {
  id: string;
  name: string;
  description?: string;
}

export default function MoleculeThemeScreen({ navigation }: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThemes = async () => {
      console.log('Starting to load themes...');
      try {
        const themesData = await getThemes();
        console.log('Themes loaded:', themesData);
        setThemes(themesData);
      } catch (error) {
        console.error('Error loading themes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, []);

  const renderThemeItem = ({ item }: { item: Theme }) => (
    <TouchableOpacity
      style={[styles.themeCard, Platform.OS === 'web' && styles.themeCardWeb]}
      onPress={() => navigation.navigate('MoleculeRecognition', { themeId: item.id })}
    >
      <Text style={styles.themeName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.themeDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading themes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={themes}
        renderItem={renderThemeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, Platform.OS === 'web' && styles.listWeb]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  list: {
    padding: 16,
  },
  listWeb: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  themeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themeCardWeb: {
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      transform: 'translateY(-2px)',
      shadowOpacity: 0.2,
    },
  },
  themeName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a237e',
  },
  themeDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
});
