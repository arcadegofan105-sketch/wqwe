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
        // reply‑клавиатура: одна кнопка в ряду → она слева,
        // one_time_keyboard: false → не исчезает после нажатия
        keyboard: [
          [
            {
              text: "start",
              web_app: { url: WEBAPP_URL }, // открывает твой Mini App
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  });

  console.log("🤖 Bot started (polling)");
  return bot;
}
