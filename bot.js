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
  getBroadcastUsers,
  getGameHistory,
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

  // 🤣 AI Meme Battle
  generateMemeChallenge,
  generateMemeOpponentCaption,
  judgeMeme,
  checkMemeSafety,
  generateMemeRoast,
} = require("./ai");

// ==========================================
// ⚙️ CONFIG
// ==========================================

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN পাওয়া যায়নি!");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// 🎮 GAME STATES
// ==========================================

const roastBattles = new Map();
const memeBattles = new Map();

// ==========================================
// 🛡️ ADMIN STATES
// ==========================================

const adminConfirmations = new Map();
const broadcastDrafts = new Map();

// ==========================================
// 🧠 LEVEL SYSTEM
// ==========================================

function getLevel(xp) {
  return Math.floor(Number(xp || 0) / 100) + 1;
}

function getLevelProgress(xp) {
  const level = getLevel(xp);
  const current = Math.max(0, Number(xp || 0) % 100);

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
// 🛡️ ADMIN CHECK
// ==========================================

async function requireAdmin(ctx) {
  if (!ctx.from || !isAdmin(ctx.from.id)) {
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery(
          "⛔ শুধু Admin এই action ব্যবহার করতে পারবে।",
          {
            show_alert: true,
          }
        );
      } catch {}
    } else {
      await ctx.reply(
        "⛔ এই command শুধু Admin ব্যবহার করতে পারবে।"
      );
    }

    return false;
  }

  return true;
}

// ==========================================
// 🏠 USER MENU
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
// 🛡️ ADMIN KEYBOARD
// ==========================================

function adminKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "📊 Dashboard",
        "admin_dashboard"
      ),
      Markup.button.callback(
        "👥 Users",
        "admin_users"
      ),
    ],
    [
      Markup.button.callback(
        "🎮 Games",
        "admin_games"
      ),
      Markup.button.callback(
        "📜 History",
        "admin_history"
      ),
    ],
    [
      Markup.button.callback(
        "📢 Broadcast",
        "admin_broadcast"
      ),
    ],
    [
      Markup.button.callback(
        "❌ Close Panel",
        "admin_close"
      ),
    ],
  ]);
}

// ==========================================
// 🛡️ ADMIN DASHBOARD
// ==========================================

function buildAdminDashboard() {
  const dashboard = getAdminDashboard();

  let breakdown = "";

  if (
    dashboard.games.breakdown &&
    dashboard.games.breakdown.length
  ) {
    for (const game of dashboard.games.breakdown) {
      breakdown +=
        `\n🎮 ${game.game}: *${game.total}*`;
    }
  } else {
    breakdown = "\nNo games yet.";
  }

  return `🛡️ *BANGLA FUN HUB ADMIN PANEL*

━━━━━━━━━━━━━━━━━━

👥 Total Users
*${dashboard.users.total}*

🎮 Total Games
*${dashboard.games.total}*

🏆 Total Wins
*${dashboard.users.wins}*

💀 Total Losses
*${dashboard.users.losses}*

⭐ Total XP
*${dashboard.users.xp}*

🪙 Total Coins
*${dashboard.users.coins}*

━━━━━━━━━━━━━━━━━━

🎮 *GAME BREAKDOWN*
${breakdown}

━━━━━━━━━━━━━━━━━━

🔐 Admin Mode: *ACTIVE*`;
}

// ==========================================
// 🛡️ SHOW ADMIN PANEL
// ==========================================

async function showAdminPanel(ctx, edit = false) {
  if (!(await requireAdmin(ctx))) {
    return;
  }

  const text = buildAdminDashboard();
  const keyboard = adminKeyboard();

  if (edit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        ...keyboard,
      });

      return;
    } catch (error) {
      console.error(
        "Admin panel edit error:",
        error.message
      );
    }
  }

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...keyboard,
  });
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
🤣 AI Meme Battle
😈 Troll Boss

⭐ XP & Level
🪙 Coins
🏆 Leaderboard
🎁 Daily Reward
👤 Profile
📊 Stats

⭐ Level: *${getLevel(user.xp)}*
🪙 Coins: *${user.coins}*

চলো শুরু করি! 😈🔥`,
    {
      parse_mode: "Markdown",
      ...mainMenu(),
    }
  );
});

// ==========================================
// 🔥 ROAST BATTLE
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

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const challenge =
    roastChallenges[
      Math.floor(
        Math.random() *
          roastChallenges.length
      )
    ];

  roastBattles.set(user.id, {
    challenge,
  });

  await ctx.reply(
    `🔥 *AI ROAST BATTLE*

🎯 Target:

"${challenge}"

এখন এই Target-কে roast করো! 😈

✍️ তোমার roast পাঠাও।

AI বিচার করবে:

😂 Funny
🧠 Creativity
🎯 Relevance
✨ Originality
🎤 Delivery

🏆 Maximum: 100`,
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
    "🧠 AI Judge analyse করছে...\n\n⏳ অপেক্ষা করো..."
  );

  try {
    const safety =
      await checkRoastSafety(answer);

    if (!safety.safe) {
      await ctx.reply(
        `🛡️ *Roast Blocked!*

