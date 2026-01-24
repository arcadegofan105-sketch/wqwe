// backend/db.js
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// База лежит рядом с backend (можно поменять путь, если нужно)
const dbPath = path.join(__dirname, 'database.sqlite')
const db = new Database(dbPath)

// Инициализация таблиц
db.pragma('journal_mode = WAL')

// Таблица пользователей
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance REAL NOT NULL DEFAULT 0,
    total_deposit_ton REAL NOT NULL DEFAULT 0,
    visits_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  )
`,
).run()

export function getUserByTgId(tgId) {
	return db.prepare(`SELECT * FROM users WHERE tg_id = ?`).get(String(tgId))
}

export function createUserFromTg(tgUser) {
	const now = Date.now()
	const stmt = db.prepare(`
    INSERT INTO users (tg_id, username, first_name, last_name, balance, total_deposit_ton, visits_count, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?)
  `)
	stmt.run(
		String(tgUser.id),
		tgUser.username || null,
		tgUser.first_name || null,
		tgUser.last_name || null,
		now,
		now,
	)
	return getUserByTgId(tgUser.id)
}

export function touchUserVisit(tgUser) {
	const now = Date.now()
	const existing = getUserByTgId(tgUser.id)
	if (!existing) {
		return createUserFromTg(tgUser)
	}
	db.prepare(
		`
    UPDATE users
    SET username = COALESCE(?, username),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        visits_count = visits_count + 1,
        last_seen_at = ?
    WHERE tg_id = ?
  `,
	).run(
		tgUser.username || null,
		tgUser.first_name || null,
		tgUser.last_name || null,
		now,
		String(tgUser.id),
	)
	return getUserByTgId(tgUser.id)
}

// Обновление баланса и суммарного депозита
export function updateUserBalanceAndDeposit(
	tgId,
	{ balance, totalDepositTon },
) {
	db.prepare(
		`
    UPDATE users
    SET balance = ?,
        total_deposit_ton = ?
    WHERE tg_id = ?
  `,
	).run(balance, totalDepositTon, String(tgId))
}

export function updateUserBalance(tgId, balance) {
	db.prepare(
		`
    UPDATE users
    SET balance = ?
    WHERE tg_id = ?
  `,
	).run(balance, String(tgId))
}

export default db
