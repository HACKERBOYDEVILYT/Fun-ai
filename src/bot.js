require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const {
  createUser,
  getUser,
  claimDailyReward,
  getLeaderboard,
  getUserRank,
  addGame,
} = require("./database");

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN পাওয়া যায়নি!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// 🎮 ROAST BATTLE STATE
// ==========================================

const roastBattles = new Map();

// ==========================================
// ⭐ LEVEL
// ==========================================

function getLevel(xp) {
  return Math.floor(xp / 500) + 1;
}

function getNextLevelXP(xp) {
  return getLevel(xp) * 500;
}

// ==========================================
// 👤 USER SYNC
// ==========================================

function syncUser(ctx) {
  return createUser({
    id: ctx.from.id,
    firstName: ctx.from.first_name || "বন্ধু",
    username: ctx.from.username || "",
  });
}

// ==========================================
// 🏠 MAIN MENU
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
// 😂 ROAST DATA
// ==========================================

const roastChallenges = [
  {
    target: "তোমার বন্ধুর ঘুমানোর অভ্যাস",
    replies: [
      "ভাই ঘুমায় না, ঘুমের সাথে permanent relationship করছে! 😴😂",
      "ওর alarm বাজে, কিন্তু alarm-ই পরে ঘুমিয়ে যায়! 🤣",
      "ওকে ঘুম থেকে তুলতে alarm না, construction machine লাগবে! 😂",
    ],
  },
  {
    target: "যে বন্ধু সবসময় দেরি করে",
    replies: [
      "ও সময়ের পিছনে চলে না, সময় ওর পিছনে দৌড়ায়! 😂",
      "ওর কাছে ৫ মিনিট মানে minimum ২ ঘণ্টা! 🤣",
      "ও আসার আগেই অনুষ্ঠান শেষ হয়ে যায়! 😭😂",
    ],
  },
  {
    target: "যে বন্ধু সবসময় মোবাইল চালায়",
    replies: [
      "ওর হাতের পাঁচটা আঙুলের চেয়ে screen time বেশি! 😂",
      "চার্জার ছাড়া ওর জীবনটাই 1% battery! 🤣",
      "ও ফোন চালায় না, ফোনই ওকে চালায়! 😭",
    ],
  },
  {
    target: "যে বন্ধু পড়াশোনা করে না",
    replies: [
      "বই খুললেই ওর চোখে automatic sleep mode চালু হয়! 😂",
      "ওর বই এত পরিষ্কার, মনে হয় museum-এর display! 🤣",
      "Exam ওকে দেখে ভয় পায় না, exam-এর কাছে ও-ই ভয় পায়! 😭😂",
    ],
  },
  {
    target: "নিজের সবচেয়ে অলস বন্ধুকে",
    replies: [
      "ও এত অলস যে বসে থাকতেও effort লাগে! 😂",
      "ওকে কাজ দিলে আগে rest নেয়, তারপর কাজটা ভুলে যায়! 🤣",
      "ওর motivation কোথায় থাকে কেউ জানে না! 😭",
    ],
  },
];

// ==========================================
// 🎯 ROAST START
// ==========================================

function startRoastBattle(ctx) {
  const user = syncUser(ctx);

  const challenge =
    roastChallenges[
      Math.floor(Math.random() * roastChallenges.length)
    ];

  roastBattles.set(user.id, {
    challenge,
    startedAt: Date.now(),
    status: "waiting_answer",
  });

  return ctx.reply(
    `😂 *ROAST BATTLE শুরু!*

🥊 Opponent: 🤖 Roast Bot

━━━━━━━━━━━━━━
🎯 Target:
*${challenge.target}*
━━━━━━━━━━━━━━

✍️ এখন Target-কে নিয়ে একটা
মজার roast লিখে পাঠাও!

⚠️ মনে রাখবে:
• শুধু fun roast
• গালি/ঘৃণামূলক কথা নয়
• যত creative, তত বেশি score 🔥`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel Battle", "cancel_roast")],
      ]),
    }
  );
}

