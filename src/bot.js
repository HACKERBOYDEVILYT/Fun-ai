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
  isAdmin,
  getAdminDashboard,
  getUsers,
  getGameHistory,
  getBroadcastUsers,
  getGameBreakdown,
  giveCoins,
  giveXP,
  blockUser,
  unblockUser,
  isUserBlocked,
  resetUserStats,
  deleteUser,
} = require("./admin");

const {
  judgeRoast,
  generateOpponentRoast,
  judgeOpponent,
  checkRoastSafety,
} = require("./ai");

// ==========================================
// ⚙️ CONFIG
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
  return Math.floor(Number(xp || 0) / 100) + 1;
}

function getLevelProgress(xp) {
  const level = getLevel(xp);
  const current = Number(xp || 0) % 100;

  return {
    level,
    current,
    next: 100,
  };
}

function progressBar(value, max = 100, size = 10) {
  const safeValue = Math.max(
    0,
    Math.min(Number(value) || 0, max)
  );

  const filled = Math.round(
    (safeValue / max) * size
  );

  return (
    "🟩".repeat(filled) +
    "⬜".repeat(size - filled)
  );
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
// 🛡️ ADMIN MIDDLEWARE
// ==========================================

function requireAdmin(ctx) {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    ctx.reply(
      "⛔ এই command শুধু Admin ব্যবহার করতে পারবে।"
    );

    return false;
  }

  return true;
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
// 🚀 START
// ==========================================

bot.start(async (ctx) => {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account বর্তমানে blocked।"
    );

    return;
  }

  await ctx.reply(
    `🇧🇩 *Bangla Fun Hub*-এ স্বাগতম! 🎉

হ্যালো *${user.first_name}*! 👋

🔥 AI Roast Battle
🤣 Meme Battle
😈 Troll Boss

⭐ XP & Level
🪙 Coins
🏆 Leaderboard
🎁 Daily Reward
👤 Profile
📊 Stats

তোমার Level: *${getLevel(user.xp)}*
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

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  await ctx.reply(
    `🏠 *Main Menu*

হ্যালো ${user.first_name}! 👋

⭐ Level: ${getLevel(user.xp)}
🪙 Coins: ${user.coins}`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🔥 ROAST CHALLENGES
// ==========================================

const roastChallenges = [
  "তোমার WiFi এত slow যে Google-ও তোমাকে search result দেওয়ার আগে ঘুমিয়ে পড়ে। 😂",

  "তুমি এত late reply দাও যে তোমার message-এর notification-ও retirement নিয়ে নেয়। 🤣",

  "তোমার phone-এর battery তোমার motivation-এর থেকেও বেশি সময় টিকে। 😭",

  "তোমার coding দেখে bug-গুলো নিজেরাই developer হয়ে যায়। 💀",

  "তুমি এত বেশি online থাকো যে Facebook তোমাকে employee ভাবতে শুরু করেছে। 😂",

  "তোমার selfie camera তোমাকে দেখার পর নিজেই front camera বন্ধ করে দেয়। 🤣",
];

// ==========================================
// 🔥 START ROAST
// ==========================================

async function startRoastBattle(ctx) {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const challenge =
    roastChallenges[
      Math.floor(
        Math.random() * roastChallenges.length
      )
    ];

  roastBattles.set(user.id, {
    challenge,
    status: "waiting",
  });

  await ctx.reply(
    `🔥 *AI ROAST BATTLE STARTED!*

🎯 Target:
"${challenge}"

এখন এই Target-কে roast করো! 😈

✍️ তোমার roast পাঠাও।

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
        [
          Markup.button.callback(
            "❌ Cancel Battle",
            "cancel_roast"
          ),
        ],
      ]),
    }
  );
}

// ==========================================
// 🔥 FINISH ROAST
// ==========================================