${safety.reason || "এই content উপযুক্ত নয়।"}`,
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    const playerResult =
      await judgeRoast({
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
    } else if (
      playerScore < opponentScore
    ) {
      result = "loss";
      xp = 20;
      coins = 10;
    } else {
      result = "draw";
      xp = 45;
      coins = 25;
    }

    const before = getUser(user.id);

    const updatedUser =
      addGame(
        user.id,
        "roast",
        result,
        xp,
        coins
      );

    const oldLevel =
      getLevel(before.xp);

    const newLevel =
      getLevel(updatedUser.xp);

    let resultText;

    if (result === "win") {
      resultText =
        "🏆 *YOU WIN!*\n\n🔥 AI-কে roast battle-এ হারিয়ে দিয়েছো!";
    } else if (result === "loss") {
      resultText =
        "💀 *AI WINS!*\n\n🤖 এবার AI তোমাকে হারিয়েছে!";
    } else {
      resultText =
        "🤝 *DRAW!*\n\nদুজনের score সমান!";
    }

    const levelText =
      newLevel > oldLevel
        ? `\n\n🎉 *LEVEL UP!*\n⭐ ${oldLevel} ➜ *${newLevel}*`
        : "";

    await ctx.reply(
      `🔥 *AI ROAST RESULT*

🎯 Target:
${battle.challenge}

👤 *তোমার Roast:*
"${answer}"

🤖 *AI Roast:*
"${opponentRoast}"

━━━━━━━━━━━━━━━━━━

👤 Score: *${playerScore}/100*
${progressBar(playerScore)}

🤖 AI Score: *${opponentScore}/100*
${progressBar(opponentScore)}

━━━━━━━━━━━━━━━━━━

🧠 *AI JUDGE*

😂 Funny: ${playerResult.funny ?? "-"}
🧠 Creativity: ${playerResult.creativity ?? "-"}
🎯 Relevance: ${playerResult.relevance ?? "-"}
✨ Originality: ${playerResult.originality ?? "-"}
🎤 Delivery: ${playerResult.delivery ?? "-"}

💬 ${playerResult.comment || "ভালো roast ছিল! 😂"}

━━━━━━━━━━━━━━━━━━

${resultText}

🎁 +${xp} XP
🪙 +${coins} Coins

⭐ Level: ${newLevel}
🪙 Coins: ${updatedUser.coins}${levelText}`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  } catch (error) {
    console.error(
      "❌ AI Roast Error:",
      error
    );

    await ctx.reply(
      "❌ AI Roast চালাতে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।",
      mainMenu()
    );
  }
}

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
// 🤣 AI MEME BATTLE
// ==========================================

async function startMemeBattle(ctx) {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  await ctx.reply(
    "🤖 *AI MEME GENERATOR চলছে...*\n\n⏳ তোমার জন্য নতুন meme situation বানানো হচ্ছে!",
    {
      parse_mode: "Markdown",
    }
  );

  try {
    const challenge =
      await generateMemeChallenge();

    memeBattles.set(user.id, {
      challenge: challenge.situation,
      theme: challenge.theme,
      emoji: challenge.emoji,
    });

    await ctx.reply(
      `🤣 *AI MEME BATTLE*

━━━━━━━━━━━━━━━━━━

🎭 Theme:
*${challenge.theme}*

🎯 *MEME SITUATION*

${challenge.emoji} ${challenge.situation}

━━━━━━━━━━━━━━━━━━

✍️ এখন এই situation-এর জন্য
তোমার সবচেয়ে funny caption লিখো!

🧠 AI তোমার caption judge করবে।

📊 Judge Criteria:

😂 Funny
🧠 Creativity
🎯 Relevance
✨ Originality
🎤 Punchline

🏆 Maximum Score: *100*

━━━━━━━━━━━━━━━━━━

💡 Tip:
Short + relatable + unexpected punchline দিলে বেশি score পাবে!`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "❌ Cancel Meme Battle",
              "cancel_meme"
            ),
          ],
        ]),
      }
    );
  } catch (error) {
    console.error(
      "❌ Start Meme Battle Error:",
      error
    );

    await ctx.reply(
      "❌ AI Meme Generator এখন available নয়। কিছুক্ষণ পরে আবার চেষ্টা করো।",
      mainMenu()
    );
  }
}

// ==========================================
// 🤣 FINISH AI MEME BATTLE
// ==========================================

async function finishMemeBattle(
  ctx,
  answer
) {
  const user = syncUser(ctx);

  if (isUserBlocked(user.id)) {
    memeBattles.delete(user.id);

    await ctx.reply(
      "🚫 তোমার account blocked।"
    );

    return;
  }

  const battle =
    memeBattles.get(user.id);

  if (!battle) {
    return;
  }

  memeBattles.delete(user.id);

  await ctx.reply(
    "🧠 *AI Meme Judge কাজ করছে...*\n\n😂 Caption analyse করা হচ্ছে...\n🤖 AI opponent তৈরি হচ্ছে...",
    {
      parse_mode: "Markdown",
    }
  );

  try {
    // ======================================
    // 🛡️ PLAYER MEME SAFETY
    // ======================================

    const safety =
      await checkMemeSafety(answer);

    if (!safety.safe) {
      await ctx.reply(
        `🛡️ *MEME BLOCKED*

