import express from 'express'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { beginCell, Cell } from '@ton/core'

import db, {
  getUserByTgId,
  createUserFromTg,
  touchUserVisit,
  updateUserBalanceAndDeposit,
  updateUserBalance,
} from './db.js'

const app = express()
app.use(express.json())

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set')
  process.exit(1)
}

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID // 7995955451
if (!ADMIN_CHAT_ID) {
  console.error('❌ ADMIN_CHAT_ID is not set')
  process.exit(1)
}

// ✅ Deposit config (Railway Variables)
const TON_DEPOSIT_ADDRESS = String(process.env.TON_DEPOSIT_ADDRESS || '')
  .replace(/\s+/g, '')
  .trim()
if (!TON_DEPOSIT_ADDRESS) {
  console.error('❌ TON_DEPOSIT_ADDRESS is not set')
  process.exit(1)
}

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY
if (!TONCENTER_API_KEY) {
  console.error('❌ TONCENTER_API_KEY is not set')
  process.exit(1)
}

const TONCENTER_BASE = 'https://toncenter.com/api/v2'
const MIN_DEPOSIT_TON = 0.1

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// фронт лежит в backend/public
const PUBLIC_DIR = path.join(__dirname, 'public')
const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html')

console.log('PUBLIC_DIR:', PUBLIC_DIR)
console.log(
  'PUBLIC_FILES:',
  fs.existsSync(PUBLIC_DIR)
    ? fs.readdirSync(PUBLIC_DIR).slice(0, 50)
    : 'NO_DIR',
)
console.log('INDEX_EXISTS:', fs.existsSync(INDEX_PATH))

app.use(express.static(PUBLIC_DIR))
app.get('/', (req, res) => res.sendFile(INDEX_PATH))

// ===== Telegram initData validation =====
function validateInitData(initData) {
  if (!initData || typeof initData !== 'string')
    throw new Error('initData required')

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) throw new Error('hash missing')
  params.delete('hash')

  const pairs = []
  for (const [k, v] of params.entries()) pairs.push(`${k}=${v}`)
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest()
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  if (calculatedHash !== hash) throw new Error('invalid initData hash')

  const authDate = Number(params.get('auth_date') || 0)
  if (!authDate) throw new Error('auth_date missing')
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 24 * 60 * 60) throw new Error('initData expired')

  const userStr = params.get('user')
  if (!userStr) throw new Error('user missing')
  const user = JSON.parse(userStr)
  if (!user?.id) throw new Error('user id missing')

  return user
}

function auth(req, res, next) {
  try {
    req.tgUser = validateInitData(req.body?.initData)
    next()
  } catch (e) {
    res.status(401).json({ error: e.message || 'unauthorized' })
  }
}

// ===== Telegram notify helper (sendMessage) =====
async function sendAdminMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    console.error('❌ Telegram sendMessage failed:', data)
    throw new Error('Не удалось отправить сообщение админу')
  }
  return data
}

// ===== TON Center helper (getTransactions) =====
async function toncenterGetTransactions(address, limit = 25) {
  const url = new URL(`${TONCENTER_BASE}/getTransactions`)
  url.searchParams.set('address', address)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': TONCENTER_API_KEY },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `TON Center error`)
  }
  return data?.result || []
}

// ===== Deposit payload helpers (BOC comment) =====
function makeCommentPayloadBase64(text) {
  // Text comment: op=0 (32 bits) + UTF-8 string
  return beginCell()
    .storeUint(0, 32)
    .storeStringTail(text)
    .endCell()
    .toBoc()
    .toString('base64')
}

function tryDecodeCommentFromBodyBase64(bodyBase64) {
  try {
    const cell = Cell.fromBoc(Buffer.from(bodyBase64, 'base64'))[0]
    const s = cell.beginParse()
    const op = s.loadUint(32)
    if (op !== 0) return ''
    return s.loadStringTail()
  } catch {
    return ''
  }
}

