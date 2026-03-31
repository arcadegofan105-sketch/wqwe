// backend/db.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// В Railway пишем в volume (/data), локально — рядом с backend
const dbPath = process.env.RAILWAY_ENVIRONMENT
  ? "/data/database.sqlite"
  : path.join(__dirname, "database.sqlite");

const db = new Database(dbPath);

// Инициализация таблиц
db.pragma("journal_mode = WAL");

// ===== users =====
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
    last_seen_at INTEGER NOT NULL,
    last_free_spin_at INTEGER NOT NULL DEFAULT 0,
    free_wheel_available INTEGER NOT NULL DEFAULT 0,
    wheel_deposit_progress_ton REAL NOT NULL DEFAULT 0,
    referral_claimed_count INTEGER NOT NULL DEFAULT 0
  )
`
).run();

// миграция: добавить last_free_spin_at, если его нет (для старых БД)
try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN last_free_spin_at INTEGER NOT NULL DEFAULT 0`
  ).run();
} catch (e) {
  // колонка уже есть — игнорируем
}

// НОВОЕ: добавить поля для колеса, если их ещё нет (для старых БД)
try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN free_wheel_available INTEGER NOT NULL DEFAULT 0`
  ).run();
} catch (e) {
  // колонка уже есть — игнорируем
}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN wheel_deposit_progress_ton REAL NOT NULL DEFAULT 0`
  ).run();
} catch (e) {
  // колонка уже есть — игнорируем
}

try {
  db.prepare(
    `ALTER TABLE users ADD COLUMN referral_claimed_count INTEGER NOT NULL DEFAULT 0`
  ).run();
} catch (e) {
  // колонка уже есть — игнорируем
}

// ===== inventory (gifts) =====
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id TEXT NOT NULL,
    emoji TEXT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tg_id) REFERENCES users(tg_id)
  )
`).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_user_inventory_tg_id ON user_inventory(tg_id)`
).run();

// ===== promo codes =====
db.prepare(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'balance' | 'gift'
    amount REAL,                 -- для balance
    gift_name TEXT,              -- для gift (например 'Мишка')
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS promo_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    tg_id TEXT NOT NULL,
    used_at INTEGER NOT NULL,
    UNIQUE(code, tg_id)
  )
`).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_promo_uses_tg_id ON promo_uses(tg_id)`
).run();

// ===== referrals (for invite reward) =====
// invited_tg_id - кого пригласили, inviter_tg_id - кто пригласил
db.prepare(`
  CREATE TABLE IF NOT EXISTS referrals (
    invited_tg_id TEXT PRIMARY KEY,
    inviter_tg_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (invited_tg_id) REFERENCES users(tg_id),
    FOREIGN KEY (inviter_tg_id) REFERENCES users(tg_id)
  )
`).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_tg_id)`
).run();

// ===== reward claims (for rewards tab) =====
db.prepare(`
  CREATE TABLE IF NOT EXISTS reward_claims (
    tg_id TEXT NOT NULL,
    reward_key TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    amount_ton REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (tg_id, reward_key),
    FOREIGN KEY (tg_id) REFERENCES users(tg_id)
  )
`).run();

// ===== broadcast jobs =====
db.prepare(`
  CREATE TABLE IF NOT EXISTS broadcast_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    run_at INTEGER NOT NULL,
    status TEXT NOT NULL,      -- 'pending' | 'running' | 'done' | 'failed'
    text TEXT NOT NULL,
    parse_mode TEXT NOT NULL DEFAULT 'HTML',
    total INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  )
`).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_run_at ON broadcast_jobs(run_at)`
).run();
db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON broadcast_jobs(status)`
).run();

// ===== crash (online rounds) =====
db.prepare(`
  CREATE TABLE IF NOT EXISTS crash_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    crash_point REAL,
    started_at INTEGER NOT NULL,
    countdown_ends_at INTEGER,
    flying_started_at INTEGER,
    crashed_at INTEGER
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS crash_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    tg_id TEXT NOT NULL,
    amount REAL NOT NULL,
    cashed_out INTEGER NOT NULL DEFAULT 0,
    cashout_multiplier REAL,
    placed_at INTEGER NOT NULL,
    first_name TEXT,
    username TEXT,
    photo_url TEXT,
    FOREIGN KEY (round_id) REFERENCES crash_rounds(id)
  )
