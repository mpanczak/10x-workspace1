import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authClient } from '@/lib/auth-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = authClient.useSession();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isPending ? (
        <ThemedView style={{ flex: 1 }} />
      ) : (
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} redirect={!!session} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} redirect={!session} />
        </Stack>
      )}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
