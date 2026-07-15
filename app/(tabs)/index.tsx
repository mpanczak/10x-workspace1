import { useState } from 'react';
import { Button, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authClient, authFetch } from '@/lib/auth-client';

// TEMPORARY — Phase 8 real-device verification screen (auth session +
// token-refresh/background-state check). Not real app UI; remove once the
// actual sign-in/rides screens are built.
export default function DevAuthTestScreen() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [log, setLog] = useState('');

  const append = (msg: string) => setLog((prev) => `${new Date().toLocaleTimeString()} ${msg}\n${prev}`);

  const signUp = async () => {
    const { error } = await authClient.signUp.email({ email, password, name: name || 'Dev Tester' });
    append(error ? `signUp error: ${error.message}` : 'signUp ok');
  };

  const signIn = async () => {
    const { error } = await authClient.signIn.email({ email, password });
    append(error ? `signIn error: ${error.message}` : 'signIn ok');
  };

  const signOut = async () => {
    await authClient.signOut();
    append('signed out');
  };

  const fetchRides = async () => {
    const res = await authFetch('/api/rides?limit=5');
    const body = await res.text();
    append(`GET /api/rides -> status ${res.status}, body: ${body.slice(0, 200)}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Phase 8 — Auth Test</ThemedText>

      <ThemedView style={styles.block}>
        <ThemedText type="subtitle">Session</ThemedText>
        <ThemedText>{isPending ? 'loading…' : session ? `logged in as ${session.user.email}` : 'not logged in'}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.block}>
        <TextInput
          placeholder="name (sign up only)"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="none"
        />
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
        <Button title="Sign Up" onPress={signUp} />
        <Button title="Sign In" onPress={signIn} />
        <Button title="Sign Out" onPress={signOut} />
        <Button title="Fetch /api/rides" onPress={fetchRides} />
      </ThemedView>

      <ThemedView style={styles.block}>
        <ThemedText type="subtitle">Log</ThemedText>
        <ThemedText>{log}</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingTop: 60,
  },
  block: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    padding: 8,
  },
});