`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_crash_bets_round ON crash_bets(round_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_crash_rounds_status ON crash_rounds(status)`).run();

// ===== Users =====
export function getUserByTgId(tgId) {
  return db.prepare(`SELECT * FROM users WHERE tg_id = ?`).get(String(tgId));
}

export function createUserFromTg(tgUser) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (
      tg_id,
      username,
      first_name,
      last_name,
      balance,
      total_deposit_ton,
      visits_count,
      created_at,
      last_seen_at,
      last_free_spin_at,
      free_wheel_available,
      wheel_deposit_progress_ton
    )
    VALUES (?, ?, ?, ?, 0, 0, 1, ?, ?, 0, 0, 0)
  `);
  stmt.run(
    String(tgUser.id),
    tgUser.username || null,
    tgUser.first_name || null,
    tgUser.last_name || null,
    now,
    now
  );
  return getUserByTgId(tgUser.id);
}

export function touchUserVisit(tgUser) {
  const now = Date.now();
  const existing = getUserByTgId(tgUser.id);
  if (!existing) {
    return createUserFromTg(tgUser);
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
  `
  ).run(
    tgUser.username || null,
    tgUser.first_name || null,
    tgUser.last_name || null,
    now,
    String(tgUser.id)
  );
  return getUserByTgId(tgUser.id);
}

// Обновление баланса и суммарного депозита (+ поля колеса)
export function updateUserBalanceAndDeposit(
  tgId,
  { balance, totalDepositTon, freeWheelAvailable, wheelDepositProgressTon }
) {
  const user = getUserByTgId(tgId);

  const nextFree =
    typeof freeWheelAvailable === "boolean"
      ? freeWheelAvailable
        ? 1
        : 0
      : Number(user?.free_wheel_available || 0);

  const nextProgress =
    typeof wheelDepositProgressTon === "number"
      ? wheelDepositProgressTon
      : Number(user?.wheel_deposit_progress_ton || 0);

  db.prepare(
    `
    UPDATE users
    SET balance = ?,
        total_deposit_ton = ?,
        free_wheel_available = ?,
        wheel_deposit_progress_ton = ?
    WHERE tg_id = ?
  `
  ).run(balance, totalDepositTon, nextFree, nextProgress, String(tgId));
}

export function updateUserBalance(tgId, balance) {
  db.prepare(
    `
    UPDATE users
    SET balance = ?
    WHERE tg_id = ?
  `
  ).run(balance, String(tgId));
}

// ===== Referral helpers =====
export function tryBindReferral(invitedTgId, inviterTgId) {
  const now = Date.now();
  const invited = String(invitedTgId);
  const inviter = String(inviterTgId);

  if (!/^\d+$/.test(invited) || !/^\d+$/.test(inviter)) {
    return { ok: false, reason: "bad_id" };
  }
  if (invited === inviter) return { ok: false, reason: "self" };

  const r = db.prepare(
    `
    INSERT INTO referrals (invited_tg_id, inviter_tg_id, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(invited_tg_id) DO NOTHING
  `
  ).run(invited, inviter, now);

  return { ok: r.changes === 1 };
}

export function countInvitedByInviter(inviterTgId) {
  const row = db.prepare(
    `
    SELECT COUNT(*) as c
    FROM referrals
    WHERE inviter_tg_id = ?
  `
  ).get(String(inviterTgId));
  return Number(row?.c || 0);
}

function countQualifiedInvitedByInviter(inviterTgId) {
  const row = db.prepare(
    `
    SELECT COUNT(*) as c
    FROM referrals r
    JOIN users u ON u.tg_id = r.invited_tg_id
    WHERE r.inviter_tg_id = ?
      AND COALESCE(u.total_deposit_ton, 0) > 0
  `
  ).get(String(inviterTgId));

  return Number(row?.c || 0);
}

