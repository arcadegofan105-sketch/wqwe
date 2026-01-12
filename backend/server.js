import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// ====== ENV ======
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set");
  process.exit(1);
}

// ====== PATHS ======
// server.js находится в /backend, а фронт лежит в корне репо (..)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, ".."); // <- корень репозитория

// ====== STATIC ======
// Раздаём: /index.html, /style.css, /script.js, /toncoin-ton-logo.jpg и т.д.
app.use(express.static(ROOT_DIR)); // [web:22]

// Главная (чтобы не было 404 на "/")
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

// ====== TELEGRAM initData validation ======
// Алгоритм: HMAC-SHA256(WebAppData, BOT_TOKEN) -> secretKey,
// затем HMAC-SHA256(secretKey, data_check_string) и сравнить с hash [web:6]
function validateInitData(initData) {
  if (!initData || typeof initData !== "string") {
    throw new Error("initData required");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("hash missing");
  params.delete("hash");

  const pairs = [];
  for (const [k, v] of params.entries()) pairs.push(`${k}=${v}`);
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (calculatedHash !== hash) throw new Error("invalid initData hash");

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate) throw new Error("auth_date missing");

  // анти-replay (например 24 часа)
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 24 * 60 * 60) throw new Error("initData expired");

  const userStr = params.get("user");
  if (!userStr) throw new Error("user missing");

  const user = JSON.parse(userStr);
  if (!user?.id) throw new Error("user id missing");

  return user;
}

function auth(req, res, next) {
  try {
    const user = validateInitData(req.body?.initData);
    req.tgUser = user;
    next();
  } catch (e) {
    res.status(401).json({ error: e.message || "unauthorized" });
  }
}

// ====== GAME DATA (пока память, БД добавим следующим шагом) ======
const wheelSectors = [
  { emoji: "🧸", name: "Мишка", price: 0.1 },
  { emoji: "🐸", name: "Пепе", price: 0.0 },
  { emoji: "💋", name: "Губы", price: 0.0 },
  { emoji: "📅", name: "Календарь", price: 1.5 },
  { emoji: "🍀", name: "Клевер", price: 0.0 },
  { emoji: "🍑", name: "Слива", price: 0.0 },
  { emoji: "🧸", name: "Мишка", price: 0.1 },
];

function randomPrize() {
  return wheelSectors[Math.floor(Math.random() * wheelSectors.length)];
}

const users = new Map(); // telegramId -> { balance, inventory }

function getOrCreateUser(telegramId) {
  if (!users.has(telegramId)) {
    users.set(telegramId, { balance: 5, inventory: [] });
  }
  return users.get(telegramId);
}

// ====== API ======
app.post("/api/me", auth, (req, res) => {
  const telegramId = String(req.tgUser.id);
  const u = getOrCreateUser(telegramId);
  res.json({ balance: u.balance, inventory: u.inventory });
});

app.post("/api/spin", auth, (req, res) => {
  const telegramId = String(req.tgUser.id);
  const u = getOrCreateUser(telegramId);

  const SPIN_PRICE = 1;
  if (u.balance < SPIN_PRICE) return res.status(400).json({ error: "Недостаточно средств" });

  u.balance = Number((u.balance - SPIN_PRICE).toFixed(2));
  const prize = randomPrize();
  res.json({ prize, newBalance: u.balance });
});

app.post("/api/prize/keep", auth, (req, res) => {
  const telegramId = String(req.tgUser.id);
  const u = getOrCreateUser(telegramId);

  const prize = req.body?.prize;
  if (!prize?.name) return res.status(400).json({ error: "prize required" });

  u.inventory.push(prize);
  res.json({ ok: true });
});

app.post("/api/prize/sell", auth, (req, res) => {
  const telegramId = String(req.tgUser.id);
  const u = getOrCreateUser(telegramId);

  const prize = req.body?.prize;
  if (!prize?.name) return res.status(400).json({ error: "prize required" });

  const price = Number(prize.price || 0);
  u.balance = Number((u.balance + price).toFixed(2));

  // если продаём из инвентаря — удалим 1 совпадение
  const idx = u.inventory.findIndex(
    (x) => x?.name === prize.name && Number(x?.price || 0) === price
  );
  if (idx >= 0) u.inventory.splice(idx, 1);

  res.json({ newBalance: u.balance });
});

app.post("/api/promo/apply", auth, (req, res) => {
  const telegramId = String(req.tgUser.id);
  const u = getOrCreateUser(telegramId);

  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "code required" });

  if (code !== "PROMO2026") return res.status(400).json({ error: "Неверный промокод" });

  const amount = 1;
  u.balance = Number((u.balance + amount).toFixed(2));
  res.json({ amount, newBalance: u.balance });
});

// ====== SPA fallback ======
// Если пользователь откроет /something — отдаём index.html, чтобы UI не ломался
app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Listening on", PORT);
});
