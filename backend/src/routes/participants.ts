import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/require-auth'

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AuthVariables }>()

app.use('*', requireAuth)

// D1 wraps the actual SQLITE_CONSTRAINT message inside nested `cause` errors
// rather than the top-level thrown error's own `message`.
function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err
  while (current instanceof Error) {
    if (current.message.includes('UNIQUE constraint failed')) return true
    current = current.cause
  }
  return false
}

// FR-006: join directly, no organizer approval step. The unique index on
// (ride_id, user_id) from Phase 2 is the atomicity guarantee — a duplicate
// join is rejected by the DB itself, no read-then-write race to guard against.
app.post('/:id/join', async (c) => {
  const userId = c.get('userId')
  const rideId = c.req.param('id')
  const db = drizzle(c.env.DB, { schema })

  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, rideId) })
  if (!ride) {
    return c.json({ error: 'not_found' }, 404)
  }

  try {
    const [participant] = await db
      .insert(schema.rideParticipants)
      .values({ rideId, userId })
      .returning()
    return c.json(participant, 201)
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return c.json({ error: 'already_joined' }, 409)
    }
    throw err
  }
})

// FR-009: organizer-only remove, no approval workflow (all rides are open).
app.delete('/:id/participants/:userId', async (c) => {
  const requesterId = c.get('userId')
  const rideId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const db = drizzle(c.env.DB, { schema })

  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, rideId) })
  if (!ride) {
    return c.json({ error: 'not_found' }, 404)
  }
  if (ride.organizerId !== requesterId) {
    return c.json({ error: 'forbidden' }, 403)
  }

  await db
    .delete(schema.rideParticipants)
    .where(and(eq(schema.rideParticipants.rideId, rideId), eq(schema.rideParticipants.userId, targetUserId)))

  return c.body(null, 204)
})

export default app
