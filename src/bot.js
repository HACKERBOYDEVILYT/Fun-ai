```js
require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const {
  createUser,
  getUser,
  addGame,
  claimDailyReward,
  getLeaderboard,
  getUserRank,
  getStats,
} = require("./database");

const {
  judgeRoast,
  generateOpponentRoast,
  judgeOpponent,
  checkRoastSafety,
} = require("./ai");

// ==========================================
// 🤖 BOT
// ==========================================

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN পাওয়া যায়নি!");
  console.error("👉 .env ফাইলে BOT_TOKEN যোগ করো।");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// 🎮 GAME STATES
// ==========================================

const roastBattles = new Map();
const memeBattles = new Map();

// ==========================================
// 🧠 LEVEL SYSTEM
// ==========================================

function getLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

function getLevelProgress(xp) {
  const level = getLevel(xp);
  const current = xp % 100;

  return {
    level,
    current,
    next: 100,
  };
}

function progressBar(value, max = 100, size = 10) {
  const filled = Math.round((value / max) * size);
  return "🟩".repeat(filled) + "⬜".repeat(size - filled);
}

// ==========================================
// 👤 USER SYNC
// ==========================================

function syncUser(ctx) {
  const user = ctx.from;

  return createUser({
    id: user.id,
    firstName: user.first_name || "বন্ধু",
    username: user.username || "",
  });
}

// ==========================================
// 🏠 MAIN MENU
// ==========================================

function mainMenu() {
  return Markup.keyboard([
    ["🔥 Roast Battle", "🤣 Meme Battle"],
    ["😈 Troll Boss", "👤 Profile"],
    ["🏆 Leaderboard", "🎁 Daily Reward"],
    ["📊 Stats", "ℹ️ Help"],
  ]).resize();
}

// ==========================================
// 🏠 START
// ==========================================

bot.start(async (ctx) => {
  const user = syncUser(ctx);

  const level = getLevel(user.xp);

  await ctx.reply(
    `🇧🇩 *Bangla Fun Hub*-এ স্বাগতম! 🎉

হ্যালো *${user.first_name}*! 👋

এখানে তুমি খেলতে পারো:

🔥 AI Roast Battle
🤣 Meme Battle
😈 Troll Boss

আর আছে:

⭐ XP & Level
🪙 Coins
🏆 Leaderboard
🎁 Daily Reward
👤 Profile
📊 Stats

তোমার বর্তমান Level: *${level}*
🪙 Coins: *${user.coins}*

চলো শুরু করি! 😈🔥`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🏠 HOME
// ==========================================

bot.hears("🏠 Home", async (ctx) => {
  const user = syncUser(ctx);

  await ctx.reply(
    `🏠 *Main Menu*

হ্যালো ${user.first_name}! 👋

তোমার Level: ⭐ ${getLevel(user.xp)}
Coins: 🪙 ${user.coins}`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🔥 AI ROAST BATTLE
// ==========================================

const roastChallenges = [
  "তোমার WiFi এত slow যে Google-ও তোমাকে search result দেওয়ার আগে ঘুমিয়ে পড়ে। 😂",

  "তুমি এত late reply দাও যে তোমার message-এর notification-ও retirement নিয়ে নেয়। 🤣",

  "তোমার phone-এর battery তোমার motivation-এর থেকেও বেশি সময় টিকে। 😭",

  "তোমার coding দেখে bug-গুলো নিজেরাই developer হয়ে যায়। 💀",

  "তুমি এত বেশি online থাকো যে Facebook তোমাকে employee ভাবতে শুরু করেছে। 😂",

  "তোমার selfie camera তোমাকে দেখার পর নিজেই front camera বন্ধ করে দেয়। 🤣",
];

async function startRoastBattle(ctx) {
  const user = syncUser(ctx);

  const challenge =
    roastChallenges[Math.floor(Math.random() * roastChallenges.length)];

  roastBattles.set(user.id, {
    challenge,
    status: "waiting",
  });

  await ctx.reply(
    `🔥 *AI ROAST BATTLE STARTED!*

🎯 Target:
"${challenge}"