// В toncenter иногда комментарий может быть не в in_msg.message.
// Правильно: msg_data.body = base64 BOC, который надо декодить.
function extractIncomingComment(tx) {
  const inMsg = tx?.in_msg || {}

  const msgText = inMsg?.message
  if (typeof msgText === 'string' && msgText.trim()) return msgText.trim()

  const body = inMsg?.msg_data?.body
  if (typeof body === 'string' && body.trim()) {
    const decoded = tryDecodeCommentFromBodyBase64(body.trim())
    if (decoded) return decoded.trim()
  }

  return ''
}

// ===== In-memory storage (инвентарь/промо до переноса в БД) =====
const users = new Map() // inventory, usedPromos, runtime‑состояние

// ===== User helpers (через БД + память) =====
function getOrCreateUser(id, tgUserForCreate) {
  if (!users.has(id)) {
    users.set(id, {
      balance: 0,
      inventory: [],
      usedPromos: [],
      totalDepositTon: 0,
    })
  }
  const mem = users.get(id)

  let dbUser = getUserByTgId(id)
  if (!dbUser && tgUserForCreate) {
    dbUser = createUserFromTg(tgUserForCreate)
  }

  if (dbUser) {
    mem.balance = Number(dbUser.balance || 0)
    mem.totalDepositTon = Number(dbUser.total_deposit_ton || 0)
  }

  return mem
}

// ===== In-memory pending deposits (до БД) =====
const pendingDeposits = new Map()
// depositId -> { userId, amount, comment, createdAt, credited }

function makeDepositId() {
  return crypto.randomBytes(12).toString('hex')
}

// ===== Promo config =====
const PROMOS = {
  Free05: 0.5,
  Admintestcodesss: 50,
  Giftbear: 'GIFT_BEAR', // промокод на подарок "Мишка"
}

// ===== API =====
app.post('/api/me', auth, (req, res) => {
  const tgUser = req.tgUser
  const id = String(tgUser.id)

  const dbUser = touchUserVisit(tgUser)

  const u = getOrCreateUser(id, tgUser)
  u.balance = Number(dbUser.balance || 0)
  u.totalDepositTon = Number(dbUser.total_deposit_ton || 0)

  res.json({
    balance: u.balance,
    inventory: u.inventory,
    totalDepositTon: Number(u.totalDepositTon || 0),
    visitsCount: dbUser.visits_count,
  })
})

// ===== Admin: список пользователей (отправка в чат) =====
app.post('/api/admin/users/summary', auth, async (req, res) => {
  if (String(req.tgUser.id) !== String(ADMIN_CHAT_ID)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  try {
    const usersRows = db.prepare(`
      SELECT 
        tg_id,
        username,
        first_name,
        last_name,
        balance,
        total_deposit_ton,
        visits_count
      FROM users
      ORDER BY id DESC
      LIMIT 50
    `).all()

    if (!usersRows.length) {
      await sendAdminMessage('📊 Пока нет ни одного пользователя в базе.')
      return res.json({ ok: true, usersCount: 0 })
    }

    const lines = usersRows.map(u => {
      const name = (u.first_name || '') + (u.last_name ? ' ' + u.last_name : '')
      const uname = u.username ? `@${u.username}` : '(no username)'
      return [
        `ID: ${u.tg_id}`,
        `Имя: ${name || '—'} ${uname}`,
        `Баланс: ${Number(u.balance || 0).toFixed(2)} TON`,
        `Суммарный деп: ${Number(u.total_deposit_ton || 0).toFixed(2)} TON`,
        `Визиты: ${u.visits_count}`,
      ].join(' | ')
    })

    const text =
      '📊 Список пользователей (последние 50):\n\n' +
      lines.join('\n')

    await sendAdminMessage(text)

    res.json({ ok: true, usersCount: usersRows.length })
  } catch (e) {
    res.status(500).json({ error: e.message || 'db error' })
  }
})

// ===== Admin: изменить баланс пользователя =====
app.post('/api/admin/adjust-balance', auth, (req, res) => {
  if (String(req.tgUser.id) !== String(ADMIN_CHAT_ID)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const tgIdRaw = req.body?.tgId
  const deltaRaw = req.body?.amount

  const tgId = String(tgIdRaw || '').trim()
  const delta = Number(deltaRaw)

  if (!tgId) {
    return res.status(400).json({ error: 'tgId required' })
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'Некорректная сумма изменения' })
  }

  const dbUser = getUserByTgId(tgId)
  if (!dbUser) {
    return res.status(404).json({ error: 'Пользователь не найден в БД' })
  }

  const newBalance = Number((Number(dbUser.balance || 0) + delta).toFixed(2))

  updateUserBalance(tgId, newBalance)

  const u = getOrCreateUser(tgId)
  u.balance = newBalance

  const direction = delta >= 0 ? 'Выдача' : 'Списание'
  const username = dbUser.username ? `@${dbUser.username}` : '(no username)'
  const fullName = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ')

  const text =
    `🛠 ${direction} баланса (админ)\n\n` +
    `Пользователь: ${fullName || 'User'} ${username}\n` +
    `ID: ${tgId}\n` +
    `Изменение: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} TON\n` +
    `Новый баланс: ${newBalance.toFixed(2)} TON`

  sendAdminMessage(text).catch(() => {})

  return res.json({ ok: true, newBalance })
})

