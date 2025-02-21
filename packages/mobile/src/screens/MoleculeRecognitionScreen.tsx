import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { getMoleculesByTheme } from '../services/firebase';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Molecule {
  id: string;
  name: string;
  image: string;
}

export default function MoleculeRecognitionScreen({ route, navigation }: Props) {
  const { themeId } = route.params as { themeId: string };
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const flipAnimation = new Animated.Value(0);

  useEffect(() => {
    const loadMolecules = async () => {
      try {
        const moleculesData = await getMoleculesByTheme(themeId);
        setMolecules(moleculesData);
      } catch (error) {
        console.error('Error loading molecules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMolecules();
  }, [themeId]);

  const flipCard = () => {
    setShowAnswer(!showAnswer);
    Animated.spring(flipAnimation, {
      toValue: showAnswer ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading molecules...</Text>
      </View>
    );
  }

  if (molecules.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No molecules found for this theme</Text>
      </View>
    );
  }

  const currentMolecule = molecules[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <TouchableOpacity onPress={flipCard} activeOpacity={1}>
          <Animated.View
            style={[
              styles.card,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Text style={styles.cardText}>{currentMolecule.name}</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <Text style={styles.cardText}>Answer Side</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setCurrentIndex((prev) => Math.min(molecules.length - 1, prev + 1))}
          disabled={currentIndex === molecules.length - 1}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.progress}>
        {currentIndex + 1} / {molecules.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: 300,
    height: 400,
    perspective: 1000,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#e3f2fd',
  },
  cardText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});
