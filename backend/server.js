import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { beginCell, Cell } from "@ton/core";

import db, {
  touchUserVisit,
  getUserByTgId,
  updateUserBalance,
  updateUserBalanceAndDeposit,
  listInventory,
  addInventoryItem,
  removeInventoryItemByIndexNewestFirst,
  getStats,
  listUsersPaged,
  createPromo,
  listPromos,
  deletePromo,
  redeemPromo,
  // NEW:
  tryBindReferral,
  countInvitedByInviter,
  addClaim,
  hasClaim,
  countInviteClaims,
} from "./db.js";

const app = express();
app.use(express.json());

// ===== ENV =====
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set");
  process.exit(1);
}

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // куда слать уведомления (заявки)
if (!ADMIN_CHAT_ID) {
  console.error("❌ ADMIN_CHAT_ID is not set");
  process.exit(1);
}

const ADMIN_TG_ID = String(process.env.ADMIN_TG_ID || "").trim(); // кто видит админку/админ API

// ✅ Deposit config (Railway Variables)
const TON_DEPOSIT_ADDRESS = String(process.env.TON_DEPOSIT_ADDRESS || "")
  .replace(/\s+/g, "")
  .trim();
if (!TON_DEPOSIT_ADDRESS) {
  console.error("❌ TON_DEPOSIT_ADDRESS is not set");
  process.exit(1);
}

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
if (!TONCENTER_API_KEY) {
  console.error("❌ TONCENTER_API_KEY is not set");
  process.exit(1);
}

const TONCENTER_BASE = "https://toncenter.com/api/v2";
const MIN_DEPOSIT_TON = 0.1;

// ===== STATIC =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_PATH = path.join(PUBLIC_DIR, "index.html");

console.log("PUBLIC_DIR:", PUBLIC_DIR);
console.log(
  "PUBLIC_FILES:",
  fs.existsSync(PUBLIC_DIR) ? fs.readdirSync(PUBLIC_DIR).slice(0, 50) : "NO_DIR"
);
console.log("INDEX_EXISTS:", fs.existsSync(INDEX_PATH));

app.use(express.static(PUBLIC_DIR));
app.get("/", (req, res) => res.sendFile(INDEX_PATH));

// ===== Telegram initData validation =====
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

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

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
    res.status(401).json({ error: e.message || "unauthorized" });
  }
}

function requireAdmin(req, res, next) {
  if (!ADMIN_TG_ID) return res.status(500).json({ error: "ADMIN_TG_ID is not set" });
  const id = String(req.tgUser?.id || "");
  if (id !== ADMIN_TG_ID) return res.status(403).json({ error: "forbidden" });
  next();
}

// ===== Telegram notify helper (sendMessage) =====
async function sendAdminMessage(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    console.error("❌ Telegram sendMessage failed:", data);
    throw new Error("Не удалось отправить сообщение админу");
  }
  return data;
}

// ===== TON Center helper (getTransactions) =====
async function toncenterGetTransactions(address, limit = 25) {
  const url = new URL(`${TONCENTER_BASE}/getTransactions`);
  url.searchParams.set("address", address);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": TONCENTER_API_KEY },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `TON Center error`);
  }
  return data?.result || [];
}

// ===== Deposit payload helpers (BOC comment) =====
function makeCommentPayloadBase64(text) {
  return beginCell()
    .storeUint(0, 32)
    .storeStringTail(text)
    .endCell()
    .toBoc()
    .toString("base64");
}

function tryDecodeCommentFromBodyBase64(bodyBase64) {
  try {
    const cell = Cell.fromBoc(Buffer.from(bodyBase64, "base64"))[0];
    const s = cell.beginParse();
    const op = s.loadUint(32);
    if (op !== 0) return "";
    return s.loadStringTail();
  } catch {
    return "";
  }
}

