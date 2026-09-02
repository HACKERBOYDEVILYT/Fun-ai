require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const {
  createUser,
  getUser,
  claimDailyReward,
  getLeaderboard,
  getUserRank,
} = require("./database");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN পাওয়া যায়নি!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// ⭐ Level System
// ==========================================

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

function getNextLevelXP(xp) {
  const level = getLevel(xp);
  return level * 500;
}

// ==========================================
// 👤 Register / Update User
// ==========================================

function syncUser(ctx) {
  return createUser({
    id: ctx.from.id,
    firstName: ctx.from.first_name || "বন্ধু",
    username: ctx.from.username || "",
  });
}

// ==========================================
// 🏠 Main Menu
// ==========================================

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

// ==========================================
// 🚀 START
// ==========================================

bot.start((ctx) => {
  const user = syncUser(ctx);

  ctx.reply(
    `🇧🇩 *Bangla Fun Hub*-এ স্বাগতম! 🎉

হ্যালো ${user.first_name}! 👋

এখানে তুমি খেলতে পারবে—

😂 Roast Battle
🤣 Meme Battle
😈 Troll Boss

━━━━━━━━━━━━━━
⭐ Level: ${getLevel(user.xp)}
✨ XP: ${user.xp}
🪙 Coins: ${user.coins}
🏆 Wins: ${user.wins}
━━━━━━━━━━━━━━

নিচের Menu থেকে একটা option বেছে নাও 👇`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 😂 ROAST BATTLE
// ==========================================

bot.action("roast", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  ctx.reply(
    `😂 *ROAST BATTLE*

🥊 প্রস্তুত তো?

এখানে তুমি অন্য player-এর সাথে
funny roast battle করতে পারবে।

🔥 Full matchmaking system খুব শিগগিরই আসছে!

ততক্ষণ পর্যন্ত প্রস্তুত হও 😈`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 🤣 MEME BATTLE
// ==========================================

bot.action("meme", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  ctx.reply(
    `🤣 *MEME BATTLE*

আজকের Challenge:

> "পরীক্ষার আগের রাতে ছাত্রের অবস্থা" 😭

তোমার সবচেয়ে funny caption লিখে পাঠাও!

🔥 Voting system খুব শিগগিরই আসছে।`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 😈 TROLL BOSS
// ==========================================

const challenges = [
  "১০ সেকেন্ডে ৫ বার লিখো: আমি আজ পড়াশোনা করব 😂",
  "‘বাংলাদেশ’ শব্দটি ব্যবহার না করে বাংলাদেশকে describe করো 🇧🇩",
  "তোমার বন্ধুকে ৩টা funny nickname দাও 🤣",
  "এক লাইনে নিজের সবচেয়ে বড় আলসেমির কারণ বলো 😴",
  "‘আমি নির্দোষ’—এটা ৩টা ভিন্ন style-এ লেখো 😂",
  "নিজেকে ৩টা শব্দে describe করো 😎",
  "একটা এমন excuse বলো যেটা তুমি স্কুলে ব্যবহার করতে পারতে 😂",
];

bot.action("troll", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  const challenge =
    challenges[Math.floor(Math.random() * challenges.length)];

  ctx.reply(
    `😈 *TROLL BOSS CHALLENGE*

🎯 তোমার Mission:

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

// ==========================================
// 👤 PROFILE
// ==========================================

bot.action("profile", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);
  const rank = getUserRank(user.id);
  const level = getLevel(user.xp);
  const nextXP = getNextLevelXP(user.xp);

  ctx.reply(
    `👤 *তোমার Profile*

🆔 ID: \`${user.id}\`
${user.username ? `📛 Username: @${user.username}` : ""}

━━━━━━━━━━━━━━
⭐ Level: ${level}
✨ XP: ${user.xp}/${nextXP}

🪙 Coins: ${user.coins}

🎮 Games: ${user.games}
🏆 Wins: ${user.wins}
💀 Losses: ${user.losses}

📊 Global Rank: #${rank}
━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 🏆 LEADERBOARD
// ==========================================

bot.action("leaderboard", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  const ranking = getLeaderboard(10);

  if (!ranking.length) {
    return ctx.reply("🏆 এখনো কোনো player নেই!");
  }

  let text = "🏆 *TOP 10 PLAYERS*\n\n";

  ranking.forEach((user, index) => {
    let medal;

    if (index === 0) medal = "🥇";
    else if (index === 1) medal = "🥈";
    else if (index === 2) medal = "🥉";
    else medal = `${index + 1}.`;

    text += `${medal} ${user.first_name} — ⭐ ${user.xp} XP\n`;
  });

  ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "home")],
    ]),
  });
});

// ==========================================
// 🎁 DAILY REWARD
// ==========================================

bot.action("daily", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);
  const result = claimDailyReward(user.id);

  if (!result.success) {
    const hours = Math.floor(result.remaining / 3600000);
    const minutes = Math.floor(
      (result.remaining % 3600000) / 60000
    );

    return ctx.reply(
      `⏳ *Daily Reward Already Claimed!*

তুমি আজকের reward নিয়ে ফেলেছো।

আবার চেষ্টা করো:
⏰ ${hours} ঘণ্টা ${minutes} মিনিট পরে।`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Main Menu", "home")],
        ]),
      }
    );
  }

  ctx.reply(
    `🎁 *DAILY REWARD CLAIMED!*

অভিনন্দন! 🎉

🪙 +${result.coins} Coins
⭐ +${result.xp} XP

━━━━━━━━━━━━━━
🪙 Total Coins: ${result.user.coins}
⭐ Total XP: ${result.user.xp}
🏆 Level: ${getLevel(result.user.xp)}
━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// ℹ️ HELP
// ==========================================

bot.action("help", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  ctx.reply(
    `ℹ️ *Bangla Fun Hub*

😂 Roast Battle
🤣 Meme Battle
😈 Troll Boss

👤 Profile
🏆 Leaderboard
🎁 Daily Reward

⭐ XP & Level system
🪙 Coins system

সব game fun ও entertainment-এর জন্য। 🇧🇩`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 🏠 HOME
// ==========================================

bot.action("home", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  ctx.reply(
    `🏠 *Bangla Fun Hub*

👋 ${user.first_name}

⭐ Level: ${getLevel(user.xp)}
✨ XP: ${user.xp}
🪙 Coins: ${user.coins}

একটা option বেছে নাও 👇`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 💬 NORMAL TEXT
// ==========================================

bot.on("text", (ctx) => {
  const user = syncUser(ctx);

  ctx.reply(
    `😎 ${user.first_name}, তোমার message পেয়েছি!

Game খেলতে নিচের Menu ব্যবহার করো 👇`,
    mainMenu()
  );
});

// ==========================================
// ❌ ERROR HANDLER
// ==========================================

bot.catch((err) => {
  console.error("❌ Bot Error:", err);
});

// ==========================================
// 🚀 START BOT
// ==========================================

bot.launch();

console.log("=================================");
console.log("🇧🇩 Bangla Fun Hub");
console.log("🚀 Bot started successfully!");
console.log("💾 SQLite database connected!");
console.log("=================================");

// ==========================================
// 🛑 Graceful Shutdown
// ==========================================

process.once("SIGINT", () => bot.stop("SIGINT"));

process.once("SIGTERM", () => bot.stop("SIGTERM"));