export function getReferralStatus(tgId) {
  const user = getUserByTgId(tgId);
  if (!user) throw new Error("user not found");

  const invitedCount = countQualifiedInvitedByInviter(tgId);
  const claimedCount = Math.max(0, Number(user.referral_claimed_count || 0));
  const pendingCount = Math.max(0, invitedCount - claimedCount);
  const rateTon = 0.3;
  const minClaimTon = 5;
  const pendingTon = Number((pendingCount * rateTon).toFixed(2));

  return {
    invitedCount,
    claimedCount,
    pendingCount,
    rateTon,
    minClaimTon,
    pendingTon,
    canClaim: pendingTon >= minClaimTon,
  };
}

export function claimReferralToBalance(tgId) {
  const rateTon = 0.3;
  const minClaimTon = 5;

  const tx = db.transaction(() => {
    const user = getUserByTgId(tgId);
    if (!user) throw new Error("user not found");

    const invitedCount = countQualifiedInvitedByInviter(tgId);
    const claimedCount = Math.max(0, Number(user.referral_claimed_count || 0));
    const pendingCount = Math.max(0, invitedCount - claimedCount);
    const pendingTon = Number((pendingCount * rateTon).toFixed(2));

    if (pendingTon < minClaimTon) {
      throw new Error(`Минимальный вывод ${minClaimTon} TON`);
    }

    const newBalance = Number((Number(user.balance || 0) + pendingTon).toFixed(2));

    db.prepare(
      `UPDATE users SET balance = ?, referral_claimed_count = ? WHERE tg_id = ?`
    ).run(newBalance, invitedCount, String(tgId));

    return {
      ok: true,
      creditedTon: pendingTon,
      claimedFriends: pendingCount,
      newBalance,
      invitedCount,
      claimedCount: invitedCount,
      pendingCount: 0,
      rateTon,
      minClaimTon,
      canClaim: false,
    };
  });

  return tx();
}

// ===== Reward claims helpers =====
export function hasClaim(tgId, rewardKey) {
  const row = db.prepare(
    `
    SELECT 1 as ok
    FROM reward_claims
    WHERE tg_id = ? AND reward_key = ?
  `
  ).get(String(tgId), String(rewardKey));
  return !!row;
}

export function addClaim(tgId, rewardKey, amountTon = 0) {
  const now = Date.now();
  return db.prepare(
    `
    INSERT INTO reward_claims (tg_id, reward_key, claimed_at, amount_ton)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tg_id, reward_key) DO NOTHING
  `
  ).run(String(tgId), String(rewardKey), now, Number(amountTon || 0));
}

export function countInviteClaims(tgId) {
  const row = db.prepare(
    `
    SELECT COUNT(*) as c
    FROM reward_claims
    WHERE tg_id = ? AND reward_key LIKE 'invite_%'
  `
  ).get(String(tgId));
  return Number(row?.c || 0);
}

// ===== Broadcast helpers =====
export function listAllUserTgIds() {
  return db.prepare(`SELECT tg_id FROM users`).all().map((r) => String(r.tg_id));
}

export function createBroadcastJob({ text, delaySec = 0, parseMode = "HTML" }) {
  const now = Date.now();
  const runAt = now + Math.max(0, Number(delaySec || 0)) * 1000;

  const r = db
    .prepare(
      `
    INSERT INTO broadcast_jobs (created_at, run_at, status, text, parse_mode)
    VALUES (?, ?, 'pending', ?, ?)
  `
    )
    .run(now, runAt, String(text), String(parseMode));

  return { jobId: Number(r.lastInsertRowid), runAt };
}

export function takeDueBroadcastJob() {
  const now = Date.now();

  const job = db
    .prepare(
      `
    SELECT *
    FROM broadcast_jobs
    WHERE status = 'pending' AND run_at <= ?
    ORDER BY run_at ASC
    LIMIT 1
  `
    )
    .get(now);

  if (!job) return null;

  const r = db
    .prepare(
      `
    UPDATE broadcast_jobs
    SET status = 'running'
    WHERE id = ? AND status = 'pending'
  `
    )
    .run(Number(job.id));

  if (r.changes !== 1) return null;
  return job;
}