function extractIncomingComment(tx) {
  const inMsg = tx?.in_msg || {};

  const msgText = inMsg?.message;
  if (typeof msgText === "string" && msgText.trim()) return msgText.trim();

  const body = inMsg?.msg_data?.body;
  if (typeof body === "string" && body.trim()) {
    const decoded = tryDecodeCommentFromBodyBase64(body.trim());
    if (decoded) return decoded.trim();
  }

  return "";
}

// ===== In-memory pending deposits (ok for MVP) =====
const pendingDeposits = new Map();
// depositId -> { userId, amount, comment, createdAt, credited }

function makeDepositId() {
  return crypto.randomBytes(12).toString("hex");
}

// ===== Helpers =====
function mustGetUser(tgId) {
  const user = getUserByTgId(tgId);
  if (!user) throw new Error("user not found");
  return user;
}

function safeNumber(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}

// ===== API =====
app.post("/api/me", auth, (req, res) => {
  const tgUser = req.tgUser;
  const u = touchUserVisit(tgUser);
  try {
    const params = new URLSearchParams(req.body?.initData || "");
    const startParam = String(params.get("start_param") || "").trim(); // inviter tg_id
    if (startParam && /^\d+$/.test(startParam)) {
      tryBindReferral(String(tgUser.id), startParam);
    }
  } catch {}

  const inventory = listInventory(tgUser.id);

    res.json({
    balance: safeNumber(u.balance, 0),
    inventory,
    totalDepositTon: safeNumber(u.total_deposit_ton, 0),
    isAdmin: String(tgUser.id) === ADMIN_TG_ID,

    // НОВОЕ: состояние колеса
    freeWheelAvailable: !!u.free_wheel_available,
    wheelDepositProgressTon: safeNumber(u.wheel_deposit_progress_ton, 0),
  });

});


// spin: колесо — платно или бесплатно по депозитам
app.post("/api/spin", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const user = mustGetUser(tgId);
  const balance = safeNumber(user.balance, 0);

  const SPIN_PRICE = 1;          // цена платного спина
  const WHEEL_DEPOSIT_TARGET = 0.5;

  const freeWheelAvailable = !!user.free_wheel_available;
  const wheelDepositProgressTon = safeNumber(user.wheel_deposit_progress_ton, 0);

  let isFreeSpin = false;
  let newBalance = balance;

  if (freeWheelAvailable) {
    // бесплатное колесо — баланс не трогаем
    isFreeSpin = true;
  } else {
    // платный спин
    if (balance < SPIN_PRICE) {
      return res.status(400).json({ error: "Недостаточно средств" });
    }
    newBalance = Number((balance - SPIN_PRICE).toFixed(2));
    updateUserBalance(tgId, newBalance);
  }

  // приз (пока всегда мишка)
  const prize = { emoji: "🧸", name: "Bear", price: 0.1 };
  addInventoryItem(tgId, prize);

  // если бесплатный спин — сбрасываем флаг
  if (freeWheelAvailable) {
    db.prepare(
      `UPDATE users SET free_wheel_available = 0 WHERE tg_id = ?`
    ).run(tgId);
  }

  return res.json({
    prize,
    newBalance,
    freeWheelAvailable: false,          // после спина бесплатного флага нет
    wheelDepositProgressTon,            // прогресс не меняем тут, только при депозите
    isFreeSpin,
  });
});





// ===== CASES =====
// Конфиг кейсов: названия + цены
const CASES = {
  newyear: { title: "calendar",       priceTon: 0.2 },
  onlynft: { title: "Классический",   priceTon: 1.0 },
  crypto:  { title: "Все или ничего", priceTon: 0.5 },
};

