import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/require-auth'

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AuthVariables }>()

app.use('*', requireAuth)

const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const

const riderProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  ridingStyle: z.string().min(1).max(100),
  experienceLevel: z.enum(experienceLevels),
})

// FR-002/FR-013: rider's own profile (bio, riding style, self-declared experience).
app.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const profile = await db.query.riderProfiles.findFirst({
    where: eq(schema.riderProfiles.userId, c.get('userId')),
  })
  if (!profile) {
    return c.json({ error: 'not_found' }, 404)
  }
  return c.json(profile)
})

app.put('/', zValidator('json', riderProfileSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const existing = await db.query.riderProfiles.findFirst({
    where: eq(schema.riderProfiles.userId, userId),
  })

  if (existing) {
    await db
      .update(schema.riderProfiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.riderProfiles.userId, userId))
  } else {
    await db.insert(schema.riderProfiles).values({ userId, ...body })
  }

  const profile = await db.query.riderProfiles.findFirst({
    where: eq(schema.riderProfiles.userId, userId),
  })
  return c.json(profile)
})

const motorcycleProfileSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
})

// FR-003: a user may keep multiple motorcycle profiles (a "garage"); a ride
// picks one via rides.motorcycleProfileId.
app.get('/motorcycles', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const motorcycles = await db.query.motorcycleProfiles.findMany({
    where: eq(schema.motorcycleProfiles.userId, c.get('userId')),
  })
  return c.json(motorcycles)
})

app.post('/motorcycles', zValidator('json', motorcycleProfileSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const [created] = await db
    .insert(schema.motorcycleProfiles)
    .values({ userId, ...body })
    .returning()

  return c.json(created, 201)
})

app.put('/motorcycles/:id', zValidator('json', motorcycleProfileSchema), async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const db = drizzle(c.env.DB, { schema })

  const existing = await db.query.motorcycleProfiles.findFirst({
    where: and(eq(schema.motorcycleProfiles.id, id), eq(schema.motorcycleProfiles.userId, userId)),
  })
  if (!existing) {
    return c.json({ error: 'not_found' }, 404)
  }

  const [updated] = await db
    .update(schema.motorcycleProfiles)
    .set(body)
    .where(eq(schema.motorcycleProfiles.id, id))
    .returning()

  return c.json(updated)
})

app.delete('/motorcycles/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const db = drizzle(c.env.DB, { schema })

  const existing = await db.query.motorcycleProfiles.findFirst({
    where: and(eq(schema.motorcycleProfiles.id, id), eq(schema.motorcycleProfiles.userId, userId)),
  })
  if (!existing) {
    return c.json({ error: 'not_found' }, 404)
  }

  await db.delete(schema.motorcycleProfiles).where(eq(schema.motorcycleProfiles.id, id))
  return c.body(null, 204)
})

export default app