async function finishRoast(ctx, answer) {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    roastBattles.delete(user.id);

    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const battle = roastBattles.get(user.id);

  if (!battle) {
    return;
  }

  roastBattles.delete(user.id);

  await ctx.reply(
    "🧠 AI Judge তোমার roast analyse করছে...\n\n⏳ একটু অপেক্ষা করো..."
  );

  try {
    const safety = await checkRoastSafety(answer);

    if (!safety.safe) {
      await ctx.reply(
        `🛡️ *Roast Blocked!*

তোমার roast battle-এর জন্য বেশি offensive হয়ে গেছে।

কারণ:
${safety.reason || "এই content উপযুক্ত নয়।"}

😈 আবার চেষ্টা করতে পারো।`,
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    const playerResult = await judgeRoast({
      target: battle.challenge,
      playerRoast: answer,
    });

    const opponentRoast =
      await generateOpponentRoast(
        battle.challenge
      );

    const opponentResult =
      await judgeOpponent({
        target: battle.challenge,
        opponentRoast,
      });

    const playerScore = Math.max(
      0,
      Math.min(
        100,
        Number(playerResult.score) || 0
      )
    );

    const opponentScore = Math.max(
      0,
      Math.min(
        100,
        Number(opponentResult.score) || 0
      )
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

    let resultText;

    if (result === "win") {
      resultText =
        "🏆 *YOU WIN!*\n\n🔥 তোমার roast AI-কে হারিয়েছে!";
    } else if (result === "loss") {
      resultText =
        "💀 *AI WINS!*\n\n🤖 এবার AI তোমাকে হারিয়েছে!";
    } else {
      resultText =
        "🤝 *DRAW!*\n\nদুজনের score সমান!";
    }

    let levelText = "";

    if (newLevel > oldLevel) {
      levelText =
        `\n\n🎉 *LEVEL UP!*\n⭐ Level ${oldLevel} ➜ *${newLevel}*`;
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

⭐ Level: ${newLevel}
🪙 Coins: ${updatedUser.coins}
${levelText}`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  } catch (error) {
    console.error("❌ AI Roast Error:", error);

    await ctx.reply(
      `❌ AI Roast Battle চালাতে সমস্যা হয়েছে।

API connection অথবা AI service-এ সমস্যা হতে পারে।

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

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const challenge =
    memeChallenges[
      Math.floor(
        Math.random() * memeChallenges.length
      )
    ];

  memeBattles.set(user.id, {
    challenge,
    status: "waiting",
  });

  await ctx.reply(
    `🤣 *MEME BATTLE!*

🎯 Situation:

"${challenge}"

এই situation-এর জন্য funny caption বানাও।

✍️ Caption পাঠাও!`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "❌ Cancel",
            "cancel_meme"
          ),
        ],
      ]),
    }
  );
}

function calculateMemeScore(text) {
  let score = 35;

  if (text.length > 25) score += 10;
  if (text.length > 50) score += 10;
  if (text.length > 80) score += 5;

  const emojis =
    text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [];

  score += Math.min(emojis.length * 3, 12);

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
    if (
      text
        .toLowerCase()
        .includes(word.toLowerCase())
    ) {
      score += 3;
    }
  }

  return Math.min(score, 100);
}