এখন এই Target-কে roast করো! 😈

✍️ তোমার roast message পাঠাও।

AI তোমার roast বিচার করবে:

😂 Funny
🧠 Creativity
🎯 Relevance
✨ Originality
🎤 Delivery

🏆 Maximum Score: 100`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel Battle", "cancel_roast")],
      ]),
    }
  );
}

// ==========================================
// 🔥 FINISH AI ROAST
// ==========================================

async function finishRoast(ctx, answer) {
  const user = syncUser(ctx);

  const battle = roastBattles.get(user.id);

  if (!battle) {
    return;
  }

  roastBattles.delete(user.id);

  await ctx.reply(
    "🧠 AI Judge তোমার roast analyse করছে...\n\n⏳ একটু অপেক্ষা করো..."
  );

  try {
    // ======================================
    // 🛡️ SAFETY CHECK
    // ======================================

    const safety = await checkRoastSafety(answer);

    if (!safety.safe) {
      await ctx.reply(
        `🛡️ *Roast Blocked!*

তোমার roast battle-এর জন্য একটু বেশি offensive হয়ে গেছে।

কারণ:
${safety.reason || "এই content playful roast-এর জন্য উপযুক্ত নয়।"}

😈 আবার খেলতে চাইলে নতুন Roast Battle শুরু করো।`,
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    // ======================================
    // 🧠 PLAYER JUDGE
    // ======================================

    const playerResult = await judgeRoast({
      target: battle.challenge,
      playerRoast: answer,
    });

    // ======================================
    // 🤖 AI OPPONENT ROAST
    // ======================================

    const opponentRoast = await generateOpponentRoast(
      battle.challenge
    );

    // ======================================
    // 🤖 OPPONENT JUDGE
    // ======================================

    const opponentResult = await judgeOpponent({
      target: battle.challenge,
      opponentRoast,
    });

    const playerScore = Math.max(
      0,
      Math.min(100, Number(playerResult.score) || 0)
    );

    const opponentScore = Math.max(
      0,
      Math.min(100, Number(opponentResult.score) || 0)
    );

    let result;
    let xp;
    let coins;

    if (playerScore > opponentScore) {
      result = "win";
      xp = 75;
      coins = 40;
    } else if (playerScore < opponentScore) {
      result = "loss";
      xp = 20;
      coins = 10;
    } else {
      result = "draw";
      xp = 45;
      coins = 25;
    }

    const before = getUser(user.id);

    const updatedUser = addGame(
      user.id,
      "roast",
      result,
      xp,
      coins
    );

    const oldLevel = getLevel(before.xp);
    const newLevel = getLevel(updatedUser.xp);

    let resultText = "";

    if (result === "win") {
      resultText = `🏆 *YOU WIN!*

🔥 তোমার roast AI-কে উড়িয়ে দিয়েছে!`;
    } else if (result === "loss") {
      resultText = `💀 *AI WINS!*

🤖 এবার AI তোমাকে roast battle-এ হারিয়ে দিয়েছে!`;
    } else {
      resultText = `🤝 *DRAW!*

দুজনের roast প্রায় সমান ছিল!`;
    }

    let levelText = "";

    if (newLevel > oldLevel) {
      levelText = `\n\n🎉 *LEVEL UP!*
⭐ Level ${oldLevel} ➜ *Level ${newLevel}*`;
    }

    await ctx.reply(
      `🔥 *AI ROAST BATTLE RESULT*

🎯 Target:
${battle.challenge}

👤 *তোমার Roast:*
"${answer}"

🤖 *AI Roast:*
"${opponentRoast}"

━━━━━━━━━━━━━━

👤 তোমার Score: *${playerScore}/100*
${progressBar(playerScore)}

🤖 AI Score: *${opponentScore}/100*
${progressBar(opponentScore)}

━━━━━━━━━━━━━━

🧠 *AI Judge:*

😂 Funny: ${playerResult.funny ?? "-"}
🧠 Creativity: ${playerResult.creativity ?? "-"}
🎯 Relevance: ${playerResult.relevance ?? "-"}
✨ Originality: ${playerResult.originality ?? "-"}
🎤 Delivery: ${playerResult.delivery ?? "-"}

