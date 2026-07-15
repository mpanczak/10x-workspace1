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

// Backend calls that need the session cookie (everything except /health)
// should go through authFetch (lib/auth-client.ts) — authClient.$fetch is
// scoped to better-auth's own /api/auth basePath and 404s on app routes
// like /api/rides (confirmed on-device, see deploy-plan.md Phase 8).
export const API_URL = resolveApiUrl();
