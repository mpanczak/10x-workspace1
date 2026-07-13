import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { drizzle } from 'drizzle-orm/d1'
import { expo } from '@better-auth/expo'
import * as schema from '../db/schema'

// CLI-only: `@better-auth/cli generate` needs a directly-instantiated `auth`
// export to introspect config shape — it can't call a getAuth(env) factory
// since there's no Workers env binding in this Node-side codegen context.
// Never imported by the deployed Worker (see auth.ts for the runtime path).
// Keep socialProviders/plugins in sync with auth.ts by hand whenever one changes.
const db = drizzle({} as D1Database, { schema })

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
    usePlural: true,
  }),
  secret: 'cli-generate-placeholder',
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: 'cli-generate-placeholder',
      clientSecret: 'cli-generate-placeholder',
    },
  },
  plugins: [expo()],
})