async function finishMemeBattle(ctx, answer) {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    memeBattles.delete(user.id);

    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const battle = memeBattles.get(user.id);

  if (!battle) {
    return;
  }

  memeBattles.delete(user.id);

  const playerScore =
    calculateMemeScore(answer);

  const botScore =
    Math.floor(Math.random() * 41) + 45;

  const botText =
    memeReplies[
      Math.floor(
        Math.random() * memeReplies.length
      )
    ];

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
    resultText =
      "🏆 *তুমি Meme Battle জিতে গেছো!*";
  } else if (result === "loss") {
    resultText =
      "💀 *Bot Meme Battle জিতে গেছে!*";
  } else {
    resultText = "🤝 *Draw!*";
  }

  let levelText = "";

  if (newLevel > oldLevel) {
    levelText =
      `\n🎉 *LEVEL UP!* ${oldLevel} ➜ *${newLevel}*`;
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
🪙 Coins: ${updatedUser.coins}
${levelText}`,
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

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

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
    bosses[
      Math.floor(
        Math.random() * bosses.length
      )
    ];

  const damage =
    Math.floor(Math.random() * 41) + 30;

  const remaining = Math.max(
    0,
    boss.hp - damage
  );

  const rewardXP =
    remaining === 0 ? 80 : 30;

  const rewardCoins =
    remaining === 0 ? 50 : 15;

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
    : "😈 Boss এখনো বেঁচে আছে!"
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
        [
          Markup.button.callback(
            "⚔️ Attack Again",
            "troll_again"
          ),
        ],
      ]),
    }
  );
});

// ==========================================
// 😈 TROLL AGAIN
// ==========================================

bot.action("troll_again", async (ctx) => {
  const user = syncUser(ctx);

  await ctx.answerCbQuery();

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const damage =
    Math.floor(Math.random() * 41) + 35;

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

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const rank = getUserRank(user.id);

  const levelInfo =
    getLevelProgress(user.xp);

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
    ? Math.round(
        (user.wins / user.games) * 100
      )
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
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const leaderboard =
    getLeaderboard(10);

  if (!leaderboard.length) {
    await ctx.reply(
      "🏆 Leaderboard এখনো empty!",
      mainMenu()
    );

    return;
  }

  let text =
    "🏆 *BANGLA FUN HUB LEADERBOARD*\n\n";

  leaderboard.forEach(
    (player, index) => {
      const medals = [
        "🥇",
        "🥈",
        "🥉",
      ];

      const medal =
        medals[index] ||
        `#${index + 1}`;

      text += `${medal} *${player.first_name}*\n`;
      text += `⭐ XP: ${player.xp}\n`;
      text += `🏆 Wins: ${player.wins}\n`;
      text += `🪙 Coins: ${player.coins}\n\n`;
    }
  );

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...mainMenu(),
  });
});

// ==========================================
// 🎁 DAILY REWARD
// ==========================================

