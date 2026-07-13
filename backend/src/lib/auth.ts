import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { drizzle } from 'drizzle-orm/d1'
import { expo } from '@better-auth/expo'
import * as schema from '../db/schema'

// Runtime path: constructed fresh on every call, never at module scope.
// env.DB differs per Worker invocation (production vs preview), so a
// module-scope betterAuth() singleton is a silent cross-environment bug.
// See auth.cli-config.ts for the separate CLI-only instance `generate` uses.
export function getAuth(env: CloudflareBindings) {
  const db = drizzle(env.DB, { schema })

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
      usePlural: true,
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // exp:// is Expo Go's dev-only scheme; tighten to slipstream:// only once
    // Expo Go testing is no longer part of the workflow.
    trustedOrigins: ['slipstream://', 'exp://'],
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [expo()],
  })
}
