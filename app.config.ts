import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'slipstream',
  slug: 'slipstream',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'slipstream',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.slipstream.app',
  },
  android: {
    package: 'com.slipstream.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // Inlined at build time (EAS: via eas.json's per-profile `env`; local
    // dev: via .env, see .env.example) — read at runtime through
    // Constants.expoConfig.extra, not process.env.EXPO_PUBLIC_API_URL
    // directly, so there's one consistent access path (see lib/api-client.ts).
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};

export default config;