// ==========================================
// 😂 ROAST BUTTON
// ==========================================

bot.action("roast", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  if (roastBattles.has(user.id)) {
    return ctx.reply(
      `😂 তোমার একটা Roast Battle already চলছে!

আগের battle-এর answer পাঠাও অথবা cancel করো।`,
      Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel Battle", "cancel_roast")],
      ])
    );
  }

  startRoastBattle(ctx);
});

// ==========================================
// ❌ CANCEL ROAST
// ==========================================

bot.action("cancel_roast", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  roastBattles.delete(user.id);

  ctx.reply(
    `❌ *Roast Battle Cancelled*

কোনো সমস্যা নেই 😎

আবার চাইলে নতুন Battle শুরু করতে পারো।`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("😂 New Roast Battle", "roast")],
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 🧠 ROAST SCORING
// ==========================================

function calculateRoastScore(text) {
  let score = 40;

  const length = text.trim().length;

  if (length >= 20) score += 10;
  if (length >= 40) score += 10;
  if (length >= 60) score += 5;

  const funnyWords = [
    "😂",
    "🤣",
    "😆",
    "ঘুম",
    "আলসেমি",
    "মোবাইল",
    "বুদ্ধি",
    "সময়",
    "exam",
    "exam",
    "ভাই",
    "boss",
    "legend",
  ];

  for (const word of funnyWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      score += 3;
    }
  }

  const punctuation =
    (text.match(/[!?]/g) || []).length;

  score += Math.min(punctuation * 2, 8);

  return Math.min(score, 100);
}

// ==========================================
// 🤖 BOT ROAST
// ==========================================

function getBotRoast(challenge) {
  const replies = challenge.replies;

  return replies[Math.floor(Math.random() * replies.length)];
}

// ==========================================
// 🏆 ROAST RESULT
// ==========================================

async function finishRoast(ctx, user, playerText) {
  const battle = roastBattles.get(user.id);

  if (!battle) {
    return;
  }

  const playerScore = calculateRoastScore(playerText);

  const botScore =
    Math.floor(Math.random() * 26) + 45;

  const botText = getBotRoast(battle.challenge);

  const playerWon = playerScore >= botScore;

  roastBattles.delete(user.id);

  if (playerWon) {
    const xpReward = 75;
    const coinReward = 40;

    const updatedUser = addGame(
      user.id,
      "roast",
      "win",
      xpReward,
      coinReward
    );

    ctx.reply(
      `🏆 *ROAST BATTLE RESULT*

🥊 Battle শেষ!

━━━━━━━━━━━━━━
👤 *তোমার Roast*
"${playerText}"

⭐ Score: ${playerScore}/100

🤖 *Roast Bot*
"${botText}"

⭐ Score: ${botScore}/100
━━━━━━━━━━━━━━

🎉 *তুমি জিতে গেছো!* 🔥

⭐ +${xpReward} XP
🪙 +${coinReward} Coins

⭐ Total XP: ${updatedUser.xp}
🪙 Total Coins: ${updatedUser.coins}
🏆 Level: ${getLevel(updatedUser.xp)}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("😂 Again", "roast")],
          [Markup.button.callback("🏠 Main Menu", "home")],
        ]),
      }
    );
  } else {
    const xpReward = 20;
    const coinReward = 10;

    const updatedUser = addGame(
      user.id,
      "roast",
      "loss",
      xpReward,
      coinReward
    );

    ctx.reply(
      `😂 *ROAST BATTLE RESULT*

🥊 Battle শেষ!

━━━━━━━━━━━━━━
👤 *তোমার Roast*
"${playerText}"

⭐ Score: ${playerScore}/100

🤖 *Roast Bot*
"${botText}"

⭐ Score: ${botScore}/100
━━━━━━━━━━━━━━

😈 *Roast Bot জিতে গেছে!*

চিন্তা নেই—পরেরবার তুমি জিতবেই 🔥

⭐ +${xpReward} XP
🪙 +${coinReward} Coins

⭐ Total XP: ${updatedUser.xp}
🪙 Total Coins: ${updatedUser.coins}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("😂 Rematch", "roast")],
          [Markup.button.callback("🏠 Main Menu", "home")],
        ]),
      }
    );
  }
}

