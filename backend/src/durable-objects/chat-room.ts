import { DurableObject } from 'cloudflare:workers'

type ChatMessage = {
  id: number
  userId: string
  userName: string
  content: string
  createdAt: number
}

type SocketAttachment = {
  userId: string
  userName: string
}

const MAX_MESSAGE_LENGTH = 2000

// One instance per ride (see chat.ts: `env.CHAT_ROOM.getByName(rideId)`).
// SQLite storage is required from the first migration entry — a live class
// cannot be converted to SQLite storage after the fact (see wrangler.jsonc).
export class ChatRoom extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => this.migrate())
  }

  private migrate() {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const currentVersion = this.ctx.storage.sql
      .exec<{ version: number }>(
        'SELECT COALESCE(MAX(id), 0) as version FROM _sql_schema_migrations',
      )
      .one().version

    if (currentVersion < 1) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        INSERT INTO _sql_schema_migrations (id) VALUES (1);
      `)
    }
  }

  // Called by chat.ts for the initial REST-loaded history (before/without a
  // live WS connection) and could also back a "load older messages" scroll.
  getRecentMessages(limit = 50): ChatMessage[] {
    const rows = this.ctx.storage.sql
      .exec<{
        id: number
        user_id: string
        user_name: string
        content: string
        created_at: number
      }>(
        'SELECT id, user_id, user_name, content, created_at FROM messages ORDER BY created_at DESC LIMIT ?',
        limit,
      )
      .toArray()

    return rows
      .map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        content: row.content,
        createdAt: row.created_at,
      }))
      .reverse()
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade')
    if (upgrade !== 'websocket') {
      return new Response('expected websocket upgrade', { status: 426 })
    }

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const userName = url.searchParams.get('userName')
    if (!userId || !userName) {
      return new Response('missing userId/userName', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ userId, userName } satisfies SocketAttachment)

    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return

    let content: string
    try {
      const parsed = JSON.parse(message)
      content = String(parsed.content ?? '').slice(0, MAX_MESSAGE_LENGTH)
    } catch {
      return
    }
    if (!content) return

    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return

    const createdAt = Date.now()
    const result = this.ctx.storage.sql
      .exec<{ id: number }>(
        'INSERT INTO messages (user_id, user_name, content, created_at) VALUES (?, ?, ?, ?) RETURNING id',
        attachment.userId,
        attachment.userName,
        content,
        createdAt,
      )
      .one()

    const chatMessage: ChatMessage = {
      id: result.id,
      userId: attachment.userId,
      userName: attachment.userName,
      content,
      createdAt,
    }

    const payload = JSON.stringify({ type: 'message', message: chatMessage })
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(payload)
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, reason)
  }

  webSocketError(ws: WebSocket, error: unknown) {
    console.error('ChatRoom websocket error:', error)
  }
}
