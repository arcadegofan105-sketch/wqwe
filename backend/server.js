import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// ================== ENV ==================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set");
  process.exit(1);
}

// ================== PATHS ==================
// backend/server.js -> ROOT_DIR = корень репозитория
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, ".."); // например: /app

// Логи для проверки в Railway
console.log("DIRNAME:", __dirname);
console.log("ROOT_DIR:", ROOT_DIR);
console.log("FILES_IN_ROOT:", fs.readdirSync(ROOT_DIR).slice(0, 30));
console.log("INDEX_EXISTS:", fs.existsSync(path.join(ROOT_DIR, "index.html")));

// ================== STATIC ==================
app.use(express.static(ROOT_DIR)); // раздаёт /style.css /script.js /картинки [web:22]

// ================== HTML ROUTES ==================
app.get("/", (req, res) => {
  // ВАЖНО: "index.html" без ведущего "/"
  return res.sendFile("index.html", { root: ROOT_DIR }); // [web:127]
});

// если откроют любой другой путь (не /api) — тоже отдаём index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not Found" });
  }
  return res.sendFile("index.html", { root: ROOT_DIR }); // [web:127]
});

// ================== TELEGRAM initData AUTH ==================
function validateInitData(initData) {
  if (!initData || typeof initData !== "string") throw new Error("initData required");

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
    req.tgUser = validateInitData(req.body?.initData);
    next();
  } catch (e) {
    return res.status(401).json({ error: e.message || "unauthorized" });
  }
}

// ================== DEMO API (память) ==================
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
  if (!users.has(telegramId)) users.set(telegramId, { balance: 5, inventory: [] });
  return users.get(telegramId);
}

app.post("/api/me", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);
  return res.json({ balance: u.balance, inventory: u.inventory });
});

app.post("/api/spin", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);

  const SPIN_PRICE = 1;
  if (u.balance < SPIN_PRICE) return res.status(400).json({ error: "Недостаточно средств" });

  u.balance = Number((u.balance - SPIN_PRICE).toFixed(2));
  const prize = randomPrize();
  return res.json({ prize, newBalance: u.balance });
});

app.post("/api/prize/keep", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);

  const prize = req.body?.prize;
  if (!prize?.name) return res.status(400).json({ error: "prize required" });

  u.inventory.push(prize);
  return res.json({ ok: true });
});

app.post("/api/prize/sell", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);

  const prize = req.body?.prize;
  if (!prize?.name) return res.status(400).json({ error: "prize required" });

  const price = Number(prize.price || 0);
  u.balance = Number((u.balance + price).toFixed(2));

  const idx = u.inventory.findIndex(
    (x) => x?.name === prize.name && Number(x?.price || 0) === price
  );
  if (idx >= 0) u.inventory.splice(idx, 1);

  return res.json({ newBalance: u.balance });
});

app.post("/api/promo/apply", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);

  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "code required" });

  if (code !== "PROMO2026") return res.status(400).json({ error: "Неверный промокод" });

  const amount = 1;
  u.balance = Number((u.balance + amount).toFixed(2));
  return res.json({ amount, newBalance: u.balance });
});

// ================== START ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Listening on", PORT);
});
