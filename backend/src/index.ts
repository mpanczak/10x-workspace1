import { Hono } from 'hono'
import { getAuth } from './lib/auth'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const auth = getAuth(c.env)
  return auth.handler(c.req.raw)
})

export default app
