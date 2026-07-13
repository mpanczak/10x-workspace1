import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/require-auth'

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AuthVariables }>()

app.use('*', requireAuth)

// FR-012 (nice-to-have): chat is scoped to a ride's own participants, not
// open to any authenticated user — organizer or someone who has joined.
async function isRideMember(
  db: DrizzleD1Database<typeof schema>,
  rideId: string,
  userId: string,
): Promise<'organizer' | 'participant' | null> {
  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, rideId) })
  if (!ride) return null
  if (ride.organizerId === userId) return 'organizer'

  const membership = await db.query.rideParticipants.findFirst({
    where: (rp, { and, eq }) => and(eq(rp.rideId, rideId), eq(rp.userId, userId)),
  })
  return membership ? 'participant' : null
}

app.get('/:id/chat/messages', async (c) => {
  const rideId = c.req.param('id')
  const userId = c.get('userId')
  const db = drizzle(c.env.DB, { schema })

  const membership = await isRideMember(db, rideId, userId)
  if (membership === null) {
    return c.json({ error: 'not_found_or_forbidden' }, 404)
  }

  // CHAT_ROOM is unconditionally bound in wrangler.jsonc; the generated type
  // marks DO bindings optional regardless.
  const stub = c.env.CHAT_ROOM!.getByName(rideId)
  const messages = await stub.getRecentMessages(50)
  return c.json(messages)
})

app.get('/:id/chat', async (c) => {
  const rideId = c.req.param('id')
  const userId = c.get('userId')
  const userName = c.get('userName')
  const db = drizzle(c.env.DB, { schema })

  const membership = await isRideMember(db, rideId, userId)
  if (membership === null) {
    return c.json({ error: 'not_found_or_forbidden' }, 404)
  }

  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'expected_websocket_upgrade' }, 426)
  }

  const forwardUrl = new URL(c.req.raw.url)
  forwardUrl.searchParams.set('userId', userId)
  forwardUrl.searchParams.set('userName', userName)
  const forwardRequest = new Request(forwardUrl, c.req.raw)

  // CHAT_ROOM is unconditionally bound in wrangler.jsonc; the generated type
  // marks DO bindings optional regardless.
  const stub = c.env.CHAT_ROOM!.getByName(rideId)
  return stub.fetch(forwardRequest)
})

export default app
