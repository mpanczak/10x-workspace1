import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set — copy .env.example to .env for local dev, or check the eas.json build profile.',
    );
  }
  return apiUrl;
}

// Backend calls that need the session cookie (which is everything except
// /health) should go through authClient.$fetch (lib/auth-client.ts), not a
// separate plain-fetch helper here — that's the one place the stored
// SecureStore session gets attached.
export const API_URL = resolveApiUrl();
