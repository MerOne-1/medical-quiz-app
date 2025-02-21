import React from 'react';
import './config/firebase';  // Initialize Firebase
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

// Import screens
import LoginScreen from './screens/LoginScreen';
import ProjectSelectScreen from './screens/ProjectSelectScreen';
import QuizHomeScreen from './screens/QuizHomeScreen';
import MoleculesHomeScreen from './screens/MoleculesHomeScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1a237e',
    secondary: '#2196f3',
    error: '#B00020',
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#ffffff',
              },
              headerTintColor: theme.colors.primary,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ProjectSelect" 
              component={ProjectSelectScreen}
              options={{ 
                title: 'Medical Quiz',
                headerLeft: () => null, // Disable back button
              }}
            />
            <Stack.Screen 
              name="QuizHome" 
              component={QuizHomeScreen}
              options={{ title: 'QCMs CSP' }}
            />
            <Stack.Screen 
              name="MoleculesHome" 
              component={MoleculesHomeScreen}
              options={{ title: 'Flashcards Molécules' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
