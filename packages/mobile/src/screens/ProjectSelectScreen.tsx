import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TouchableRipple } from 'react-native-paper';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const projects = [
  {
    id: 'qcm',
    title: 'QCMs CSP',
    description: 'Préparez vos examens avec des QCMs interactifs',
    icon: 'quiz',
    color: '#009688',
    route: 'QuizHome'
  },
  {
    id: 'molecules',
    title: 'Flashcards Molécules',
    description: 'Apprenez et révisez les structures moléculaires',
    icon: 'science',
    color: '#2196f3',
    route: 'MoleculesHome'
  }
];

export default function ProjectSelectScreen({ navigation }: Props) {
  const theme = useTheme();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Choisissez votre application
        </Text>

        <View style={styles.grid}>
          {projects.map(project => (
            <Surface
              key={project.id}
              style={[styles.card, { elevation: 1 }]}
            >
              <TouchableRipple
                onPress={() => navigation.navigate(project.route)}
                style={styles.touchable}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <Icon
                      name={project.icon}
                      size={60}
                      color={project.color}
                    />
                  </View>
                  <Text variant="titleLarge" style={styles.cardTitle}>
                    {project.title}
                  </Text>
                  <Text variant="bodyMedium" style={styles.cardDescription}>
                    {project.description}
                  </Text>
                </View>
              </TouchableRipple>
            </Surface>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingTop: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#1a237e',
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  cardContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: {
    marginBottom: 8,
    color: '#1a237e',
    textAlign: 'center',
  },
  cardDescription: {
    color: '#666666',
    textAlign: 'center',
  },
});
