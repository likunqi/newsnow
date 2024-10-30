import process from "node:process"
import type { NewsItem } from "@shared/types"
import type { Database } from "db0"
import type { CacheInfo } from "../types"

export class Cache {
  private db
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS cache (
        id TEXT PRIMARY KEY,
        updated INTEGER,
        data TEXT
      );
    `).run()
    logger.success(`init cache table`)
  }

  async set(key: string, value: NewsItem[]) {
    const now = Date.now()
    await this.db.prepare(
      `INSERT OR REPLACE INTO cache (id, data, updated) VALUES (?, ?, ?)`,
    ).run(key, JSON.stringify(value), now)
    logger.success(`set ${key} cache`)
  }

  async get(key: string): Promise<CacheInfo> {
    const row: any = await this.db.prepare(`SELECT id, data, updated FROM cache WHERE id = ?`).get(key)
    const r = row
      ? {
          ...row,
          data: JSON.parse(row.data),
        }
      : undefined
    logger.success(`get ${key} cache`)
    return r
  }

  async delete(key: string) {
    return await this.db.prepare(`DELETE FROM cache WHERE id = ?`).run(key)
  }
}

export async function getCacheTable() {
  try {
    // 如果没有数据库，这里不会报错，只会在第一次访问的时候报错
    const db = useDatabase()
    if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") return
    const cacheTable = new Cache(db)
    if (process.env.INIT_TABLE !== "false") await cacheTable.init()
    return cacheTable
  } catch (e) {
    logger.error("failed to init database ", e)
  }
}
