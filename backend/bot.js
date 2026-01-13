import TelegramBot from "node-telegram-bot-api";

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  const WEBAPP_URL =
    process.env.WEBAPP_URL || "https://wqwe-production.up.railway.app/";

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/^\/start(?:\s+.*)?$/, async (msg) => {
    const chatId = msg.chat.id;

    const name =
      msg.from?.first_name ||
      (msg.from?.username ? `@${msg.from.username}` : "друг");

    const text =
      `🎉 <b>${name}</b>, ты легенда! 🎉\n\n` +
      `🎁 Подарки не ждут. Открывай. Выигрывай. Повторяй.\n` +
      `🎮 GiftWheels — здесь сюрпризы каждый день.`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Начать", web_app: { url: WEBAPP_URL } }],
          [{ text: "Поддержка", url: "https://t.me/modergw" }],
          [
            {
              text: "Публичная оферта",
              url: "https://telegra.ph/1-Terminy-i-opredeleniya-01-13",
            },
          ],
          [
            {
              text: "Политика конфиденциальности",
              url: "https://telegra.ph/Polzovatelskoe-soglashenie-Publichnaya-oferta-01-13-2",
            },
          ],
        ],
      },
    });
  });

  console.log("🤖 Bot started (polling)");
  return bot;
}
