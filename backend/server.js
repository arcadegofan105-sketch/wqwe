import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ВАЖНО: фронт теперь лежит в backend/public
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_PATH = path.join(PUBLIC_DIR, "index.html");

console.log("PUBLIC_DIR:", PUBLIC_DIR);
console.log("PUBLIC_FILES:", fs.existsSync(PUBLIC_DIR) ? fs.readdirSync(PUBLIC_DIR).slice(0, 50) : "NO_DIR");
console.log("INDEX_EXISTS:", fs.existsSync(INDEX_PATH));

app.use(express.static(PUBLIC_DIR)); // раздаём статику [web:22]

app.get("/", (req, res) => res.sendFile(INDEX_PATH));

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
    res.status(401).json({ error: e.message || "unauthorized" });
  }
}

// минимальные API, чтобы фронт не падал
const users = new Map();
function getOrCreateUser(id) {
  if (!users.has(id)) users.set(id, { balance: 5, inventory: [] });
  return users.get(id);
}

app.post("/api/me", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);
  res.json({ balance: u.balance, inventory: u.inventory });
});

app.post("/api/spin", auth, (req, res) => {
  const id = String(req.tgUser.id);
  const u = getOrCreateUser(id);
  if (u.balance < 1) return res.status(400).json({ error: "Недостаточно средств" });
  u.balance = Number((u.balance - 1).toFixed(2));
  res.json({ prize: { emoji: "🧸", name: "Мишка", price: 0.1 }, newBalance: u.balance });
});

// fallback: любые не-API роуты -> index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not Found" });
  res.sendFile(INDEX_PATH);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("✅ Listening on", PORT));
