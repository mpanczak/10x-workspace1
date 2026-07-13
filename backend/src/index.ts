import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from './lib/auth'
import profile from './routes/profile'
import rides from './routes/rides'
import participants from './routes/participants'
import messages from './routes/messages'
import chat from './routes/chat'

export { ChatRoom } from './durable-objects/chat-room'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Native (iOS/Android, NFR-001) doesn't send an Origin header and isn't
// subject to CORS at all — this is purely for browser-based clients: Expo's
// web target during local dev/testing (react-native-web via `expo start
// --web`), since better-auth's cookie-based session needs
// Access-Control-Allow-Credentials, which can't pair with a wildcard origin.
app.use(
  '/api/*',
  cors({
    origin: (origin) => (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : null),
    credentials: true,
  }),
)

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

app.route('/api/profile', profile)
app.route('/api/rides', rides)
app.route('/api/rides', participants)
app.route('/api/rides', messages)
app.route('/api/rides', chat)

export default app