// Пул призов с шансами (для трёх кейсов)
const CASE_PRIZES = {
  newyear: [
    // сумма весов = 10000 (удобно читать как проценты * 100)
    { emoji: "📅", name: "Celendar (random)",   price: 1.5,  weight: 5 },   // 0.05%
    { emoji: "🍭", name: "lolpop",              price: 7.0,  weight: 3 },   // 0.03%
    { emoji: "🧦", name: "socks",               price: 10.0, weight: 2 },   // 0.02%
    { emoji: "🪆", name: "Woodoo (random)",     price: 30.0, weight: 1 },   // 0.01%
    { emoji: "🧸", name: "Bear",                price: 0.1,  weight: 9989 } // 99.89% ≈ 99.9%
  ],

onlynft: [
    // сумма весов = 100000 (Bear ≈ 99%, остальные суммарно ≈ 1%)
    { emoji: "🐸", name: "Plush Pepe Pink Latex", price: 10000.0, weight: 0 },    // 0%
    { emoji: "💔", name: "Trapped Hearts",        price: 20.0,    weight: 100 },  // 0.10%
    { emoji: "🐱", name: "Scared Cats",           price: 200.0,   weight: 0 },    // 0%
    { emoji: "💵", name: "Snoop Cigars",          price: 15.0,    weight: 100 },  // 0.10%
    { emoji: "🥃", name: "Vintage Cigars",        price: 40.0,    weight: 100 },  // 0.10%
    { emoji: "🎩", name: "Witch Hats",            price: 7.0,     weight: 300 },  // 0.30%
    { emoji: "🍪", name: "Happy Brownies",        price: 5.0,     weight: 400 },  // 0.40%
    { emoji: "🧸", name: "Bear",                  price: 0.1,     weight: 99000 } // 99.0%
  ],

  crypto: [
    { emoji: "🍑", name: "Precious Peach (random)", price: 500.0, weight: 0 },    // 0%
    { emoji: "🧸", name: "Bear",                    price: 0.1,   weight: 100 }   // 100%
  ],
};

// выбор по весам
function pickWeighted(prizes) {
  if (!Array.isArray(prizes) || prizes.length === 0) {
    return { emoji: "🧸", name: "Bear", price: 0.1 };
  }

  const total = prizes.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  if (total <= 0) {
    return prizes[0];
  }

  let r = Math.random() * total;
  for (const p of prizes) {
    const w = Number(p.weight) || 0;
    if (r < w) return p;
    r -= w;
  }
  return prizes[prizes.length - 1];
}

// Открытие кейса на сервере (со списанием и шансами)
app.post("/api/cases/open", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const caseType = String(req.body?.caseType || "").trim();
  const cfg = CASES[caseType];
  if (!cfg) return res.status(400).json({ error: "Некорректный кейс" });

  const user = mustGetUser(tgId);
  const balance = safeNumber(user.balance, 0);
  const price = safeNumber(cfg.priceTon, 0);

  if (balance < price) {
    return res.status(400).json({ error: "Недостаточно средств" });
  }

  const newBalance = Number((balance - price).toFixed(2));
  updateUserBalance(tgId, newBalance);

  const pool = CASE_PRIZES[caseType] || [{ emoji: "🧸", name: "Bear", price: 0.1 }];
  const winner = pickWeighted(pool);

  // Кладём приз в инвентарь
  addInventoryItem(tgId, {
    emoji: String(winner.emoji || "🎁"),
    name: String(winner.name || "Подарок"),
    price: safeNumber(winner.price, 0),
  });

  // Собираем ленту для анимации (можно просто ремикс пула)
  const base = [...pool];
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  const rollItems = [];
  for (let i = 0; i < 28; i++) rollItems.push(base[i % base.length]);

  return res.json({
    ok: true,
    caseType,
    caseTitle: cfg.title,
    priceTon: price,
    prize: winner,
    newBalance,
    rollItems,
  });
});

// promo apply (from DB)
app.post("/api/promo/apply", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const code = String(req.body?.code || "").trim();
  if (!code) return res.status(400).json({ error: "Введите промокод" });

  try {
    const promo = redeemPromo(tgId, code);

    if (promo.type === "balance") {
      const user = mustGetUser(tgId);
      const amount = safeNumber(promo.amount, 0);
      const newBalance = Number((safeNumber(user.balance, 0) + amount).toFixed(2));
      updateUserBalance(tgId, newBalance);
      return res.json({ type: "balance", newBalance, amount });
    }

    if (promo.type === "gift") {
      const prize = { emoji: "🧸", name: promo.gift_name || "Мишка", price: 0.1 };
      addInventoryItem(tgId, prize);
      const inventory = listInventory(tgId);
      return res.json({ type: "gift", prize, inventory });
    }

    return res.status(400).json({ error: "Некорректный промокод" });
  } catch (e) {
    return res.status(400).json({ error: e.message || "Ошибка промокода" });
  }
});

