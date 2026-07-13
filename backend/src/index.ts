import { Hono } from 'hono'
import { getAuth } from './lib/auth'
import profile from './routes/profile'
import rides from './routes/rides'
import participants from './routes/participants'
import messages from './routes/messages'
import chat from './routes/chat'

export { ChatRoom } from './durable-objects/chat-room'

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

app.route('/api/profile', profile)
app.route('/api/rides', rides)
app.route('/api/rides', participants)
app.route('/api/rides', messages)
app.route('/api/rides', chat)

export default app
