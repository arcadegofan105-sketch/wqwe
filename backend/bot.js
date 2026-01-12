import TelegramBot from "node-telegram-bot-api";

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  const WEBAPP_URL =
    process.env.WEBAPP_URL || "https://wqwe-production.up.railway.app/";

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/^\/start(?:\s+.*)?$/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(chatId, "Привет! Жми кнопку и запускай игру:", {
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть игру", web_app: { url: WEBAPP_URL } }]],
      },
    });
  });

  console.log("🤖 Bot started (polling)");
  return bot;
}