// /api/spin не трогаем: всегда мишка
app.post('/api/spin', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  if (u.balance < 1)
    return res.status(400).json({ error: 'Недостаточно средств' })
  u.balance = Number((u.balance - 1).toFixed(2))
  updateUserBalance(id, u.balance)

  res.json({
    prize: { emoji: '🧸', name: 'Мишка', price: 0.1 },
    newBalance: u.balance,
  })
})

// ===== Promo apply =====
app.post('/api/promo/apply', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const code = String(req.body?.code || '').trim()
  if (!code) return res.status(400).json({ error: 'Введите промокод' })

  const promo = PROMOS[code]
  if (!promo) return res.status(400).json({ error: 'Промокод не найден' })

  if (u.usedPromos.includes(code)) {
    return res.status(400).json({ error: 'Этот промокод уже использован' })
  }

  u.usedPromos.push(code)

  if (typeof promo === 'number') {
    const amount = promo
    u.balance = Number((u.balance + amount).toFixed(2))
    updateUserBalance(id, u.balance)
    return res.json({ type: 'balance', newBalance: u.balance, amount })
  }

  if (promo === 'GIFT_BEAR') {
    const prize = {
      emoji: '🧸',
      name: 'Мишка',
      price: 0.1,
    }
    u.inventory.push(prize)
    return res.json({ type: 'gift', prize, inventory: u.inventory })
  }

  return res.status(400).json({ error: 'Некорректный промокод' })
})

// ===== Prize keep/sell =====
app.post('/api/prize/keep', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const prize = req.body?.prize
  if (!prize || typeof prize !== 'object') {
    return res.status(400).json({ error: 'prize required' })
  }

  const emoji = String(prize.emoji || '🎁')
  const name = String(prize.name || 'Подарок')
  const price = Number(prize.price || 0)

  u.inventory.push({ emoji, name, price })

  res.json({ ok: true, inventory: u.inventory })
})

app.post('/api/prize/sell', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const prize = req.body?.prize
  if (!prize || typeof prize !== 'object') {
    return res.status(400).json({ error: 'prize required' })
  }

  const price = Number(prize.price || 0)
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Этот подарок нельзя продать' })
  }

  const idxRaw = req.body?.idx
  if (idxRaw !== undefined && idxRaw !== null && idxRaw !== '') {
    const idx = Number(idxRaw)
    if (!Number.isInteger(idx) || idx < 0 || idx >= u.inventory.length) {
      return res.status(400).json({ error: 'Некорректный индекс предмета' })
    }

    const item = u.inventory[idx]
    if (!item) return res.status(400).json({ error: 'Предмет не найден' })

    if (
      String(item.name) !== String(prize.name) ||
      Number(item.price || 0) !== price
    ) {
      return res.status(400).json({ error: 'Предмет не найден' })
    }

    u.inventory.splice(idx, 1)
  }

  u.balance = Number((u.balance + price).toFixed(2))
  updateUserBalance(id, u.balance)
  res.json({ newBalance: u.balance, inventory: u.inventory })
})