// prize keep
app.post("/api/prize/keep", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const prize = req.body?.prize;
  if (!prize || typeof prize !== "object") return res.status(400).json({ error: "prize required" });

  const item = {
    emoji: String(prize.emoji || "🎁"),
    name: String(prize.name || "Подарок"),
    price: safeNumber(prize.price, 0),
  };

  addInventoryItem(tgId, item);
  const inventory = listInventory(tgId);
  res.json({ ok: true, inventory });
});

// prize sell (by idx from newest-first list)
app.post("/api/prize/sell", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const idxRaw = req.body?.idx;
  if (idxRaw === undefined || idxRaw === null || idxRaw === "") {
    return res.status(400).json({ error: "idx required" });
  }

  const idx = Number(idxRaw);
  if (!Number.isInteger(idx) || idx < 0) {
    return res.status(400).json({ error: "Некорректный индекс предмета" });
  }

  const removed = removeInventoryItemByIndexNewestFirst(tgId, idx);
  if (!removed) {
    return res.status(400).json({ error: "Предмет не найден" });
  }

  const priceFromDb = safeNumber(removed.price, 0);
  if (!Number.isFinite(priceFromDb) || priceFromDb <= 0) {
    addInventoryItem(tgId, removed); // rollback
    return res.status(400).json({ error: "Этот подарок нельзя продать" });
  }

  const user = mustGetUser(tgId);
  const newBalance = Number((safeNumber(user.balance, 0) + priceFromDb).toFixed(2));
  updateUserBalance(tgId, newBalance);

  const inventory = listInventory(tgId);
  res.json({ newBalance, inventory });
});




// withdraw TON
app.post("/api/withdraw/ton", auth, async (req, res) => {
  const tgId = String(req.tgUser.id);
  const tgUser = req.tgUser;
  touchUserVisit(tgUser);

  const amount = safeNumber(req.body?.amount, 0);
  if (!Number.isFinite(amount)) return res.status(400).json({ error: "Некорректная сумма" });

  const user = mustGetUser(tgId);

  const REQUIRED_TOTAL_DEPOSIT = 1;
  if (safeNumber(user.total_deposit_ton, 0) < REQUIRED_TOTAL_DEPOSIT) {
    return res.status(400).json({
      error: "Прежде чем вывести, нужно сделать минимальное пополнение 1 TON",
      code: "DEPOSIT_REQUIRED",
      requiredTotalDeposit: REQUIRED_TOTAL_DEPOSIT,
      currentTotalDeposit: safeNumber(user.total_deposit_ton, 0),
    });
  }

  const MIN_WITHDRAW = 5;
  if (amount < MIN_WITHDRAW) return res.status(400).json({ error: `Минимум ${MIN_WITHDRAW} TON` });

  const balance = safeNumber(user.balance, 0);
  if (amount > balance) return res.status(400).json({ error: "Недостаточно средств" });

  const newBalance = Number((balance - amount).toFixed(2));
  updateUserBalance(tgId, newBalance);

  const username = tgUser?.username ? `@${tgUser.username}` : "(no username)";
  const fullName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ");
  const totalDep = safeNumber(user.total_deposit_ton, 0).toFixed(2);

  const text =
    `💸 Заявка на вывод TON\n` +
    `Пользователь: ${fullName || "User"} ${username}\n` +
    `ID: ${tgId}\n` +
    `Сумма: ${amount.toFixed(2)} TON\n` +
    `Баланс после списания: ${newBalance.toFixed(2)} TON\n` +
    `Суммарный депозит: ${totalDep} TON`;

  try {
    await sendAdminMessage(text);
  } catch (e) {
    updateUserBalance(tgId, balance); // rollback
    return res.status(500).json({ error: e.message || "Ошибка уведомления" });
  }

  return res.json({ ok: true, newBalance });
});

