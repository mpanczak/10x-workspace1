import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/require-auth'

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AuthVariables }>()

app.use('*', requireAuth)

const createMessageSchema = z.object({
  message: z.string().min(1).max(2000),
})

// FR-007: message to the ride's organizer (flat table — not Phase 5's
// realtime group chat). A private channel, not a public comment thread.
app.post('/:id/messages', zValidator('json', createMessageSchema), async (c) => {
  const userId = c.get('userId')
  const rideId = c.req.param('id')
  const { message } = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, rideId) })
  if (!ride) {
    return c.json({ error: 'not_found' }, 404)
  }

  const [created] = await db
    .insert(schema.organizerMessages)
    .values({ rideId, senderId: userId, message })
    .returning()

  return c.json(created, 201)
})

// Organizer-only: read messages sent to them about this ride.
app.get('/:id/messages', async (c) => {
  const userId = c.get('userId')
  const rideId = c.req.param('id')
  const db = drizzle(c.env.DB, { schema })

  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, rideId) })
  if (!ride) {
    return c.json({ error: 'not_found' }, 404)
  }
  if (ride.organizerId !== userId) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const messages = await db.query.organizerMessages.findMany({
    where: eq(schema.organizerMessages.rideId, rideId),
    orderBy: asc(schema.organizerMessages.createdAt),
  })

  return c.json(messages)
})

export default app
