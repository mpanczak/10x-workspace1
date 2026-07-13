import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/require-auth'

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AuthVariables }>()

app.use('*', requireAuth)

const createRideSchema = z.object({
  motorcycleProfileId: z.string().optional(),
  routeDescription: z.string().min(1).max(4000),
  ridingStyle: z.string().min(1).max(100),
  purpose: z.string().min(1).max(200),
  region: z.string().min(1).max(100),
  startAt: z.coerce.date(),
  plannedArrivalAt: z.coerce.date().optional(),
  startAddress: z.string().min(1).max(500),
})

const listQuerySchema = z.object({
  region: z.string().optional(),
  ridingStyle: z.string().optional(),
  startAfter: z.coerce.date().optional(),
  startBefore: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// FR-004/FR-005: browse + filter the public ride list. NFR-002: filters map
// directly onto the region/start_at/riding_style indexes from Phase 2.
app.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { region, ridingStyle, startAfter, startBefore, limit, offset } = c.req.valid('query')
  const db = drizzle(c.env.DB, { schema })

  const conditions = [
    region ? eq(schema.rides.region, region) : undefined,
    ridingStyle ? eq(schema.rides.ridingStyle, ridingStyle) : undefined,
    startAfter ? gte(schema.rides.startAt, startAfter) : undefined,
    startBefore ? lte(schema.rides.startAt, startBefore) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined)

  const rides = await db
    .select()
    .from(schema.rides)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(schema.rides.startAt))
    .limit(limit)
    .offset(offset)

  return c.json(rides)
})

app.post('/', zValidator('json', createRideSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  if (body.motorcycleProfileId) {
    const motorcycle = await db.query.motorcycleProfiles.findFirst({
      where: and(
        eq(schema.motorcycleProfiles.id, body.motorcycleProfileId),
        eq(schema.motorcycleProfiles.userId, userId),
      ),
    })
    if (!motorcycle) {
      return c.json({ error: 'motorcycle_profile_not_found' }, 400)
    }
  }

  const [created] = await db
    .insert(schema.rides)
    .values({ organizerId: userId, ...body })
    .returning()

  return c.json(created, 201)
})

// FR-006/FR-010: ride detail — route, organizer's motorcycle + experience
// level, start address, and who's already joined (US-01/US-02).
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = drizzle(c.env.DB, { schema })

  const ride = await db.query.rides.findFirst({ where: eq(schema.rides.id, id) })
  if (!ride) {
    return c.json({ error: 'not_found' }, 404)
  }

  const [organizer, motorcycle, organizerProfile, participants] = await Promise.all([
    db.query.users.findFirst({
      where: eq(schema.users.id, ride.organizerId),
      columns: { id: true, name: true, image: true },
    }),
    ride.motorcycleProfileId
      ? db.query.motorcycleProfiles.findFirst({
          where: eq(schema.motorcycleProfiles.id, ride.motorcycleProfileId),
        })
      : Promise.resolve(null),
    db.query.riderProfiles.findFirst({
      where: eq(schema.riderProfiles.userId, ride.organizerId),
      columns: { experienceLevel: true, ridingStyle: true },
    }),
    db.query.rideParticipants.findMany({
      where: eq(schema.rideParticipants.rideId, id),
    }),
  ])

  return c.json({
    ...ride,
    organizer: organizer ? { ...organizer, ...organizerProfile } : null,
    motorcycle,
    participants,
  })
})

export default app
