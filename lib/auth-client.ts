import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api-client';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'slipstream',
      storagePrefix: 'slipstream',
      storage: SecureStore,
    }),
  ],
});

// authClient.$fetch is scoped to better-auth's own basePath (/api/auth) and
// cannot reach the app's other routes (/api/rides, /api/profile, ...) —
// confirmed the hard way: it 404s by silently prepending /api/auth. Use this
// for every non-auth backend call instead; it attaches the session cookie
// the Expo plugin stored via authClient.getCookie(), the mechanism
// @better-auth/expo actually documents for calling other endpoints.
export async function authFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Cookie: authClient.getCookie(),
    },
  });
}