এই captionটি Meme Battle-এর জন্য উপযুক্ত নয়।

💬 ${safety.reason || "এই content safe নয়।"}

একটি নতুন funny এবং friendly caption দিয়ে আবার চেষ্টা করো।`,
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    // ======================================
    // 🧠 AI PLAYER JUDGE
    // ======================================

    const playerResult =
      await judgeMeme({
        situation: battle.challenge,
        playerCaption: answer,
      });

    // ======================================
    // 🤖 AI OPPONENT CAPTION
    // ======================================

    const opponentCaption =
      await generateMemeOpponentCaption(
        battle.challenge
      );

    // ======================================
    // 🧠 AI OPPONENT JUDGE
    // ======================================

    const opponentResult =
      await judgeMeme({
        situation: battle.challenge,
        playerCaption: opponentCaption,
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

    // ======================================
    // 🏆 RESULT
    // ======================================

    let result;
    let xp;
    let coins;

    if (playerScore > opponentScore) {
      result = "win";
      xp = 60;
      coins = 30;
    } else if (
      playerScore < opponentScore
    ) {
      result = "loss";
      xp = 20;
      coins = 10;
    } else {
      result = "draw";
      xp = 40;
      coins = 20;
    }

    // ======================================
    // 😂 AI COMMENTATOR
    // ======================================

    const aiReaction =
      await generateMemeRoast({
        situation: battle.challenge,
        playerCaption: answer,
        score: playerScore,
      });

    // ======================================
    // 💰 SAVE GAME
    // ======================================

    const before =
      getUser(user.id);

    const updatedUser =
      addGame(
        user.id,
        "meme",
        result,
        xp,
        coins
      );

    const oldLevel =
      getLevel(before.xp);

    const newLevel =
      getLevel(updatedUser.xp);

    // ======================================
    // 🎉 RESULT TEXT
    // ======================================

    let resultText;

    if (result === "win") {
      resultText =
        "🏆 *YOU WIN!*\n\n🔥 তোমার meme AI-কে হারিয়ে দিয়েছে!";
    } else if (result === "loss") {
      resultText =
        "🤖 *AI WINS!*\n\n💀 AI-এর punchline এবার বেশি dangerous ছিল!";
    } else {
      resultText =
        "🤝 *DRAW!*\n\nদুজনের meme score সমান!";
    }

    // ======================================
    // ⭐ LEVEL UP
    // ======================================

    const levelText =
      newLevel > oldLevel
        ? `\n\n🎉 *LEVEL UP!*\n⭐ ${oldLevel} ➜ *${newLevel}*`
        : "";

    // ======================================
    // 📊 FINAL RESULT
    // ======================================

    await ctx.reply(
      `🤣 *AI MEME BATTLE RESULT*

🎭 Theme:
*${battle.theme || "Meme"}*

━━━━━━━━━━━━━━━━━━

🎯 *SITUATION*

${battle.emoji || "😂"} ${battle.challenge}

━━━━━━━━━━━━━━━━━━

👤 *YOUR CAPTION*

"${answer}"

👤 Score:
*${playerScore}/100*

${progressBar(playerScore)}

━━━━━━━━━━━━━━━━━━

🤖 *AI CAPTION*

"${opponentCaption}"

🤖 Score:
*${opponentScore}/100*

${progressBar(opponentScore)}

━━━━━━━━━━━━━━━━━━

🧠 *AI JUDGE*

😂 Funny:
*${playerResult.funny ?? "-"}/30*

🧠 Creativity:
*${playerResult.creativity ?? "-"}/25*

🎯 Relevance:
*${playerResult.relevance ?? "-"}/20*

✨ Originality:
*${playerResult.originality ?? "-"}/15*

🎤 Delivery:
*${playerResult.delivery ?? "-"}/10*

━━━━━━━━━━━━━━━━━━

💬 *AI COMMENTATOR*

${aiReaction}

━━━━━━━━━━━━━━━━━━

${resultText}

🎁 +${xp} XP
🪙 +${coins} Coins

⭐ Level:
*${newLevel}*

🪙 Coins:
*${updatedUser.coins}*${levelText}`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  } catch (error) {
    console.error(
      "❌ AI Meme Battle Error:",
      error
    );

    await ctx.reply(
      "❌ AI Meme Battle চালাতে সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।",
      mainMenu()
    );
  }
}

// ==========================================
// ❌ CANCEL MEME
// ==========================================

bot.action(
  "cancel_meme",
  async (ctx) => {
    const user = syncUser(ctx);

    memeBattles.delete(user.id);

    await ctx.answerCbQuery();

    await ctx.reply(
      "❌ Meme Battle cancel করা হয়েছে।",
      mainMenu()
    );
  }
);

// ==========================================
// 😈 TROLL BOSS
// ==========================================

bot.hears(
  "😈 Troll Boss",
  async (ctx) => {
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
          Math.random() *
            bosses.length
        )
      ];

    const damage =
      Math.floor(
        Math.random() * 41
      ) + 30;

    const remaining =
      Math.max(
        0,
        boss.hp - damage
      );

    const rewardXP =
      remaining === 0
        ? 80
        : 30;

    const rewardCoins =
      remaining === 0
        ? 50
        : 15;

    const updatedUser =
      addGame(
        user.id,
        "troll",
        remaining === 0
          ? "win"
          : "attack",
        rewardXP,
        rewardCoins
      );

    await ctx.reply(
      `😈 *TROLL BOSS*

