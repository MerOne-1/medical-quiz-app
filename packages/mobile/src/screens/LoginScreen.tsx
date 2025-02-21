import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, Portal, Dialog, Paragraph } from 'react-native-paper';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  async function handleLogin() {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('ProjectSelect');
    } catch (error) {
      setError('Échec de la connexion. Veuillez vérifier vos identifiants.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.surface} elevation={3}>
          <View style={styles.iconContainer}>
            <Icon name="school" size={40} color={theme.colors.primary} style={styles.icon} />
          </View>
          
          <Text variant="headlineMedium" style={styles.title}>Connexion</Text>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              disabled={loading}
              style={styles.input}
            />
            
            <TextInput
              mode="outlined"
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              disabled={loading}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Se connecter
            </Button>

            <View style={styles.links}>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Signup')}
                disabled={loading}
              >
                Pas encore de compte ? S'inscrire
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
              >
                Mot de passe oublié ?
              </Button>
            </View>
          </View>
        </Surface>
      </ScrollView>

      <Portal>
        <Dialog visible={!!error} onDismiss={() => setError('')}>
          <Dialog.Title>Erreur</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{error}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setError('')}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#1a237e',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  links: {
    alignItems: 'center',
  },
});