// withdraw gift (by idx)
app.post("/api/withdraw/gift", auth, async (req, res) => {
  const tgId = String(req.tgUser.id);
  const tgUser = req.tgUser;
  touchUserVisit(tgUser);

  const user = mustGetUser(tgId);

  const REQUIRED_TOTAL_DEPOSIT = 1;
  if (safeNumber(user.total_deposit_ton, 0) < REQUIRED_TOTAL_DEPOSIT) {
    return res.status(400).json({
      error: "Прежде чем вывести, нужно сделать минимальное пополнение 1 TON",
      code: "DEPOSIT_REQUIRED",
      requiredTotalDeposit: REQUIRED_TOTAL_DEPOSIT,
      currentTotalDeposit: safeNumber(user.total_deposit_ton, 0),
    });
  }

  const idx = Number(req.body?.idx);
  if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ error: "Некорректный предмет" });

  const item = removeInventoryItemByIndexNewestFirst(tgId, idx);
  if (!item) return res.status(400).json({ error: "Некорректный предмет" });

  const username = tgUser?.username ? `@${tgUser.username}` : "(no username)";
  const fullName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ");
  const totalDep = safeNumber(user.total_deposit_ton, 0).toFixed(2);

  const text =
    `🎁 Заявка на вывод подарка\n` +
    `Пользователь: ${fullName || "User"} ${username}\n` +
    `ID: ${tgId}\n` +
    `Подарок: ${(item?.emoji || "🎁")} ${item?.name || "Подарок"}\n` +
    `Оценка: ${safeNumber(item?.price, 0).toFixed(2)} TON\n` +
    `Суммарный депозит: ${totalDep} TON`;

  try {
    await sendAdminMessage(text);
  } catch (e) {
    addInventoryItem(tgId, item); // rollback
    return res.status(500).json({ error: e.message || "Ошибка уведомления" });
  }

  const inventory = listInventory(tgId);
  return res.json({ ok: true, inventory });
});

// deposit info
app.post("/api/deposit/info", auth, (req, res) => {
  res.json({ address: TON_DEPOSIT_ADDRESS, minDeposit: MIN_DEPOSIT_TON });
});

// deposit create
app.post("/api/deposit/create", auth, (req, res) => {
  const userId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const amount = safeNumber(req.body?.amount, 0);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Некорректная сумма" });
  if (amount < MIN_DEPOSIT_TON) return res.status(400).json({ error: `Минимум ${MIN_DEPOSIT_TON} TON` });

  const depositId = makeDepositId();
  const comment = `dep_${userId}_${depositId}`;
  const payloadBase64 = makeCommentPayloadBase64(comment);

  pendingDeposits.set(depositId, {
    userId,
    amount: Number(amount.toFixed(2)),
    comment,
    createdAt: Date.now(),
    credited: false,
  });

  res.json({
    depositId,
    address: TON_DEPOSIT_ADDRESS,
    amount: Number(amount.toFixed(2)),
    comment,
    payloadBase64,
  });
});

