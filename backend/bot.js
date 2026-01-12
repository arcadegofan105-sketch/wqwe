import TelegramBot from "node-telegram-bot-api";

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  const WEBAPP_URL =
    process.env.WEBAPP_URL || "https://wqwe-production.up.railway.app/";

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/^\/start(?:\s+.*)?$/, async (msg) => {
    const chatId = msg.chat.id;

    const text =
      "<b>Добро пожаловать в WQWE!</b>\n\n" +
      "🎡 Крути <b>Колесо</b> — выбивай подарки и продавай их за TON.\n" +
      "🚀 Играй в <b>Crash</b> — забирай иксы вовремя.\n" +
      "🎁 Собирай инвентарь и готовься к новым фишкам.\n\n" +
      "Жми кнопку ниже и начинай:";

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть игру", web_app: { url: WEBAPP_URL } }]],
      },
    });
  });

  console.log("🤖 Bot started (polling)");
  return bot;
}