💬 ${playerResult.comment || "ভালো roast ছিল! 😂"}

━━━━━━━━━━━━━━

${resultText}

🎁 Reward:
⭐ +${xp} XP
🪙 +${coins} Coins
${levelText}

বর্তমান Level: ⭐ ${newLevel}
Coins: 🪙 ${updatedUser.coins}`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  } catch (error) {
    console.error("AI Roast Error:", error);

    await ctx.reply(
      `❌ AI Roast Battle চালাতে সমস্যা হয়েছে।

সম্ভবত AI service/API connection-এ সমস্যা হয়েছে।

কিছুক্ষণ পরে আবার চেষ্টা করো। 🔄`,
      mainMenu()
    );
  }
}

// ==========================================
// ❌ CANCEL ROAST
// ==========================================

bot.action("cancel_roast", async (ctx) => {
  const user = syncUser(ctx);

  roastBattles.delete(user.id);

  await ctx.answerCbQuery();

  await ctx.reply(
    "❌ Roast Battle cancel করা হয়েছে।",
    mainMenu()
  );
});

// ==========================================
// 🤣 MEME BATTLE
// ==========================================

const memeChallenges = [
  "যখন মা বলে: 'অতিথি আসছে, ঘরটা পরিষ্কার কর।' 😂",

  "যখন পরীক্ষার আগের রাতে বই খুলে বুঝতে পারো কিছুই পড়া হয়নি। 💀",

  "যখন WiFi চলে যায় ঠিক তখনই important video load হচ্ছিল। 😭",

  "যখন বন্ধু বলে '৫ মিনিটের মধ্যে আসছি' কিন্তু ২ ঘণ্টা হয়ে যায়। 🤣",

  "যখন salary আসার ২ দিন পর bank balance দেখো। 💀",

  "যখন crush online আসে কিন্তু তোমার message seen করে না। 😭",
];

const memeReplies = [
  "এই meme দেখে আমার processor-ও হাসছে! 😂",

  "ভাই, এটা meme নাকি national comedy award? 🤣",

  "AI-ও বুঝতে পারছে না কীভাবে এমন caption বানালে! 💀",

  "এইটার জন্য আলাদা trophy দরকার! 🏆😂",

  "আমি হাসতে হাসতে server restart করে ফেললাম! 🤣",
];

async function startMemeBattle(ctx) {
  const user = syncUser(ctx);

  const challenge =
    memeChallenges[Math.floor(Math.random() * memeChallenges.length)];

  memeBattles.set(user.id, {
    challenge,
    status: "waiting",
  });

  await ctx.reply(
    `🤣 *MEME BATTLE!*

🎯 Situation:

"${challenge}"

এখন এই situation-এর জন্য একটা funny caption বানাও।

✍️ Caption পাঠাও!

