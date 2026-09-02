require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN পাওয়া যায়নি!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ===============================
// 👤 Temporary in-memory users
// ===============================

const users = new Map();

function getUser(ctx) {
  const id = ctx.from.id;

  if (!users.has(id)) {
    users.set(id, {
      id,
      firstName: ctx.from.first_name || "বন্ধু",
      username: ctx.from.username || "",
      xp: 0,
      coins: 100,
      wins: 0,
      losses: 0,
      games: 0,
    });
  }

  return users.get(id);
}

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

// ===============================
// 🏠 Main Menu
// ===============================

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("😂 Roast Battle", "roast"),
      Markup.button.callback("🤣 Meme Battle", "meme"),
    ],
    [
      Markup.button.callback("😈 Troll Boss", "troll"),
    ],
    [
      Markup.button.callback("👤 Profile", "profile"),
      Markup.button.callback("🏆 Leaderboard", "leaderboard"),
    ],
    [
      Markup.button.callback("🎁 Daily Reward", "daily"),
      Markup.button.callback("ℹ️ Help", "help"),
    ],
  ]);
}

// ===============================
// 🚀 START
// ===============================

bot.start((ctx) => {
  const user = getUser(ctx);

  ctx.reply(
    `🇧🇩 *Bangla Fun Hub*-এ স্বাগতম! 🎉

হ্যালো ${user.firstName}! 👋

এখানে তুমি খেলতে পারবে—

😂 Roast Battle
🤣 Meme Battle
😈 Troll Boss

⭐ XP: ${user.xp}
🪙 Coins: ${user.coins}
🏆 Level: ${getLevel(user.xp)}

নিচের Menu থেকে একটা Game বেছে নাও 👇`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ===============================
// 😂 ROAST
// ===============================

bot.action("roast", async (ctx) => {
  await ctx.answerCbQuery();

  ctx.reply(
    `😂 *ROAST BATTLE*

🥊 Ready তো?

এই game-এ তোমার opponent-এর সাথে
funny roast battle হবে।

🔥 Feature আসছে পরের version-এ!

ততক্ষণ পর্যন্ত প্রস্তুত হও 😈`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// 🤣 MEME
// ===============================

bot.action("meme", async (ctx) => {
  await ctx.answerCbQuery();

  ctx.reply(
    `🤣 *MEME BATTLE*

আজকের বাংলা Meme Challenge:

> "পরীক্ষার আগের রাতে ছাত্রের অবস্থা" 😭

তোমার সবচেয়ে funny caption লিখে পাঠাও!

🔥 Meme Battle system খুব শিগগিরই আসছে।`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// 😈 TROLL BOSS
// ===============================

bot.action("troll", async (ctx) => {
  await ctx.answerCbQuery();

  const challenges = [
    "১০ সেকেন্ডে ৫ বার লিখো: আমি আজ পড়াশোনা করব 😂",
    "‘বাংলাদেশ’ শব্দটি ব্যবহার না করে বাংলাদেশকে describe করো 🇧🇩",
    "তোমার বন্ধুকে ৩টা funny nickname দাও 🤣",
    "এক লাইনে নিজের সবচেয়ে বড় আলসেমির কারণ বলো 😴",
    "‘আমি নির্দোষ’—এটা ৩টা ভিন্ন style-এ লেখো 😂",
  ];

  const challenge =
    challenges[Math.floor(Math.random() * challenges.length)];

  ctx.reply(
    `😈 *TROLL BOSS CHALLENGE*

🎯 Mission:

${challenge}

⚡ Boss তোমার উত্তর অপেক্ষা করছে...`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔄 নতুন Challenge", "troll")],
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// 👤 PROFILE
// ===============================

bot.action("profile", async (ctx) => {
  await ctx.answerCbQuery();

  const user = getUser(ctx);

  ctx.reply(
    `👤 *তোমার Profile*

🆔 ID: \`${user.id}\`
${user.username ? `📛 Username: @${user.username}` : ""}

⭐ Level: ${getLevel(user.xp)}
✨ XP: ${user.xp}

🪙 Coins: ${user.coins}

🎮 Games: ${user.games}
🏆 Wins: ${user.wins}
💀 Losses: ${user.losses}`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// 🏆 LEADERBOARD
// ===============================

bot.action("leaderboard", async (ctx) => {
  await ctx.answerCbQuery();

  const ranking = [...users.values()]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  if (ranking.length === 0) {
    return ctx.reply("🏆 এখনো কোনো player নেই!");
  }

  let text = "🏆 *TOP PLAYERS*\n\n";

  ranking.forEach((user, index) => {
    const medal =
      index === 0
        ? "🥇"
        : index === 1
        ? "🥈"
        : index === 2
        ? "🥉"
        : `${index + 1}.`;

    text += `${medal} ${user.firstName} — ⭐ ${user.xp} XP\n`;
  });

  ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "home")],
    ]),
  });
});

// ===============================
// 🎁 DAILY REWARD
// ===============================

bot.action("daily", async (ctx) => {
  await ctx.answerCbQuery();

  const user = getUser(ctx);

  const reward = 100;

  user.coins += reward;
  user.xp += 25;

  ctx.reply(
    `🎁 *DAILY REWARD*

অভিনন্দন! 🎉

🪙 +${reward} Coins
⭐ +25 XP

💰 মোট Coins: ${user.coins}
⭐ মোট XP: ${user.xp}`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// ℹ️ HELP
// ===============================

bot.action("help", async (ctx) => {
  await ctx.answerCbQuery();

  ctx.reply(
    `ℹ️ *Bangla Fun Hub*

😂 Roast Battle
🤣 Meme Battle
😈 Troll Boss
👤 Player Profile
🏆 Leaderboard
🎁 Daily Reward

এই bot-এর সব game fun/entertainment-এর জন্য তৈরি করা হচ্ছে। 🇧🇩`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ===============================
// 🏠 HOME
// ===============================

bot.action("home", async (ctx) => {
  await ctx.answerCbQuery();

  const user = getUser(ctx);

  ctx.reply(
    `🏠 *Bangla Fun Hub*

👋 ${user.firstName}

⭐ Level: ${getLevel(user.xp)}
🪙 Coins: ${user.coins}

একটা option বেছে নাও 👇`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ===============================
// 💬 NORMAL MESSAGE
// ===============================

bot.on("text", (ctx) => {
  const user = getUser(ctx);

  ctx.reply(
    `😎 ${user.firstName}, তোমার message পেয়েছি!

Game খেলতে নিচের Menu ব্যবহার করো 👇`,
    mainMenu()
  );
});

// ===============================
// ❌ ERROR HANDLER
// ===============================

bot.catch((err) => {
  console.error("❌ Bot Error:", err);
});

// ===============================
// 🚀 START BOT
// ===============================

bot.launch();

console.log("=================================");
console.log("🇧🇩 Bangla Fun Hub Bot");
console.log("🚀 Bot started successfully!");
console.log("=================================");

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
