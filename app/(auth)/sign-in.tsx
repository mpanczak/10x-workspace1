import { useState } from 'react';
import { Button, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authClient } from '@/lib/auth-client';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        console.error('signIn error:', signInError);
        setError(signInError.message ?? `Sign in failed (${signInError.status ?? 'unknown'})`);
      }
    } catch (e) {
      console.error('signIn threw:', e);
      setError(e instanceof Error ? e.message : 'Sign in threw an unexpected error');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Sign in</ThemedText>

      <TextInput
        placeholder="email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button title="Sign In" onPress={signIn} />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
    color: '#000',
  },
  error: {
    color: '#d32f2f',
  },
});