bot.hears("🎁 Daily Reward", async (ctx) => {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const result =
    claimDailyReward(user.id);

  if (!result.success) {
    const hours = Math.floor(
      result.remaining /
        (60 * 60 * 1000)
    );

    const minutes = Math.floor(
      (result.remaining %
        (60 * 60 * 1000)) /
        (60 * 1000)
    );

    await ctx.reply(
      `⏳ *Daily Reward already claimed!*

আবার reward পেতে:

🕐 ${hours}h ${minutes}m

আগামীকাল আবার এসো! 🎁`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );

    return;
  }

  const updatedUser =
    result.user;

  await ctx.reply(
    `🎁 *DAILY REWARD CLAIMED!*

🎉 অভিনন্দন!

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
// 📊 USER STATS
// ==========================================

bot.hears("📊 Stats", async (ctx) => {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const stats = getStats();

  await ctx.reply(
    `📊 *BANGLA FUN HUB STATS*

━━━━━━━━━━━━━━

👥 Total Players:
*${stats.users}*

🎮 Total Games:
*${stats.games}*

🪙 Total Coins:
*${stats.coins}*

🔥 Games:

😂 AI Roast Battle
🤣 Meme Battle
😈 Troll Boss

━━━━━━━━━━━━━━

🚀 আরো features আসছে!`,
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
    `ℹ️ *BANGLA FUN HUB HELP*

🔥 *Roast Battle*
AI-এর সাথে roast battle খেলো।

🤣 *Meme Battle*
Funny caption বানাও।

😈 *Troll Boss*
Boss attack করে XP + Coins earn করো।

👤 *Profile*
নিজের stats দেখো।

🏆 *Leaderboard*
Top players দেখো।

🎁 *Daily Reward*
প্রতি 24 ঘণ্টায় reward নাও।

📊 *Stats*
Overall bot statistics দেখো।

━━━━━━━━━━━━━━

⭐ XP → Level
🪙 Coins → Future features

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
// 🛡️ ADMIN DASHBOARD
// ==========================================

bot.command("admin", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const dashboard =
    getAdminDashboard();

  let breakdown = "";

  for (
    const game of dashboard.games.breakdown
  ) {
    breakdown +=
      `\n• ${game.game}: ${game.total}`;
  }

  await ctx.reply(
    `🛡️ *BANGLA FUN HUB ADMIN*

━━━━━━━━━━━━━━

👥 Users:
*${dashboard.users.total}*

🎮 Games:
*${dashboard.games.total}*

🏆 Total Wins:
*${dashboard.users.wins}*

💀 Total Losses:
*${dashboard.users.losses}*

⭐ Total XP:
*${dashboard.users.xp}*

🪙 Total Coins:
*${dashboard.users.coins}*

━━━━━━━━━━━━━━

🎮 *Game Breakdown*
${breakdown || "No games yet"}

━━━━━━━━━━━━━━

🛠️ *Commands*

/users
/user ID
/coins ID amount
/xp ID amount
/block ID
/unblock ID
/reset ID
/delete ID
/games
/history
/broadcast message`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 👥 ADMIN USERS
// ==========================================

bot.command("users", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const users = getUsers(20, 0);

  if (!users.length) {
    await ctx.reply(
      "👥 কোনো user পাওয়া যায়নি।"
    );

    return;
  }

  let text =
    "👥 *LATEST / TOP USERS*\n\n";

  users.forEach((user, index) => {
    const blocked =
      Number(user.blocked) === 1
        ? " 🚫"
        : "";

    text += `${index + 1}. *${user.first_name}*${blocked}\n`;
    text += `🆔 ${user.id}\n`;
    text += `👤 ${user.username ? "@" + user.username : "No username"}\n`;
    text += `⭐ XP: ${user.xp}\n`;
    text += `🪙 Coins: ${user.coins}\n`;
    text += `🎮 Games: ${user.games}\n\n`;
  });

  await ctx.reply(text, {
    parse_mode: "Markdown",
  });
});

// ==========================================
// 👤 ADMIN USER DETAILS
// ==========================================

bot.command("user", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];

  if (!userId) {
    await ctx.reply(
      "Usage:\n/user 123456789"
    );

    return;
  }

  const user = getUser(
    Number(userId)
  );

  if (!user) {
    await ctx.reply(
      "❌ User পাওয়া যায়নি।"
    );

    return;
  }

  const rank =
    getUserRank(user.id);

  await ctx.reply(
    `👤 *USER DETAILS*

━━━━━━━━━━━━━━

Name: *${user.first_name}*

🆔 ID:
\`${user.id}\`

👤 Username:
${
  user.username
    ? "@" + user.username
    : "None"
}

⭐ XP:
*${user.xp}*

⭐ Level:
*${getLevel(user.xp)}*

🪙 Coins:
*${user.coins}*

🎮 Games:
*${user.games}*

🏆 Wins:
*${user.wins}*

💀 Losses:
*${user.losses}*

🏅 Rank:
*#${rank}*

🚫 Blocked:
*${Number(user.blocked) === 1 ? "YES" : "NO"}*`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 🪙 ADMIN COINS
// ==========================================

bot.command("coins", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];
  const amount = parts[2];

  if (!userId || !amount) {
    await ctx.reply(
      "Usage:\n/coins USER_ID AMOUNT\n\nExample:\n/coins 123456789 500\n\nRemove করতে negative amount:\n/coins 123456789 -100"
    );

    return;
  }

  const result =
    giveCoins(
      userId,
      amount
    );

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `🪙 *COINS UPDATED*

👤 ${result.user.first_name}

🆔 ${result.user.id}

🪙 New Coins:
*${result.user.coins}*`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// ⭐ ADMIN XP
// ==========================================

bot.command("xp", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];
  const amount = parts[2];

  if (!userId || !amount) {
    await ctx.reply(
      "Usage:\n/xp USER_ID AMOUNT\n\nExample:\n/xp 123456789 500"
    );

    return;
  }

  const result =
    giveXP(
      userId,
      amount
    );

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `⭐ *XP UPDATED*

👤 ${result.user.first_name}

⭐ XP:
*${result.user.xp}*

⭐ Level:
*${getLevel(result.user.xp)}*`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 🚫 BLOCK
// ==========================================

bot.command("block", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];

  if (!userId) {
    await ctx.reply(
      "Usage:\n/block USER_ID"
    );

    return;
  }

  if (
    String(userId) ===
    String(ctx.from.id)
  ) {
    await ctx.reply(
      "❌ নিজেকে block করা যাবে না।"
    );

    return;
  }

  const result =
    blockUser(userId);

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `🚫 *USER BLOCKED*

👤 ${result.user.first_name}
🆔 ${result.user.id}`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// ✅ UNBLOCK
// ==========================================

bot.command("unblock", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];

  if (!userId) {
    await ctx.reply(
      "Usage:\n/unblock USER_ID"
    );

    return;
  }

  const result =
    unblockUser(userId);

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `✅ *USER UNBLOCKED*

👤 ${result.user.first_name}
🆔 ${result.user.id}`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 🔄 RESET USER
// ==========================================

bot.command("reset", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];

  if (!userId) {
    await ctx.reply(
      "Usage:\n/reset USER_ID"
    );

    return;
  }

  if (
    String(userId) ===
    String(ctx.from.id)
  ) {
    await ctx.reply(
      "❌ নিজের account reset করা যাবে না।"
    );

    return;
  }

  const result =
    resetUserStats(userId);

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `🔄 *USER RESET COMPLETE*

👤 ${result.user.first_name}

⭐ XP: ${result.user.xp}
🪙 Coins: ${result.user.coins}
🎮 Games: ${result.user.games}`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 🗑️ DELETE USER
// ==========================================

bot.command("delete", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const parts =
    ctx.message.text
      .trim()
      .split(/\s+/);

  const userId = parts[1];

  if (!userId) {
    await ctx.reply(
      "Usage:\n/delete USER_ID"
    );

    return;
  }

  if (
    String(userId) ===
    String(ctx.from.id)
  ) {
    await ctx.reply(
      "❌ নিজের account delete করা যাবে না।"
    );

    return;
  }

  const result =
    deleteUser(userId);

  if (!result.success) {
    await ctx.reply(
      `❌ Failed: ${result.reason}`
    );

    return;
  }

  await ctx.reply(
    `🗑️ User *${userId}* permanently deleted.`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 🎮 ADMIN GAME STATS
// ==========================================

bot.command("games", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const games =
    getGameBreakdown();

  if (!games.length) {
    await ctx.reply(
      "🎮 এখনো কোনো game history নেই।"
    );

    return;
  }

  let text =
    "🎮 *GAME STATISTICS*\n\n";

  games.forEach((game) => {
    text += `🎮 *${game.game}*\n`;
    text += `Total: ${game.total}\n`;
    text += `🏆 Wins: ${game.wins || 0}\n`;
    text += `💀 Losses: ${game.losses || 0}\n\n`;
  });

  await ctx.reply(text, {
    parse_mode: "Markdown",
  });
});

// ==========================================
// 📜 ADMIN HISTORY
// ==========================================

bot.command("history", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const history =
    getGameHistory(30);

  if (!history.length) {
    await ctx.reply(
      "📜 কোনো game history নেই।"
    );

    return;
  }

  let text =
    "📜 *RECENT GAME HISTORY*\n\n";

  history.forEach((game, index) => {
    text += `${index + 1}. ${game.game}\n`;
    text += `👤 ${game.first_name || "Unknown"}\n`;
    text += `🆔 ${game.user_id}\n`;
    text += `📌 Result: ${game.result}\n`;
    text += `⭐ XP: ${game.xp}\n`;
    text += `🪙 Coins: ${game.coins}\n`;
    text += `🕐 ${game.created_at}\n\n`;
  });

  await ctx.reply(text, {
    parse_mode: "Markdown",
  });
});

// ==========================================
// 📢 ADMIN BROADCAST
// ==========================================

bot.command("broadcast", async (ctx) => {
  if (!requireAdmin(ctx)) {
    return;
  }

  const message =
    ctx.message.text
      .replace(/^\/broadcast\s*/i, "")
      .trim();

  if (!message) {
    await ctx.reply(
      "Usage:\n/broadcast তোমার message"
    );

    return;
  }

  const users =
    getBroadcastUsers();

  await ctx.reply(
    `📢 Broadcast শুরু হয়েছে।

👥 Target users: ${users.length}

⏳ Sending...`
  );

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(
        user.id,
        `📢 *BANGLA FUN HUB ANNOUNCEMENT*

${message}`,
        {
          parse_mode: "Markdown",
        }
      );

      sent++;

      // Telegram rate-limit কমানোর জন্য
      await new Promise(
        (resolve) =>
          setTimeout(resolve, 80)
      );
    } catch (error) {
      failed++;

      console.error(
        `Broadcast failed for ${user.id}:`,
        error.message
      );
    }
  }

  await ctx.reply(
    `📢 *BROADCAST COMPLETE*

✅ Sent: ${sent}
❌ Failed: ${failed}

👥 Total: ${users.length}`,
    {
      parse_mode: "Markdown",
    }
  );
});

// ==========================================
// 💬 TEXT HANDLER
// ==========================================

bot.on("text", async (ctx) => {
  const user = syncUser(ctx);
  const text =
    ctx.message.text.trim();

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account বর্তমানে blocked।"
    );

    return;
  }

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

  if (roastBattles.has(user.id)) {
    await finishRoast(ctx, text);
    return;
  }

  if (memeBattles.has(user.id)) {
    await finishMemeBattle(ctx, text);
    return;
  }

  await ctx.reply(
    `🤔 এই command আমি বুঝতে পারিনি।

Menu থেকে option select করো। 👇`,
    mainMenu()
  );
});

// ==========================================
// ⚠️ ERROR HANDLER
// ==========================================

bot.catch((error, ctx) => {
  console.error(
    "❌ Telegram Bot Error:",
    error
  );

  try {
    ctx.reply(
      "❌ কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।",
      mainMenu()
    );
  } catch (replyError) {
    console.error(
      "❌ Reply Error:",
      replyError
    );
  }
});

// ==========================================
// 🚀 LAUNCH
// ==========================================

(async () => {
  try {
    await bot.launch();

    console.log(
      "===================================="
    );
    console.log(
      "🇧🇩 Bangla Fun Hub"
    );
    console.log(
      "🤖 Telegram Bot Started"
    );
    console.log(
      "🧠 AI Roast Battle Enabled"
    );
    console.log(
      "🤣 Meme Battle Enabled"
    );
    console.log(
      "😈 Troll Boss Enabled"
    );
    console.log(
      "🛡️ Admin System Enabled"
    );
    console.log(
      "===================================="
    );
  } catch (error) {
    console.error(
      "❌ Failed to start bot:"
    );

    console.error(error);
  }
})();

// ==========================================
// 🛑 SHUTDOWN
// ==========================================

process.once(
  "SIGINT",
  () => {
    console.log(
      "🛑 SIGINT received."
    );

    bot.stop("SIGINT");
  }
);

process.once(
  "SIGTERM",
  () => {
    console.log(
      "🛑 SIGTERM received."
    );

    bot.stop("SIGTERM");
  }
);
```