// deposit check
app.post("/api/deposit/check", auth, async (req, res) => {
  const userId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const depositId = String(req.body?.depositId || "");
  const dep = pendingDeposits.get(depositId);

  if (!dep || dep.userId !== userId) {
    return res.status(404).json({ error: "deposit not found" });
  }

  if (dep.credited) {
    const user = mustGetUser(userId);
    return res.json({
      ok: true,
      credited: true,
      newBalance: safeNumber(user.balance, 0),
      freeWheelAvailable: !!user.free_wheel_available,
      wheelDepositProgressTon: safeNumber(user.wheel_deposit_progress_ton, 0),
    });
  }

  let txs = [];
  try {
    txs = await toncenterGetTransactions(TON_DEPOSIT_ADDRESS, 25);
  } catch (e) {
    return res.status(500).json({ error: e.message || "toncenter error" });
  }

  const found = txs.find((tx) => {
    const comment = extractIncomingComment(tx);
    return typeof comment === "string" && comment.includes(dep.comment);
  });

  if (!found) {
    return res.json({ ok: true, credited: false });
  }

  const user = mustGetUser(userId);

  const newBalance = Number(
    (safeNumber(user.balance, 0) + dep.amount).toFixed(2)
  );
  const newTotalDeposit = Number(
    (safeNumber(user.total_deposit_ton, 0) + dep.amount).toFixed(2)
  );

  // === прогресс к бесплатному колесу ===
  const WHEEL_DEPOSIT_TARGET = 0.5;

  const prevProgress = safeNumber(user.wheel_deposit_progress_ton, 0);
  let wheelDepositProgressTon = Number(
    (prevProgress + dep.amount).toFixed(4)
  );
  let freeWheelAvailable = !!user.free_wheel_available;

  if (wheelDepositProgressTon >= WHEEL_DEPOSIT_TARGET) {
    freeWheelAvailable = true;
    wheelDepositProgressTon = Number(
      (wheelDepositProgressTon - WHEEL_DEPOSIT_TARGET).toFixed(4)
    );
  }

  // сохраняем все значения разом
  updateUserBalanceAndDeposit(userId, {
    balance: newBalance,
    totalDepositTon: newTotalDeposit,
    freeWheelAvailable,
    wheelDepositProgressTon,
  });

  dep.credited = true;
  pendingDeposits.set(depositId, dep);

  sendAdminMessage(
    `✅ Депозит зачислен\nID: ${userId}\nСумма: ${dep.amount.toFixed(
      2
    )} TON\nDepositId: ${depositId}`
  ).catch(() => {});

  return res.json({
    ok: true,
    credited: true,
    newBalance,
    freeWheelAvailable,
    wheelDepositProgressTon,
  });
});


// crash bet
app.post("/api/crash/bet", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const amount = safeNumber(req.body?.amount, 0);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount required" });

  const user = mustGetUser(tgId);
  const balance = safeNumber(user.balance, 0);

  if (balance < amount) return res.status(400).json({ error: "Недостаточно средств" });

  const newBalance = Number((balance - amount).toFixed(2));
  updateUserBalance(tgId, newBalance);

  res.json({ newBalance });
});

// crash cashout
app.post("/api/crash/cashout", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const amount = safeNumber(req.body?.amount, 0);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount required" });

  const user = mustGetUser(tgId);
  const newBalance = Number((safeNumber(user.balance, 0) + amount).toFixed(2));
  updateUserBalance(tgId, newBalance);

  res.json({ newBalance });
});

// ===== ADMIN API =====
app.post("/api/admin/stats", auth, requireAdmin, (req, res) => {
  res.json(getStats());
});

app.post("/api/admin/users", auth, requireAdmin, (req, res) => {
  const q = String(req.body?.q || "");
  const page = Number(req.body?.page || 1);
  res.json(listUsersPaged({ q, page, limit: 20 }));
});

// adjust balance
app.post("/api/admin/user/adjust-balance", auth, requireAdmin, (req, res) => {
  const tgId = String(req.body?.tgId || "").trim();
  const delta = safeNumber(req.body?.delta, NaN);

  if (!tgId) return res.status(400).json({ error: "tgId required" });
  if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ error: "delta invalid" });

  const user = getUserByTgId(tgId);
  if (!user) return res.status(404).json({ error: "user not found" });

  const newBalance = Number((safeNumber(user.balance, 0) + delta).toFixed(2));
  updateUserBalance(tgId, newBalance);

  res.json({ ok: true, tgId, newBalance });
});