🏆 তোমার creativity অনুযায়ী score হবে।`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel", "cancel_meme")],
      ]),
    }
  );
}

// ==========================================
// 🤣 MEME SCORE
// ==========================================

function calculateMemeScore(text) {
  let score = 35;

  if (text.length > 25) score += 10;
  if (text.length > 50) score += 10;
  if (text.length > 80) score += 5;

  const emojis = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;

  score += Math.min(emojis * 3, 12);

  const funnyWords = [
    "মা",
    "বাবা",
    "ক্রাশ",
    "বন্ধু",
    "পরীক্ষা",
    "ভাই",
    "টাকা",
    "wifi",
    "ঘুম",
    "বিয়ে",
    "salary",
    "😂",
    "🤣",
    "💀",
    "😭",
  ];

  for (const word of funnyWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      score += 3;
    }
  }

  return Math.min(score, 100);
}

async function finishMemeBattle(ctx, answer) {
  const user = syncUser(ctx);

  const battle = memeBattles.get(user.id);

  if (!battle) {
    return;
  }

  memeBattles.delete(user.id);

  const playerScore = calculateMemeScore(answer);

  const botScore =
    Math.floor(Math.random() * 41) + 45;

  const botText =
    memeReplies[Math.floor(Math.random() * memeReplies.length)];

  let result;
  let xp;
  let coins;

  if (playerScore > botScore) {
    result = "win";
    xp = 60;
    coins = 30;
  } else if (playerScore < botScore) {
    result = "loss";
    xp = 20;
    coins = 10;
  } else {
    result = "draw";
    xp = 40;
    coins = 20;
  }

  const before = getUser(user.id);

  const updatedUser = addGame(
    user.id,
    "meme",
    result,
    xp,
    coins
  );

  const oldLevel = getLevel(before.xp);
  const newLevel = getLevel(updatedUser.xp);

  let resultText;

  if (result === "win") {
    resultText = "🏆 *তুমি Meme Battle জিতে গেছো!*";
  } else if (result === "loss") {
    resultText = "💀 *Bot Meme Battle জিতে গেছে!*";
  } else {
    resultText = "🤝 *Draw!*";
  }

  let levelText = "";

  if (newLevel > oldLevel) {
    levelText =
      `\n\n🎉 *LEVEL UP!*\n⭐ Level ${oldLevel} ➜ *${newLevel}*`;
  }

  await ctx.reply(
    `🤣 *MEME BATTLE RESULT*

🎯 Situation:
${battle.challenge}

👤 *তোমার Caption:*
"${answer}"

🤖 *Bot Caption:*
"${botText}"

━━━━━━━━━━━━━━

👤 Score: *${playerScore}/100*
${progressBar(playerScore)}

🤖 Bot Score: *${botScore}/100*
${progressBar(botScore)}

━━━━━━━━━━━━━━

${resultText}

🎁 Reward:
⭐ +${xp} XP
🪙 +${coins} Coins

⭐ Level: ${newLevel}
🪙 Coins: ${updatedUser.coins}${levelText}`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
}

// ==========================================
// ❌ CANCEL MEME
// ==========================================

bot.action("cancel_meme", async (ctx) => {
  const user = syncUser(ctx);

  memeBattles.delete(user.id);

  await ctx.answerCbQuery();

  await ctx.reply(
    "❌ Meme Battle cancel করা হয়েছে।",
    mainMenu()
  );
});

// ==========================================
// 😈 TROLL BOSS
// ==========================================

bot.hears("😈 Troll Boss", async (ctx) => {
  const user = syncUser(ctx);

  const bosses = [
    {
      name: "😈 WiFi Demon",
      hp: 100,
      text: "তোমার WiFi password আমি জানি! 😈",
    },
    {
      name: "💀 Exam Boss",
      hp: 120,
      text: "আগামীকাল পরীক্ষা! তুমি কিছুই পড়োনি! 😂",
    },
    {
      name: "🤡 Troll King",
      hp: 150,
      text: "তুমি আমাকে হারাতে পারবে না! 🤡",
    },
  ];

  const boss =
    bosses[Math.floor(Math.random() * bosses.length)];

  const damage = Math.floor(Math.random() * 41) + 30;

  const remaining = Math.max(0, boss.hp - damage);

  let rewardXP = 30;
  let rewardCoins = 15;

  if (remaining === 0) {
    rewardXP = 80;
    rewardCoins = 50;
  }

  const updatedUser = addGame(
    user.id,
    "troll",
    remaining === 0 ? "win" : "attack",
    rewardXP,
    rewardCoins
  );

  await ctx.reply(
    `😈 *TROLL BOSS*

Boss: *${boss.name}*

❤️ HP: ${boss.hp}

💬 "${boss.text}"

━━━━━━━━━━━━━━

⚔️ তুমি Boss-কে *${damage} damage* দিয়েছো!

❤️ Remaining HP: *${remaining}*

${
  remaining === 0
    ? "🏆 *BOSS DEFEATED!*"
    : "😈 Boss এখনো বেঁচে আছে! আবার attack করো!"
}

━━━━━━━━━━━━━━

🎁 Reward:
⭐ +${rewardXP} XP
🪙 +${rewardCoins} Coins

