import { createMiddleware } from 'hono/factory'
import { getAuth } from '../lib/auth'

export type AuthVariables = {
  userId: string
}

// Login is required for the whole app (no anonymous browsing) — see
// context/foundation/prd.md "Access Control". Organizer is not a stored role:
// it's derived per-request by comparing userId against a ride's organizerId.
export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings
  Variables: AuthVariables
}>(async (c, next) => {
  const auth = getAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  c.set('userId', session.user.id)
  await next()
})