export function updateBroadcastJob(id, patch = {}) {
  const fields = [];
  const params = [];

  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    params.push(v === undefined ? null : v);
  }

  if (!fields.length) return;

  params.push(Number(id));
  db.prepare(`UPDATE broadcast_jobs SET ${fields.join(", ")} WHERE id = ?`).run(
    ...params
  );
}

// ===== Admin stats =====
export function getStats() {
  return db
    .prepare(
      `
    SELECT
      COUNT(*) as usersCount,
      COALESCE(SUM(balance), 0) as totalBalance,
      COALESCE(SUM(total_deposit_ton), 0) as totalDeposits
    FROM users
  `
    )
    .get();
}

// ===== Users list (paged + search) =====
export function listUsersPaged({ q = "", page = 1, limit = 20 }) {
  const qq = String(q || "").trim();
  const p = Math.max(1, Number(page || 1));
  const lim = Math.min(50, Math.max(1, Number(limit || 20)));
  const off = (p - 1) * lim;

  let where = "";
  let params = [];

  if (qq) {
    if (/^\d+$/.test(qq)) {
      where = "WHERE tg_id = ?";
      params = [qq];
    } else {
      const u = qq.replace(/^@/, "");
      where = "WHERE username LIKE ?";
      params = [`%${u}%`];
    }
  }

  const total = db
    .prepare(`SELECT COUNT(*) as c FROM users ${where}`)
    .get(...params).c;

  const items = db
    .prepare(
      `
    SELECT tg_id, username, first_name, last_name, balance, total_deposit_ton, last_seen_at
    FROM users
    ${where}
    ORDER BY last_seen_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(...params, lim, off);

  return { items, total, page: p, pages: Math.ceil(total / lim), limit: lim };
}

// ===== Inventory =====
export function listInventory(tgId) {
  return db
    .prepare(
      `
    SELECT emoji, name, price
    FROM user_inventory
    WHERE tg_id = ?
    ORDER BY id DESC
  `
    )
    .all(String(tgId));
}

export function addInventoryItem(tgId, item) {
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO user_inventory (tg_id, emoji, name, price, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(
    String(tgId),
    item?.emoji || null,
    String(item?.name || "Подарок"),
    Number(item?.price || 0),
    now
  );
}

export function removeInventoryItemByIndexNewestFirst(tgId, idx) {
  const rows = db
    .prepare(
      `
    SELECT id
    FROM user_inventory
    WHERE tg_id = ?
    ORDER BY id DESC
  `
    )
    .all(String(tgId));

  const row = rows[idx];
  if (!row) return null;

  const item = db
    .prepare(`SELECT emoji, name, price FROM user_inventory WHERE id = ?`)
    .get(row.id);

  db.prepare(`DELETE FROM user_inventory WHERE id = ?`).run(row.id);
  return item;
}

// ===== Promo =====
export function createPromo({
  code,
  type,
  amount = null,
  giftName = null,
  maxUses = 1,
}) {
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO promo_codes (code, type, amount, gift_name, max_uses, used_count, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 1, ?)
  `
  ).run(
    String(code),
    String(type),
    type === "balance" ? Number(amount || 0) : null,
    type === "gift" ? String(giftName || "Мишка") : null,
    Number(maxUses || 1),
    now
  );
}

export function listPromos() {
  return db
    .prepare(
      `
    SELECT code, type, amount, gift_name, max_uses, used_count, is_active, created_at
    FROM promo_codes
    ORDER BY created_at DESC
  `
    )
    .all();
}

export function deletePromo(code) {
  db.prepare(`DELETE FROM promo_codes WHERE code = ?`).run(String(code));
  db.prepare(`DELETE FROM promo_uses WHERE code = ?`).run(String(code));
}

