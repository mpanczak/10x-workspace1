```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## D1 migrations

Schema lives in `src/db/schema.ts` (Drizzle). To add a migration:

```txt
npx wrangler d1 migrations create slipstream-db <name>
npx drizzle-kit generate
```

`drizzle-kit generate` writes its own numbered file plus a `migrations/meta/` journal — copy the generated SQL into the file `wrangler d1 migrations create` just made, then delete drizzle-kit's own file and the `meta/` folder. Wrangler's `migrations/NNNN_*.sql` files are the single source of truth; drizzle-kit is only used to generate SQL from the schema, not to track or apply migrations.

Apply migrations in this order, every time, never skip a step:

```txt
npx wrangler d1 migrations apply slipstream-db
npx wrangler d1 migrations apply slipstream-db-preview --remote --env preview
npx wrangler d1 migrations apply slipstream-db --remote
```

1. **local** — applies to the local dev D1 (used by `wrangler dev`)
2. **preview-remote** — applies to the real, deployed preview environment (note: needs `--env preview` since `slipstream-db-preview` is only defined under `env.preview` in `wrangler.jsonc`)
3. **production-remote** — applies to production last, once preview is confirmed working

`slipstream-db-preview` is treated as disposable — never assume its data is recoverable.
