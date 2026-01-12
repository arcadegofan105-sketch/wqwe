import express from 'express'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(express.json())

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
	console.error('BOT_TOKEN not set')
	process.exit(1)
}

// --- пути (чтобы раздавать ../public) ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.join(__dirname, '..', 'public')

// --- статика ---
app.use(express.static(PUBLIC_DIR)) // [web:22]

// --- validate initData ---
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

	if (calculatedHash !== hash) throw new Error('invalid initData hash') // [web:13][web:6]

	const authDate = Number(params.get('auth_date') || 0)
	if (!authDate) throw new Error('auth_date missing')
	const now = Math.floor(Date.now() / 1000)
	if (now - authDate > 24 * 60 * 60) throw new Error('initData expired') // Telegram рекомендует проверять актуальность [web:13]

	const userStr = params.get('user')
	if (!userStr) throw new Error('user missing')

	const user = JSON.parse(userStr)
	if (!user?.id) throw new Error('user id missing')

	return user
}

function auth(req, res, next) {
	try {
		const user = validateInitData(req.body?.initData)
		req.tgUser = user
		next()
	} catch (e) {
		res.status(401).json({ error: e.message || 'unauthorized' })
	}
}

// --- простая "база" в памяти ---
const users = new Map() // telegramId -> {balance, inventory}
function getOrCreateUser(id) {
	if (!users.has(id)) users.set(id, { balance: 5, inventory: [] })
	return users.get(id)
}

// --- API ---
app.post('/api/me', auth, (req, res) => {
	const id = String(req.tgUser.id)
	const u = getOrCreateUser(id)
	res.json({ balance: u.balance, inventory: u.inventory })
})

app.post('/api/spin', auth, (req, res) => {
	const id = String(req.tgUser.id)
	const u = getOrCreateUser(id)

	const SPIN_PRICE = 1
	if (u.balance < SPIN_PRICE)
		return res.status(400).json({ error: 'Недостаточно средств' })

	u.balance = Number((u.balance - SPIN_PRICE).toFixed(2))

	// пример приза
	const prize = { emoji: '🧸', name: 'Мишка', price: 0.1 }
	res.json({ prize, newBalance: u.balance })
})

// SPA fallback (если вдруг будут “красивые” роуты)
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')))

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => console.log('Listening on', PORT))