export function redeemPromo(tgId, code) {
  const c = db
    .prepare(`SELECT * FROM promo_codes WHERE code = ?`)
    .get(String(code));

  if (!c || !c.is_active) throw new Error("Промокод не найден");
  if (c.used_count >= c.max_uses)
    throw new Error("Лимит использований исчерпан");

  const used = db
    .prepare(`SELECT 1 FROM promo_uses WHERE code = ? AND tg_id = ?`)
    .get(String(code), String(tgId));
  if (used) throw new Error("Этот промокод уже использован");

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO promo_uses (code, tg_id, used_at) VALUES (?, ?, ?)`
    ).run(String(code), String(tgId), now);

    db.prepare(
      `UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?`
    ).run(String(code));
  });

  tx();
  return c;
}

// ===== Crash (online) =====
export function getCurrentCrashRound() {
  return db
    .prepare(
      `SELECT * FROM crash_rounds WHERE status IN ('counting', 'flying') ORDER BY id DESC LIMIT 1`
    )
    .get();
}

export function getCrashRoundById(id) {
  return db.prepare(`SELECT * FROM crash_rounds WHERE id = ?`).get(Number(id));
}

export function createCrashRound(countdownMs = 7000) {
  const now = Date.now();
  const countdownEndsAt = now + countdownMs;
  db.prepare(
    `INSERT INTO crash_rounds (status, started_at, countdown_ends_at) VALUES ('counting', ?, ?)`
  ).run(now, countdownEndsAt);
  return getCurrentCrashRound();
}

export function setCrashRoundFlying(roundId, crashPoint, crashK = 0.07) {
  const now = Date.now();
  const crashTimeSec = Math.log(Math.max(1.001, crashPoint)) / crashK;
  const crashedAt = now + Math.round(crashTimeSec * 1000);
  db.prepare(
    `UPDATE crash_rounds SET status = 'flying', crash_point = ?, countdown_ends_at = NULL, flying_started_at = ?, crashed_at = ? WHERE id = ? AND status = 'counting'`
  ).run(crashPoint, now, crashedAt, roundId);
  return getCrashRoundById(roundId);
}

export function setCrashRoundCrashed(roundId) {
  db.prepare(`UPDATE crash_rounds SET status = 'crashed' WHERE id = ?`).run(roundId);
}

export function getCrashBetsForRound(roundId) {
  return db
    .prepare(
      `SELECT b.tg_id, b.amount, b.cashed_out, b.cashout_multiplier, b.first_name, b.username, b.photo_url
       FROM crash_bets b WHERE b.round_id = ? ORDER BY b.placed_at ASC`
    )
    .all(roundId);
}

export function placeCrashBet(roundId, tgId, amount, tgUser = null) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO crash_bets (round_id, tg_id, amount, placed_at, first_name, username, photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    roundId,
    String(tgId),
    amount,
    now,
    tgUser?.first_name ?? null,
    tgUser?.username ?? null,
    tgUser?.photo_url ?? null
  );
}

export function getCrashBet(roundId, tgId) {
  return db
    .prepare(`SELECT * FROM crash_bets WHERE round_id = ? AND tg_id = ?`)
    .get(roundId, String(tgId));
}

export function cashoutCrashBet(roundId, tgId, cashoutMultiplier) {
  return db
    .prepare(
      `UPDATE crash_bets SET cashed_out = 1, cashout_multiplier = ? WHERE round_id = ? AND tg_id = ? AND cashed_out = 0`
    )
    .run(cashoutMultiplier, roundId, String(tgId));
}

export function countBetsInRound(roundId) {
  const r = db.prepare(`SELECT COUNT(*) as c FROM crash_bets WHERE round_id = ?`).get(roundId);
  return Number(r?.c || 0);
}

export function getLastCrashPoints(limit = 10) {
  return db
    .prepare(
      `SELECT id, crash_point, crashed_at FROM crash_rounds WHERE status = 'crashed' AND crash_point IS NOT NULL ORDER BY id DESC LIMIT ?`
    )
    .all(limit);
}

export default db;