// ===== Withdraw TON (списываем + заявка админу) =====
app.post('/api/withdraw/ton', auth, async (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const amount = Number(req.body?.amount || 0)
  if (!Number.isFinite(amount))
    return res.status(400).json({ error: 'Некорректная сумма' })

  const REQUIRED_TOTAL_DEPOSIT = 1
  if ((u.totalDepositTon || 0) < REQUIRED_TOTAL_DEPOSIT) {
    return res.status(400).json({
      error: 'Прежде чем вывести, нужно сделать минимальное пополнение 1 TON',
      code: 'DEPOSIT_REQUIRED',
      requiredTotalDeposit: REQUIRED_TOTAL_DEPOSIT,
      currentTotalDeposit: Number(u.totalDepositTon || 0),
    })
  }

  const MIN_WITHDRAW = 5
  if (amount < MIN_WITHDRAW)
    return res.status(400).json({ error: `Минимум ${MIN_WITHDRAW} TON` })
  if (amount > u.balance)
    return res.status(400).json({ error: 'Недостаточно средств' })

  u.balance = Number((u.balance - amount).toFixed(2))
  updateUserBalance(id, u.balance)

  const username = req.tgUser?.username
    ? `@${req.tgUser.username}`
    : '(no username)'
  const fullName = [req.tgUser?.first_name, req.tgUser?.last_name]
    .filter(Boolean)
    .join(' ')
  const totalDep = Number(u.totalDepositTon || 0).toFixed(2)

  const text =
    `💸 Заявка на вывод TON\n` +
    `Пользователь: ${fullName || 'User'} ${username}\n` +
    `ID: ${id}\n` +
    `Сумма: ${amount.toFixed(2)} TON\n` +
    `Баланс после списания: ${Number(u.balance || 0).toFixed(2)} TON\n` +
    `Суммарный депозит: ${totalDep} TON`

  try {
    await sendAdminMessage(text)
  } catch (e) {
    u.balance = Number((u.balance + amount).toFixed(2))
    updateUserBalance(id, u.balance)
    return res.status(500).json({ error: e.message || 'Ошибка уведомления' })
  }

  return res.json({ ok: true, newBalance: u.balance })
})

// ===== Withdraw Gift (удаляем из инвентаря + заявка админу) =====
app.post('/api/withdraw/gift', auth, async (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const REQUIRED_TOTAL_DEPOSIT = 1
  if ((u.totalDepositTon || 0) < REQUIRED_TOTAL_DEPOSIT) {
    return res.status(400).json({
      error: 'Прежде чем вывести, нужно сделать минимальное пополнение 1 TON',
      code: 'DEPOSIT_REQUIRED',
      requiredTotalDeposit: REQUIRED_TOTAL_DEPOSIT,
      currentTotalDeposit: Number(u.totalDepositTon || 0),
    })
  }

  const idx = Number(req.body?.idx)
  if (!Number.isInteger(idx) || idx < 0 || idx >= u.inventory.length) {
    return res.status(400).json({ error: 'Некорректный предмет' })
  }

  const item = u.inventory[idx]
  u.inventory.splice(idx, 1)

  const username = req.tgUser?.username
    ? `@${req.tgUser.username}`
    : '(no username)'
  const fullName = [req.tgUser?.first_name, req.tgUser?.last_name]
    .filter(Boolean)
    .join(' ')
  const totalDep = Number(u.totalDepositTon || 0).toFixed(2)

  const text =
    `🎁 Заявка на вывод подарка\n` +
    `Пользователь: ${fullName || 'User'} ${username}\n` +
    `ID: ${id}\n` +
    `Подарок: ${item?.emoji || '🎁'} ${item?.name || 'Подарок'}\n` +
    `Оценка: ${Number(item?.price || 0).toFixed(2)} TON\n` +
    `Суммарный депозит: ${totalDep} TON`

  try {
    await sendAdminMessage(text)
  } catch (e) {
    u.inventory.splice(idx, 0, item)
    return res.status(500).json({ error: e.message || 'Ошибка уведомления' })
  }

  return res.json({ ok: true, inventory: u.inventory })
})

