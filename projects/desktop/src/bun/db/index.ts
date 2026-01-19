import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";

// 确保数据目录存在
const DATA_DIR = join(homedir(), ".agentos", "desktop");
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = join(DATA_DIR, "chat.sqlite");

export class LocalDB {
  private db: Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0, -- 0: unsynced, 1: synced
        session_id TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_session_id ON messages(session_id)
    `);
    
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_synced ON messages(synced)
    `);
  }

  addMessage(msg: { id: string; role: string; content: string; session_id: string }) {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, role, content, created_at, session_id, synced)
      VALUES ($id, $role, $content, $created_at, $session_id, 0)
    `);
    
    stmt.run({
      $id: msg.id,
      $role: msg.role,
      $content: msg.content,
      $created_at: Date.now(),
      $session_id: msg.session_id
    });
  }

  getMessages(sessionId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE session_id = $sessionId ORDER BY created_at ASC
    `);
    return stmt.all({ $sessionId: sessionId }) as any[];
  }

  getUnsyncedMessages() {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE synced = 0 ORDER BY created_at ASC
    `);
    return stmt.all() as any[];
  }

  markSynced(id: string) {
    const stmt = this.db.prepare(`
      UPDATE messages SET synced = 1 WHERE id = $id
    `);
    stmt.run({ $id: id });
  }
}

export const localDB = new LocalDB();