⭐ Level: ${getLevel(updatedUser.xp)}
🪙 Coins: ${updatedUser.coins}`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⚔️ Attack Again", "troll_again")],
      ]),
    }
  );
});

// ==========================================
// 😈 TROLL AGAIN
// ==========================================

bot.action("troll_again", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  const damage = Math.floor(Math.random() * 41) + 35;

  const rewardXP = 35;
  const rewardCoins = 15;

  const updatedUser = addGame(
    user.id,
    "troll",
    "attack",
    rewardXP,
    rewardCoins
  );

  await ctx.reply(
    `⚔️ *CRITICAL ATTACK!*

😈 Troll Boss-কে তুমি *${damage} damage* দিয়েছো!

💥 BOOM!

🎁 +${rewardXP} XP
🪙 +${rewardCoins} Coins

⭐ Level: ${getLevel(updatedUser.xp)}
🪙 Coins: ${updatedUser.coins}`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 👤 PROFILE
// ==========================================

bot.hears("👤 Profile", async (ctx) => {
  const user = syncUser(ctx);

  const rank = getUserRank(user.id);
  const levelInfo = getLevelProgress(user.xp);

  await ctx.reply(
    `👤 *YOUR PROFILE*

━━━━━━━━━━━━━━

👤 Name:
*${user.first_name}*

${
  user.username
    ? `🔗 Username: @${user.username}`
    : "🔗 Username: নেই"
}

⭐ Level:
*${levelInfo.level}*

✨ XP:
*${user.xp}*

${progressBar(levelInfo.current)}

${levelInfo.current}/100 XP

🪙 Coins:
*${user.coins}*

🎮 Games:
*${user.games}*

🏆 Wins:
*${user.wins}*

💀 Losses:
*${user.losses}*

📊 Win Rate:
${
  user.games > 0
    ? Math.round((user.wins / user.games) * 100)
    : 0
}%

🏅 Rank:
*#${rank}*

━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🏆 LEADERBOARD
// ==========================================