Boss: *${boss.name}*

❤️ HP: ${boss.hp}

💬 "${boss.text}"

━━━━━━━━━━━━━━━━━━

⚔️ Damage: *${damage}*

❤️ Remaining HP:
*${remaining}*

${
  remaining === 0
    ? "🏆 *BOSS DEFEATED!*"
    : "😈 Boss এখনো বেঁচে আছে!"
}

━━━━━━━━━━━━━━━━━━

🎁 +${rewardXP} XP
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
  }
);

bot.action(
  "troll_again",
  async (ctx) => {
    const user = syncUser(ctx);

    await ctx.answerCbQuery();

    if (isUserBlocked(user.id)) {
      await ctx.reply(
        "🚫 তোমার account blocked।"
      );

      return;
    }

    const damage =
      Math.floor(
        Math.random() * 41
      ) + 35;

    const rewardXP = 35;
    const rewardCoins = 15;

    const updatedUser =
      addGame(
        user.id,
        "troll",
        "attack",
        rewardXP,
        rewardCoins
      );

    await ctx.reply(
      `⚔️ *CRITICAL ATTACK!*

😈 Damage: *${damage}*

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
  }
);

// ==========================================
// 👤 PROFILE
// ==========================================

bot.hears(
  "👤 Profile",
  async (ctx) => {
    const user = syncUser(ctx);

    if (isUserBlocked(user.id)) {
      await ctx.reply(
        "🚫 তোমার account blocked।"
      );

      return;
    }

    const rank =
      getUserRank(user.id);

    const levelInfo =
      getLevelProgress(user.xp);

    await ctx.reply(
      `👤 *YOUR PROFILE*

━━━━━━━━━━━━━━━━━━

👤 Name:
*${user.first_name}*

👤 Username:
${
  user.username
    ? "@" + user.username
    : "None"
}

⭐ Level:
*${levelInfo.level}*

✨ XP:
*${user.xp}*

${progressBar(
  levelInfo.current
)}

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
        (user.wins /
          user.games) *
          100
      )
    : 0
}%

🏅 Rank:
*#${rank}*`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  }
);

// ==========================================
// 🏆 LEADERBOARD
// ==========================================

bot.hears(
  "🏆 Leaderboard",
  async (ctx) => {
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
        "🏆 Leaderboard empty!",
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
  }
);

// ==========================================
// 🎁 DAILY REWARD
// ==========================================

bot.hears(
  "🎁 Daily Reward",
  async (ctx) => {
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
      const hours =
        Math.floor(
          result.remaining /
            (60 * 60 * 1000)
        );

      const minutes =
        Math.floor(
          (result.remaining %
            (60 * 60 * 1000)) /
            (60 * 1000)
        );

      await ctx.reply(
        `⏳ *Daily Reward already claimed!*

🕐 আবার পেতে:
*${hours}h ${minutes}m*

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
      `🎁 *DAILY REWARD*

🎉 Claimed!

🪙 +${result.coins} Coins
⭐ +${result.xp} XP

⭐ Level: ${getLevel(updatedUser.xp)}
🪙 Coins: ${updatedUser.coins}`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  }
);

// ==========================================
// 📊 STATS
// ==========================================

bot.hears(
  "📊 Stats",
  async (ctx) => {
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

━━━━━━━━━━━━━━━━━━

👥 Players:
*${stats.users}*

🎮 Games:
*${stats.games}*

🪙 Coins:
*${stats.coins}*

🔥 AI Roast Battle
🤣 AI Meme Battle
😈 Troll Boss`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  }
);

// ==========================================
// ℹ️ HELP
// ==========================================

bot.hears(
  "ℹ️ Help",
  async (ctx) => {
    syncUser(ctx);

    await ctx.reply(
      `ℹ️ *BANGLA FUN HUB HELP*

🔥 Roast Battle
AI-এর সাথে roast battle।

🤣 Meme Battle
AI-generated situation-এর সাথে
AI-powered caption battle।

😈 Troll Boss
Boss attack করে reward earn করো।

👤 Profile
নিজের stats দেখো।

🏆 Leaderboard
Top players দেখো।

🎁 Daily Reward
প্রতি 24 ঘণ্টায় reward।

📊 Stats
Bot statistics।`,
      {
        parse_mode: "Markdown",
        ...mainMenu(),
      }
    );
  }
);

// ==========================================
// 🎮 MENU HANDLERS
// ==========================================

bot.hears(
  "🔥 Roast Battle",
  async (ctx) => {
    await startRoastBattle(ctx);
  }
);

bot.hears(
  "🤣 Meme Battle",
  async (ctx) => {
    await startMemeBattle(ctx);
  }
);

// ==========================================
// 🛡️ ADMIN COMMAND
// ==========================================

bot.command(
  "admin",
  async (ctx) => {
    await showAdminPanel(ctx);
  }
);

// ==========================================
// 📊 ADMIN DASHBOARD
// ==========================================

bot.action(
  "admin_dashboard",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    await ctx.answerCbQuery();

    await showAdminPanel(
      ctx,
      true
    );
  }
);

