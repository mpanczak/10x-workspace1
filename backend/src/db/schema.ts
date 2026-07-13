import { relations, sql } from 'drizzle-orm'
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

// better-auth tables, generated via:
// npx @better-auth/cli generate --config ./src/lib/auth.cli-config.ts --output ./src/db/auth-schema.ts --yes
// then hand-merged here (CLI generate overwrites its --output file wholesale,
// so it's never pointed directly at this file — see auth.cli-config.ts).
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
)

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
)

export const verifications = sqliteTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

// App tables

export const motorcycleProfiles = sqliteTable('motorcycle_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Plain text, no FK constraint: adding one now would require a SQLite
  // table-rebuild migration against an already-applied table. Revisit if a
  // future migration touches this table anyway.
  userId: text('user_id').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  type: text('type').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const rides = sqliteTable(
  'rides',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizerId: text('organizer_id').notNull(),
    motorcycleProfileId: text('motorcycle_profile_id').references(() => motorcycleProfiles.id),
    routeDescription: text('route_description').notNull(),
    ridingStyle: text('riding_style').notNull(),
    purpose: text('purpose').notNull(),
    region: text('region').notNull(),
    startAt: integer('start_at', { mode: 'timestamp' }).notNull(),
    plannedArrivalAt: integer('planned_arrival_at', { mode: 'timestamp' }),
    startAddress: text('start_address').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('rides_region_idx').on(table.region),
    index('rides_start_at_idx').on(table.startAt),
    index('rides_riding_style_idx').on(table.ridingStyle),
  ],
)

export const rideParticipants = sqliteTable(
  'ride_participants',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    rideId: text('ride_id')
      .notNull()
      .references(() => rides.id),
    userId: text('user_id').notNull(),
    joinedAt: integer('joined_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex('ride_participants_ride_user_idx').on(table.rideId, table.userId),
  ],
)

export const organizerMessages = sqliteTable(
  'organizer_messages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    rideId: text('ride_id')
      .notNull()
      .references(() => rides.id),
    senderId: text('sender_id').notNull(),
    message: text('message').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('organizer_messages_ride_id_idx').on(table.rideId)],
)
