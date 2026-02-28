require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is missing');

const bot = new Telegraf(BOT_TOKEN);

const REF_URL = 'https://play.mori.win/referral/MNCHPMHI';
const SUPPORT_URL = 'https://t.me/moriwinhelpbot';
const COMMUNITY_URL = 'https://t.me/moricoin_official';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

bot.start(async (ctx) => {
  const name =
    ctx.from?.first_name ||
    (ctx.from?.username ? `@${ctx.from.username}` : 'друг');

  const safeName = escapeHtml(name);

  // Кнопка слева от поля ввода: menu button -> Web App (Mini App). [web:85][web:19]
  try {
    await ctx.telegram.callApi('setChatMenuButton', {
      chat_id: ctx.chat.id,
      menu_button: {
        type: 'web_app',
        text: 'Open',
        web_app: { url: REF_URL },
      },
    });
  } catch (err) {
    console.error('setChatMenuButton failed:', err);
  }

  const text =
    `<b>${safeName}</b>, спасибо что присоединились к нам в проект!\n\n` +
    `Выберите действие ниже:`;

  try {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      // Убираем reply-клавиатуру, если она когда-то показывалась. [web:101]
      ...Markup.removeKeyboard(),
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('Открыть', REF_URL)],
        [Markup.button.url('Поддержка', SUPPORT_URL)],
        [Markup.button.url('Сообщество', COMMUNITY_URL)],
      ]),
    });
  } catch (err) {
    console.error('reply(/start) failed:', err);
  }
});

bot.catch((err) => console.error('bot error:', err));

bot.launch().then(() => console.log('🤖 Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