// ==========================================
// 👥 ADMIN USERS
// ==========================================

async function showAdminUsers(ctx) {
  const users =
    getUsers(15, 0);

  if (!users.length) {
    await ctx.reply(
      "👥 কোনো user পাওয়া যায়নি।"
    );

    return;
  }

  let text =
    "👥 *USER MANAGEMENT*\n\n";

  users.forEach(
    (user, index) => {
      const blocked =
        Number(user.blocked) === 1
          ? " 🚫"
          : "";

      text +=
        `${index + 1}. *${user.first_name}*${blocked}\n`;

      text +=
        `🆔 ${user.id}\n`;

      text +=
        `⭐ ${user.xp} XP  •  🪙 ${user.coins}\n`;

      text +=
        `🎮 ${user.games} Games\n\n`;
    }
  );

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "🔄 Refresh",
          "admin_users"
        ),
      ],
      [
        Markup.button.callback(
          "🔙 Admin Panel",
          "admin_dashboard"
        ),
      ],
    ]),
  });
}

bot.action(
  "admin_users",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    await ctx.answerCbQuery();

    await showAdminUsers(ctx);
  }
);

// ==========================================
// 👤 USER MANAGEMENT
// ==========================================

async function showUserManagement(
  ctx,
  userId
) {
  const user =
    getUser(Number(userId));

  if (!user) {
    await ctx.reply(
      "❌ User পাওয়া যায়নি।"
    );

    return;
  }

  const blocked =
    Number(user.blocked) === 1;

  const rank =
    getUserRank(user.id);

  await ctx.reply(
    `👤 *USER MANAGEMENT*

━━━━━━━━━━━━━━━━━━

👤 Name:
*${user.first_name}*

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

🚫 Status:
*${blocked ? "BLOCKED" : "ACTIVE"}*`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🪙 +100 Coins",
            `admin_coin_${user.id}_100`
          ),
          Markup.button.callback(
            "⭐ +100 XP",
            `admin_xp_${user.id}_100`
          ),
        ],
        [
          blocked
            ? Markup.button.callback(
                "✅ Unblock",
                `admin_unblock_${user.id}`
              )
            : Markup.button.callback(
                "🚫 Block",
                `admin_block_${user.id}`
              ),
        ],
        [
          Markup.button.callback(
            "🔄 Reset Stats",
            `admin_reset_${user.id}`
          ),
        ],
        [
          Markup.button.callback(
            "🗑️ Delete User",
            `admin_delete_${user.id}`
          ),
        ],
        [
          Markup.button.callback(
            "🔙 Users",
            "admin_users"
          ),
        ],
      ]),
    }
  );
}

// ==========================================
// 👤 /USER
// ==========================================

bot.command(
  "user",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const parts =
      ctx.message.text
        .trim()
        .split(/\s+/);

    const userId = parts[1];

    if (!userId) {
      await ctx.reply(
        "Usage:\n/user USER_ID"
      );

      return;
    }

    await showUserManagement(
      ctx,
      userId
    );
  }
);

// ==========================================
// 🪙 /COINS
// ==========================================

bot.command(
  "coins",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
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
        "Usage:\n/coins USER_ID AMOUNT\n\nExample:\n/coins 123456789 500"
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
      `🪙 Coins updated!\n\n👤 ${result.user.first_name}\n🪙 New balance: *${result.user.coins}*`,
      {
        parse_mode: "Markdown",
      }
    );
  }
);

// ==========================================
// ⭐ /XP
// ==========================================

bot.command(
  "xp",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
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
        "Usage:\n/xp USER_ID AMOUNT"
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
      `⭐ XP updated!\n\n👤 ${result.user.first_name}\n⭐ XP: *${result.user.xp}*\n⭐ Level: *${getLevel(result.user.xp)}*`,
      {
        parse_mode: "Markdown",
      }
    );
  }
);

// ==========================================
// 🪙 INLINE COINS
// ==========================================

bot.action(
  /^admin_coin_(\d+)_(-?\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    const amount =
      Number(ctx.match[2]);

    const result =
      giveCoins(
        userId,
        amount
      );

    if (!result.success) {
      await ctx.answerCbQuery(
        "❌ Failed",
        {
          show_alert: true,
        }
      );

      return;
    }

    await ctx.answerCbQuery(
      `🪙 +${amount} Coins added`
    );

    await ctx.reply(
      `🪙 *COINS UPDATED*

👤 ${result.user.first_name}

🪙 New balance:
*${result.user.coins}*`,
      {
        parse_mode: "Markdown",
      }
    );
  }
);

// ==========================================
// ⭐ INLINE XP
// ==========================================

bot.action(
  /^admin_xp_(\d+)_(-?\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    const amount =
      Number(ctx.match[2]);

    const result =
      giveXP(
        userId,
        amount
      );

    if (!result.success) {
      await ctx.answerCbQuery(
        "❌ Failed",
        {
          show_alert: true,
        }
      );

      return;
    }

    await ctx.answerCbQuery(
      `⭐ +${amount} XP added`
    );

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
  }
);