app.post("/api/admin/promo/create", auth, requireAdmin, (req, res) => {
  const type = String(req.body?.type || "").trim(); // balance | gift
  const code = String(req.body?.code || "").trim();
  const maxUses = Number(req.body?.maxUses || 1);

  if (!code) return res.status(400).json({ error: "code required" });
  if (!["balance", "gift"].includes(type)) return res.status(400).json({ error: "type invalid" });

  if (type === "balance") {
    const amount = safeNumber(req.body?.amount, NaN);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount invalid" });
    createPromo({ code, type, amount, maxUses });
  } else {
    const giftName = String(req.body?.giftName || "Мишка");
    createPromo({ code, type, giftName, maxUses });
  }

  res.json({ ok: true });
});

app.post("/api/admin/promo/list", auth, requireAdmin, (req, res) => {
  res.json({ items: listPromos() });
});

app.post("/api/admin/promo/delete", auth, requireAdmin, (req, res) => {
  const code = String(req.body?.code || "").trim();
  if (!code) return res.status(400).json({ error: "code required" });
  deletePromo(code);
  res.json({ ok: true });
});

// ===== REWARDS =====
app.post("/api/rewards/list", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const u = mustGetUser(tgId);

  const firstDepositEligible = safeNumber(u.total_deposit_ton, 0) > 0;
  const firstDepositClaimed = hasClaim(tgId, "first_deposit");
  const firstDepositStatus =
    firstDepositClaimed ? "claimed" : firstDepositEligible ? "available" : "locked";

  const invited = countInvitedByInviter(tgId);
  const claimedInvites = countInviteClaims(tgId);
  const maxInvites = 5;

  const inviteStatus =
    claimedInvites >= maxInvites
      ? "claimed"
      : invited > claimedInvites
        ? "available"
        : "locked";

  res.json({
    items: [
      {
        key: "first_deposit",
        title: "Первый депозит",
        desc: "+0.5 TON к балансу после первого пополнения. Начисляется один раз, повторно получить нельзя.",
        status: firstDepositStatus,
      },
      {
        key: "invite",
        title: "Инвайты",
        desc: "+0.1 TON за каждого приглашённого, который открыл мини‑апп по твоей ссылке. Можно получить максимум за 5 друзей.",
        status: inviteStatus,
        invited,
        claimed: claimedInvites,
        max: maxInvites,
      },
    ],
  });
});

app.post("/api/rewards/claim", auth, (req, res) => {
  const tgId = String(req.tgUser.id);
  touchUserVisit(req.tgUser);

  const key = String(req.body?.key || "").trim();
  if (!key) return res.status(400).json({ error: "key required" });

  const tx = db.transaction(() => {
    const u = mustGetUser(tgId);

    if (key === "first_deposit") {
      if (safeNumber(u.total_deposit_ton, 0) <= 0) throw new Error("Сначала сделайте депозит");

      const ins = addClaim(tgId, "first_deposit", 0.5);
      if (ins.changes !== 1) throw new Error("Награда уже получена");

      const newBalance = Number((safeNumber(u.balance, 0) + 0.5).toFixed(2));
      updateUserBalance(tgId, newBalance);

      return { ok: true, newBalance };
    }

    if (key === "invite") {
      const invited = countInvitedByInviter(tgId);
      const already = countInviteClaims(tgId);
      const max = 5;

      const canTake = Math.min(max - already, Math.max(0, invited - already));
      if (canTake <= 0) throw new Error("Пока нет доступных инвайтов");

      for (let i = 0; i < canTake; i++) {
        addClaim(tgId, `invite_${already + i + 1}`, 0.1);
      }

      const add = 0.1 * canTake;
      const newBalance = Number((safeNumber(u.balance, 0) + add).toFixed(2));
      updateUserBalance(tgId, newBalance);

      return { ok: true, newBalance, added: Number(add.toFixed(2)), count: canTake };
    }

    throw new Error("unknown reward");
  });

  try {
    const r = tx();
    return res.json(r);
  } catch (e) {
    return res.status(400).json({ error: e.message || "claim error" });
  }
});

// fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not Found" });
  res.sendFile(INDEX_PATH);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("✅ Listening on", PORT));






















