import TelegramBot from "node-telegram-bot-api";

export function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is missing");

  const WEBAPP_URL =
    process.env.WEBAPP_URL || "https://wqwe-production.up.railway.app/";

  const bot = new TelegramBot(token, { polling: true });

  function escapeHtml(s = "") {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Если раньше был webhook — polling не будет работать (409)
  bot.deleteWebHook?.().catch(() => {}); // безопасно, если метода нет

  bot.onText(/^\/start(?:\s+.*)?$/, async (msg) => {
    const chatId = msg.chat.id;

    const name =
      msg.from?.first_name ||
      (msg.from?.username ? `@${msg.from.username}` : "друг");

    const safeName = escapeHtml(name);

    // Кнопка слева от поля ввода (Menu button -> WebApp)
    try {
      await bot.setChatMenuButton({
        chat_id: chatId,
        menu_button: JSON.stringify({
          type: "web_app",
          text: "Open",
          web_app: { url: WEBAPP_URL },
        }),
      });
    } catch (err) {
      console.error("setChatMenuButton failed:", err);
    }

    const text =
      `🎉 <b>${safeName}</b>, ты легенда! 🎉\n\n` +
      `🎁 Подарки не ждут. Открывай. Выигрывай. Повторяй.\n` +
      `🎮 GiftWheels — здесь сюрпризы каждый день.`;

    try {
      await bot.sendMessage(chatId, text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Начать", web_app: { url: WEBAPP_URL } }],
            [{ text: "Канал", url: "https://t.me/GiftWheels" }],
            [{ text: "Поддержка", url: "https://t.me/modergw" }],
          ],
        },
      });
    } catch (err) {
      console.error("sendMessage(/start) failed:", err);
    }
  });

  bot.on("polling_error", (err) => {
    console.error("polling_error:", err);
  });

  console.log("🤖 Bot started (polling)");
  return bot;
}