// ==========================================
// ⚠️ CONFIRMATION
// ==========================================

async function askConfirmation(
  ctx,
  action,
  userId,
  description
) {
  adminConfirmations.set(
    ctx.from.id,
    {
      action,
      userId: Number(userId),
      createdAt: Date.now(),
    }
  );

  await ctx.answerCbQuery();

  await ctx.reply(
    `⚠️ *CONFIRM ACTION*

${description}

🆔 User ID:
\`${userId}\`

এই action সত্যিই execute করতে চাও?`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Confirm",
            "admin_confirm"
          ),
          Markup.button.callback(
            "❌ Cancel",
            "admin_cancel_confirm"
          ),
        ],
      ]),
    }
  );
}

// ==========================================
// 🚫 BLOCK
// ==========================================

bot.action(
  /^admin_block_(\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    if (
      userId === ctx.from.id
    ) {
      await ctx.answerCbQuery(
        "❌ নিজেকে block করা যাবে না।",
        {
          show_alert: true,
        }
      );

      return;
    }

    await askConfirmation(
      ctx,
      "block",
      userId,
      "🚫 এই user-কে block করা হবে।"
    );
  }
);

// ==========================================
// ✅ UNBLOCK
// ==========================================

bot.action(
  /^admin_unblock_(\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    await askConfirmation(
      ctx,
      "unblock",
      userId,
      "✅ এই user-কে unblock করা হবে।"
    );
  }
);

// ==========================================
// 🔄 RESET
// ==========================================

bot.action(
  /^admin_reset_(\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    if (
      userId === ctx.from.id
    ) {
      await ctx.answerCbQuery(
        "❌ নিজের stats reset করা যাবে না।",
        {
          show_alert: true,
        }
      );

      return;
    }

    await askConfirmation(
      ctx,
      "reset",
      userId,
      `🔄 এই user-এর:

• XP
• Coins
• Wins
• Losses
• Games
• Game History
• Daily Reward

reset করা হবে।`
    );
  }
);

// ==========================================
// 🗑️ DELETE
// ==========================================

bot.action(
  /^admin_delete_(\d+)$/,
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const userId =
      Number(ctx.match[1]);

    if (
      userId === ctx.from.id
    ) {
      await ctx.answerCbQuery(
        "❌ নিজেকে delete করা যাবে না।",
        {
          show_alert: true,
        }
      );

      return;
    }

    await askConfirmation(
      ctx,
      "delete",
      userId,
      `🗑️ *WARNING*

এই user permanently delete হবে।

User profile এবং game history মুছে যাবে।

এই action undo করা যাবে না।`
    );
  }
);

// ==========================================
// ⚠️ CONFIRM ACTION
// ==========================================

bot.action(
  "admin_confirm",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const pending =
      adminConfirmations.get(
        ctx.from.id
      );

    if (!pending) {
      await ctx.answerCbQuery(
        "⚠️ কোনো pending action নেই।",
        {
          show_alert: true,
        }
      );

      return;
    }

    if (
      Date.now() -
        pending.createdAt >
      5 * 60 * 1000
    ) {
      adminConfirmations.delete(
        ctx.from.id
      );

      await ctx.answerCbQuery(
        "⏰ Confirmation expired.",
        {
          show_alert: true,
        }
      );

      return;
    }

    adminConfirmations.delete(
      ctx.from.id
    );

    const {
      action,
      userId,
    } = pending;

    let result;

    if (action === "block") {
      result =
        blockUser(userId);
    }

    if (action === "unblock") {
      result =
        unblockUser(userId);
    }

    if (action === "reset") {
      result =
        resetUserStats(userId);
    }

    if (action === "delete") {
      result =
        deleteUser(userId);
    }

    await ctx.answerCbQuery();

    if (!result || !result.success) {
      await ctx.reply(
        `❌ Action failed: ${
          result?.reason ||
          "unknown error"
        }`
      );

      return;
    }

    const actionText = {
      block:
        "🚫 User blocked successfully.",

      unblock:
        "✅ User unblocked successfully.",

      reset:
        "🔄 User stats reset successfully.",

      delete:
        "🗑️ User permanently deleted.",
    };

    await ctx.reply(
      actionText[action] ||
        "✅ Action completed."
    );

    await showAdminPanel(ctx);
  }
);

// ==========================================
// ❌ CANCEL CONFIRMATION
// ==========================================

bot.action(
  "admin_cancel_confirm",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    adminConfirmations.delete(
      ctx.from.id
    );

    await ctx.answerCbQuery(
      "❌ Action cancelled."
    );

    await ctx.reply(
      "❌ Action cancel করা হয়েছে।"
    );
  }
);

// ==========================================
// 🎮 GAME STATISTICS
// ==========================================