// ==========================================
// 🤣 MEME BATTLE
// ==========================================

bot.action("meme", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  ctx.reply(
    `🤣 *MEME BATTLE*

আজকের Meme Challenge:

> "পরীক্ষার আগের রাতে ছাত্রের অবস্থা" 😭

✍️ তোমার সবচেয়ে funny caption
লিখে পাঠাও!

🔥 Meme Battle voting system
পরের update-এ আসছে।`,
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

const trollChallenges = [
  "১০ সেকেন্ডে ৫ বার লিখো: আমি আজ পড়াশোনা করব 😂",
  "‘বাংলাদেশ’ শব্দটি ব্যবহার না করে বাংলাদেশকে describe করো 🇧🇩",
  "তোমার বন্ধুকে ৩টা funny nickname দাও 🤣",
  "এক লাইনে নিজের সবচেয়ে বড় আলসেমির কারণ বলো 😴",
  "‘আমি নির্দোষ’—এটা ৩টা ভিন্ন style-এ লেখো 😂",
  "নিজেকে ৩টা শব্দে describe করো 😎",
  "একটা funny excuse বলো যেটা তুমি স্কুলে ব্যবহার করতে পারতে 😂",
];

bot.action("troll", async (ctx) => {
  await ctx.answerCbQuery();

  syncUser(ctx);

  const challenge =
    trollChallenges[
      Math.floor(Math.random() * trollChallenges.length)
    ];

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

📊 Global Rank: #${rank || "-"}
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
    const hours = Math.floor(
      result.remaining / 3600000
    );

    const minutes = Math.floor(
      (result.remaining % 3600000) / 60000
    );

    return ctx.reply(
      `⏳ *Daily Reward Already Claimed!*

আজকের reward তুমি নিয়ে ফেলেছো।

আবার claim করতে পারবে:

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

👤 Player Profile
🏆 Leaderboard
🎁 Daily Reward

⭐ XP & Level
🪙 Coins
📊 Game Statistics

━━━━━━━━━━━━━━
🇧🇩 সব game fun ও entertainment-এর জন্য।
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
// 💬 TEXT HANDLER
// ==========================================

bot.on("text", async (ctx) => {
  const user = syncUser(ctx);

  const battle = roastBattles.get(user.id);

  // ------------------------------------------
  // 😂 ROAST ANSWER
  // ------------------------------------------

  if (battle && battle.status === "waiting_answer") {
    const text = ctx.message.text.trim();

    if (!text) {
      return ctx.reply("😂 একটা roast লিখে পাঠাও!");
    }

    if (text.length < 5) {
      return ctx.reply(
        `😂 এত ছোট roast দিয়ে Boss-কে হারানো যাবে না!

কমপক্ষে একটু creative roast লিখো 🔥`
      );
    }

    if (text.length > 500) {
      return ctx.reply(
        `😂 Roast maximum 500 characters হতে পারবে।`
      );
    }

    await ctx.reply(
      `🤖 Roast Bot তোমার roast analyze করছে...

⏳ ██████████ 100%`
    );

    setTimeout(() => {
      finishRoast(ctx, user, text);
    }, 900);

    return;
  }

  // ------------------------------------------
  // NORMAL MESSAGE
  // ------------------------------------------

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
// 🚀 START
// ==========================================

bot.launch();

console.log("=================================");
console.log("🇧🇩 Bangla Fun Hub");
console.log("🚀 Bot started successfully!");
console.log("💾 SQLite database connected!");
console.log("😂 Roast Battle enabled!");
console.log("=================================");

// ==========================================
// 🛑 SHUTDOWN
// ==========================================

process.once("SIGINT", () => {
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
});