// ===== Deposit (auto) =====
app.post('/api/deposit/info', auth, (req, res) => {
  res.json({ address: TON_DEPOSIT_ADDRESS, minDeposit: MIN_DEPOSIT_TON })
})

// создаём ожидаемый депозит с уникальным комментом + payloadBase64 (BOC)
app.post('/api/deposit/create', auth, (req, res) => {
  const userId = String(req.tgUser.id)
  const amount = Number(req.body?.amount || 0)

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Некорректная сумма' })
  }
  if (amount < MIN_DEPOSIT_TON) {
    return res.status(400).json({ error: `Минимум ${MIN_DEPOSIT_TON} TON` })
  }

  const depositId = makeDepositId()
  const comment = `dep_${userId}_${depositId}`
  const payloadBase64 = makeCommentPayloadBase64(comment)

  pendingDeposits.set(depositId, {
    userId,
    amount: Number(amount.toFixed(2)),
    comment,
    createdAt: Date.now(),
    credited: false,
  })

  res.json({
    depositId,
    address: TON_DEPOSIT_ADDRESS,
    amount: Number(amount.toFixed(2)),
    comment,
    payloadBase64,
  })
})

// проверяем входящие и начисляем
app.post('/api/deposit/check', auth, async (req, res) => {
  const userId = String(req.tgUser.id)
  const depositId = String(req.body?.depositId || '')

  const dep = pendingDeposits.get(depositId)
  if (!dep || dep.userId !== userId)
    return res.status(404).json({ error: 'deposit not found' })
  if (dep.credited) {
    const u = getOrCreateUser(userId, req.tgUser)
    return res.json({ ok: true, credited: true, newBalance: u.balance })
  }

  let txs = []
  try {
    txs = await toncenterGetTransactions(TON_DEPOSIT_ADDRESS, 25)
  } catch (e) {
    return res.status(500).json({ error: e.message || 'toncenter error' })
  }

  const found = txs.find(tx => {
    const comment = extractIncomingComment(tx)
    return typeof comment === 'string' && comment.includes(dep.comment)
  })

  if (!found) {
    return res.json({ ok: true, credited: false })
  }

  const u = getOrCreateUser(userId, req.tgUser)
  u.balance = Number((u.balance + dep.amount).toFixed(2))
  u.totalDepositTon = Number(((u.totalDepositTon || 0) + dep.amount).toFixed(2))

  updateUserBalanceAndDeposit(userId, {
    balance: u.balance,
    totalDepositTon: u.totalDepositTon,
  })

  dep.credited = true
  pendingDeposits.set(depositId, dep)

  sendAdminMessage(
    `✅ Депозит зачислен\nID: ${userId}\nСумма: ${dep.amount.toFixed(
      2,
    )} TON\nDepositId: ${depositId}`,
  ).catch(() => {})

  return res.json({ ok: true, credited: true, newBalance: u.balance })
})

// ===== Crash sync (общий баланс) =====
app.post('/api/crash/bet', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const amount = Number(req.body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'amount required' })

  if (u.balance < amount)
    return res.status(400).json({ error: 'Недостаточно средств' })

  u.balance = Number((u.balance - amount).toFixed(2))
  updateUserBalance(id, u.balance)
  res.json({ newBalance: u.balance })
})

app.post('/api/crash/cashout', auth, (req, res) => {
  const id = String(req.tgUser.id)
  const u = getOrCreateUser(id, req.tgUser)

  const amount = Number(req.body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'amount required' })

  u.balance = Number((u.balance + amount).toFixed(2))
  updateUserBalance(id, u.balance)
  res.json({ newBalance: u.balance })
})

// fallback: любые не-API роуты -> index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api'))
    return res.status(404).json({ error: 'Not Found' })
  res.sendFile(INDEX_PATH)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => console.log('✅ Listening on', PORT))