bot.action(
  "admin_games",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    await ctx.answerCbQuery();

    const games =
      getGameBreakdown();

    let text =
      "🎮 *GAME STATISTICS*\n\n";

    if (!games.length) {
      text +=
        "এখনো কোনো game history নেই।";
    } else {
      games.forEach(
        (game) => {
          text +=
            `🎮 *${game.game}*\n`;

          text +=
            `Total: ${game.total}\n`;

          text +=
            `🏆 Wins: ${game.wins || 0}\n`;

          text +=
            `💀 Losses: ${game.losses || 0}\n\n`;
        }
      );
    }

    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🔙 Admin Panel",
            "admin_dashboard"
          ),
        ],
      ]),
    });
  }
);

// ==========================================
// 📜 HISTORY
// ==========================================

bot.action(
  "admin_history",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    await ctx.answerCbQuery();

    const history =
      getGameHistory(20);

    let text =
      "📜 *RECENT GAME HISTORY*\n\n";

    if (!history.length) {
      text +=
        "No game history.";
    } else {
      history.forEach(
        (game, index) => {
          text +=
            `${index + 1}. *${game.game}*\n`;

          text +=
            `👤 ${game.first_name || "Unknown"}\n`;

          text +=
            `🆔 ${game.user_id}\n`;

          text +=
            `📌 ${game.result}\n`;

          text +=
            `⭐ +${game.xp} XP  •  🪙 +${game.coins}\n\n`;
        }
      );
    }

    await ctx.reply(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🔙 Admin Panel",
            "admin_dashboard"
          ),
        ],
      ]),
    });
  }
);

// ==========================================
// 📢 BROADCAST START
// ==========================================

bot.action(
  "admin_broadcast",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    await ctx.answerCbQuery();

    broadcastDrafts.set(
      ctx.from.id,
      {
        waitingMessage: true,
        createdAt: Date.now(),
      }
    );

    await ctx.reply(
      `📢 *SAFE BROADCAST*

এখন যে announcement পাঠাতে চাও সেটা লিখে পাঠাও।

Example:

/message নতুন game mode খুব শীঘ্রই আসছে! 🔥

অথবা সরাসরি:

নতুন game mode খুব শীঘ্রই আসছে! 🔥

━━━━━━━━━━━━━━━━━━

⚠️ Message আগে preview হবে।
তুমি Confirm না করা পর্যন্ত কোনো user-এর কাছে যাবে না।

❌ Cancel করতে:
 /cancelbroadcast`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "❌ Cancel Broadcast",
              "admin_broadcast_cancel"
            ),
          ],
        ]),
      }
    );
  }
);

// ==========================================
// 📢 BROADCAST CANCEL
// ==========================================

bot.action(
  "admin_broadcast_cancel",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    broadcastDrafts.delete(
      ctx.from.id
    );

    await ctx.answerCbQuery(
      "Broadcast cancelled."
    );

    await ctx.reply(
      "❌ Broadcast cancel করা হয়েছে।"
    );

    await showAdminPanel(ctx);
  }
);

// ==========================================
// 📢 /BROADCAST
// ==========================================

bot.command(
  "broadcast",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const message =
      ctx.message.text
        .replace(
          /^\/broadcast\s*/i,
          ""
        )
        .trim();

    if (!message) {
      broadcastDrafts.set(
        ctx.from.id,
        {
          waitingMessage: true,
          createdAt: Date.now(),
        }
      );

      await ctx.reply(
        `📢 *SAFE BROADCAST*

Announcement message পাঠাও।

Message আগে preview হবে।
Confirm করার আগে কিছু send হবে না।

❌ Cancel:
 /cancelbroadcast`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "❌ Cancel",
                "admin_broadcast_cancel"
              ),
            ],
          ]),
        }
      );

      return;
    }

    await prepareBroadcast(
      ctx,
      message
    );
  }
);

// ==========================================
// 📢 PREPARE BROADCAST
// ==========================================

async function prepareBroadcast(
  ctx,
  message
) {
  const users =
    getBroadcastUsers();

  if (!users.length) {
    await ctx.reply(
      "📢 Broadcast করার মতো কোনো active user নেই।"
    );

    return;
  }

  const cleanMessage =
    String(message)
      .trim()
      .slice(0, 3500);

  broadcastDrafts.set(
    ctx.from.id,
    {
      waitingMessage: false,
      message: cleanMessage,
      recipientCount: users.length,
      createdAt: Date.now(),
    }
  );

  await ctx.reply(
    `📢 *BROADCAST PREVIEW*

━━━━━━━━━━━━━━━━━━

📝 *Message:*

${cleanMessage}

━━━━━━━━━━━━━━━━━━

👥 Recipients:
*${users.length} active users*

🚫 Blocked users:
বাদ দেওয়া হয়েছে

⚠️ Message send করার আগে তোমার confirmation লাগবে।

Send করবো?`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ SEND BROADCAST",
            "admin_broadcast_confirm"
          ),
        ],
        [
          Markup.button.callback(
            "✏️ Edit",
            "admin_broadcast"
          ),
          Markup.button.callback(
            "❌ Cancel",
            "admin_broadcast_cancel"
          ),
        ],
      ]),
    }
  );
}

// ==========================================
// 📢 BROADCAST TEXT
// ==========================================