bot.hears("🏆 Leaderboard", async (ctx) => {
  syncUser(ctx);

  const leaderboard = getLeaderboard(10);

  if (!leaderboard.length) {
    await ctx.reply(
      "🏆 Leaderboard এখনো empty!",
      mainMenu()
    );

    return;
  }

  let text = "🏆 *BANGla FUN HUB LEADERBOARD*\n\n";

  leaderboard.forEach((user, index) => {
    const medals = ["🥇", "🥈", "🥉"];

    const medal =
      medals[index] || `#${index + 1}`;

    text += `${medal} *${user.first_name}*\n`;
    text += `⭐ XP: ${user.xp}\n`;
    text += `🏆 Wins: ${user.wins}\n`;
    text += `🪙 Coins: ${user.coins}\n\n`;
  });

  await ctx.reply(
    text,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🎁 DAILY REWARD
// ==========================================

bot.hears("🎁 Daily Reward", async (ctx) => {
  const user = syncUser(ctx);

  const result = claimDailyReward(user.id);

  if (!result.success) {
    const hours = Math.floor(
      result.remaining / (60 * 60 * 1000)
    );

    const minutes = Math.floor(
      (result.remaining % (60 * 60 * 1000)) /
        (60 * 1000)
    );

    await ctx.reply(
      `⏳ *Daily Reward already claimed!*

আবার reward পেতে অপেক্ষা করতে হবে:

🕐 ${hours}h ${minutes}m

আগামীকাল আবার এসো! 🎁`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );

    return;
  }

  const updatedUser = result.user;

  await ctx.reply(
    `🎁 *DAILY REWARD CLAIMED!*

অভিনন্দন! 🎉

🪙 +${result.coins} Coins
⭐ +${result.xp} XP

━━━━━━━━━━━━━━

⭐ Level: ${getLevel(updatedUser.xp)}
🪙 Coins: ${updatedUser.coins}

আগামীকাল আবার claim করো! 🔥`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 📊 STATS
// ==========================================

bot.hears("📊 Stats", async (ctx) => {
  syncUser(ctx);

  const stats = getStats();

  await ctx.reply(
    `📊 *BANGla FUN HUB STATS*

━━━━━━━━━━━━━━

👥 Total Players:
*${stats.users}*

🎮 Total Games:
*${stats.games}*

🪙 Total Coins:
*${stats.coins}*

🔥 Available Games:

😂 AI Roast Battle
🤣 Meme Battle
😈 Troll Boss

━━━━━━━━━━━━━━

🚀 আরো নতুন features আসছে!`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// ℹ️ HELP
// ==========================================

bot.hears("ℹ️ Help", async (ctx) => {
  syncUser(ctx);

  await ctx.reply(
    `ℹ️ *BANGla FUN HUB HELP*

🔥 *Roast Battle*
AI-এর সাথে roast battle খেলো। AI তোমার roast judge করবে।

🤣 *Meme Battle*
Funny caption বানিয়ে bot-এর সাথে compete করো।

😈 *Troll Boss*
Troll Boss-কে attack করে XP এবং Coins earn করো।

👤 *Profile*
নিজের Level, XP, Coins, Wins দেখতে পারো।

🏆 *Leaderboard*
Top players দেখো।

🎁 *Daily Reward*
প্রতি 24 ঘণ্টায় free Coins + XP।

📊 *Stats*
Bot-এর overall statistics দেখো।

━━━━━━━━━━━━━━

⭐ XP দিয়ে Level বাড়বে।
🪙 Coins দিয়ে future features unlock করা যাবে।

🔥 Have Fun! 🇧🇩`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🔥 ROAST BUTTON
// ==========================================

bot.hears("🔥 Roast Battle", async (ctx) => {
  await startRoastBattle(ctx);
});

// ==========================================
// 🤣 MEME BUTTON
// ==========================================

bot.hears("🤣 Meme Battle", async (ctx) => {
  await startMemeBattle(ctx);
});

// ==========================================
// 💬 TEXT GAME HANDLER
// ==========================================

bot.on("text", async (ctx) => {
  const user = syncUser(ctx);
  const text = ctx.message.text.trim();

  // Ignore menu buttons
  const menuButtons = [
    "🔥 Roast Battle",
    "🤣 Meme Battle",
    "😈 Troll Boss",
    "👤 Profile",
    "🏆 Leaderboard",
    "🎁 Daily Reward",
    "📊 Stats",
    "ℹ️ Help",
    "🏠 Home",
  ];

  if (menuButtons.includes(text)) {
    return;
  }

  // ======================================
  // 🔥 ROAST ANSWER
  // ======================================

  if (roastBattles.has(user.id)) {
    await finishRoast(ctx, text);
    return;
  }

  // ======================================
  // 🤣 MEME ANSWER
  // ======================================

  if (memeBattles.has(user.id)) {
    await finishMemeBattle(ctx, text);
    return;
  }

  await ctx.reply(
    `🤔 এই command আমি বুঝতে পারিনি।

নিচের menu থেকে একটি option select করো। 👇`,
    mainMenu()
  );
});

// ==========================================
// ⚠️ ERROR HANDLER
// ==========================================

bot.catch((error, ctx) => {
  console.error("❌ Bot Error:", error);

  try {
    ctx.reply(
      "❌ কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।",
      mainMenu()
    );
  } catch (replyError) {
    console.error("Reply Error:", replyError);
  }
});

// ==========================================
// 🚀 LAUNCH
// ==========================================

(async () => {
  try {
    await bot.launch();

    console.log("====================================");
    console.log("🇧🇩 Bangla Fun Hub");
    console.log("🤖 Telegram Bot Started");
    console.log("🧠 AI Roast Battle Enabled");
    console.log("🤣 Meme Battle Enabled");
    console.log("😈 Troll Boss Enabled");
    console.log("====================================");
  } catch (error) {
    console.error("❌ Failed to start bot:");
    console.error(error);
  }
})();

// ==========================================
// 🛑 SHUTDOWN
// ==========================================

process.once("SIGINT", () => {
  console.log("🛑 SIGINT received.");
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  console.log("🛑 SIGTERM received.");
  bot.stop("SIGTERM");
});
```