async function handleBroadcastText(
  ctx,
  text
) {
  if (!(await requireAdmin(ctx))) {
    return;
  }

  const draft =
    broadcastDrafts.get(
      ctx.from.id
    );

  if (
    !draft ||
    !draft.waitingMessage
  ) {
    return false;
  }

  if (
    Date.now() -
      draft.createdAt >
    10 * 60 * 1000
  ) {
    broadcastDrafts.delete(
      ctx.from.id
    );

    await ctx.reply(
      "⏰ Broadcast draft expired। আবার /admin থেকে শুরু করো।"
    );

    return true;
  }

  const message =
    String(text)
      .trim();

  if (!message) {
    await ctx.reply(
      "❌ Empty message পাঠানো যাবে না।"
    );

    return true;
  }

  broadcastDrafts.delete(
    ctx.from.id
  );

  await prepareBroadcast(
    ctx,
    message
  );

  return true;
}

// ==========================================
// 📢 CONFIRM BROADCAST
// ==========================================

bot.action(
  "admin_broadcast_confirm",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    const draft =
      broadcastDrafts.get(
        ctx.from.id
      );

    if (
      !draft ||
      !draft.message
    ) {
      await ctx.answerCbQuery(
        "⚠️ Broadcast draft পাওয়া যায়নি।",
        {
          show_alert: true,
        }
      );

      return;
    }

    if (
      Date.now() -
        draft.createdAt >
      10 * 60 * 1000
    ) {
      broadcastDrafts.delete(
        ctx.from.id
      );

      await ctx.answerCbQuery(
        "⏰ Broadcast expired.",
        {
          show_alert: true,
        }
      );

      return;
    }

    broadcastDrafts.delete(
      ctx.from.id
    );

    await ctx.answerCbQuery(
      "📢 Broadcast started..."
    );

    await ctx.reply(
      `📢 *Broadcast started*

👥 Recipients: ${draft.recipientCount}

⏳ Sending safely...`,
      {
        parse_mode: "Markdown",
      }
    );

    const users =
      getBroadcastUsers();

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await bot.telegram.sendMessage(
          user.id,
          `📢 *BANGLA FUN HUB ANNOUNCEMENT*\n\n${draft.message}`,
          {
            parse_mode: "Markdown",
          }
        );

        sent++;

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              100
            )
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

━━━━━━━━━━━━━━━━━━

✅ Sent:
*${sent}*

❌ Failed:
*${failed}*

👥 Total:
*${users.length}*

━━━━━━━━━━━━━━━━━━

🛡️ Broadcast safely completed.`,
      {
        parse_mode: "Markdown",
        ...adminKeyboard(),
      }
    );
  }
);

// ==========================================
// 📢 CANCEL BROADCAST
// ==========================================

bot.command(
  "cancelbroadcast",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    broadcastDrafts.delete(
      ctx.from.id
    );

    await ctx.reply(
      "❌ Broadcast draft cancel করা হয়েছে।"
    );
  }
);

// ==========================================
// 🛡️ CLOSE ADMIN
// ==========================================

bot.action(
  "admin_close",
  async (ctx) => {
    if (!(await requireAdmin(ctx))) {
      return;
    }

    adminConfirmations.delete(
      ctx.from.id
    );

    broadcastDrafts.delete(
      ctx.from.id
    );

    await ctx.answerCbQuery();

    try {
      await ctx.editMessageText(
        "🔒 *Admin Panel Closed*\n\nআবার খুলতে `/admin` লিখো।",
        {
          parse_mode: "Markdown",
        }
      );
    } catch {
      await ctx.reply(
        "🔒 Admin Panel Closed.\n\n/admin দিয়ে আবার খুলতে পারো।"
      );
    }
  }
);

// ==========================================
// 💬 TEXT HANDLER
// ==========================================

bot.on(
  "text",
  async (ctx) => {
    const user = syncUser(ctx);
    const text =
      ctx.message.text.trim();

    // Admin broadcast input first
    if (
      isAdmin(user.id) &&
      broadcastDrafts.has(user.id)
    ) {
      const handled =
        await handleBroadcastText(
          ctx,
          text
        );

      if (handled) {
        return;
      }
    }

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

    if (
      menuButtons.includes(text)
    ) {
      return;
    }

    if (roastBattles.has(user.id)) {
      await finishRoast(
        ctx,
        text
      );

      return;
    }

    if (memeBattles.has(user.id)) {
      await finishMemeBattle(
        ctx,
        text
      );

      return;
    }

    await ctx.reply(
      `🤔 এই command বুঝতে পারিনি।

Menu থেকে option select করো। 👇`,
      mainMenu()
    );
  }
);

// ==========================================
// ⚠️ ERROR HANDLER
// ==========================================

bot.catch(
  (error, ctx) => {
    console.error(
      "❌ Telegram Bot Error:",
      error
    );

    try {
      ctx.reply(
        "❌ কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।",
        mainMenu()
      );
    } catch {}
  }
);

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
      "🧠 AI Roast Enabled"
    );

    console.log(
      "🤣 AI Meme Battle Enabled"
    );

    console.log(
      "😈 Troll Boss Enabled"
    );

    console.log(
      "🛡️ Professional Admin Panel Enabled"
    );

    console.log(
      "📢 Safe Broadcast Enabled"
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
