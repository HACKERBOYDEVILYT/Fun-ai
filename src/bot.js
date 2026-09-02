require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");

const {
  createUser,
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
// 🎮 GAME STATES
// ==========================================

const roastBattles = new Map();
const memeBattles = new Map();

// ==========================================
// ⭐ LEVEL SYSTEM
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
];

// ==========================================
// 😂 ROAST SCORE
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
    "ভাই",
    "boss",
    "legend",
  ];

  for (const word of funnyWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      score += 3;
    }
  }

  score += Math.min(
    (text.match(/[!?]/g) || []).length * 2,
    8
  );

  return Math.min(score, 100);
}

// ==========================================
// 😂 ROAST START
// ==========================================

function startRoastBattle(ctx) {
  const user = syncUser(ctx);

  const challenge =
    roastChallenges[
      Math.floor(Math.random() * roastChallenges.length)
    ];

  roastBattles.set(user.id, {
    challenge,
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

⚠️ শুধু fun roast ব্যবহার করো 😎`,
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
      "😂 তোমার একটা Roast Battle already চলছে!"
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

আবার চাইলে নতুন Battle শুরু করো 😎`,
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
// 🤣 MEME CHALLENGES
// ==========================================

const memeChallenges = [
  {
    title: "Exam Night 😭",
    prompt: "পরীক্ষার আগের রাতে ছাত্রের অবস্থা",
    emoji: "📚",
  },
  {
    title: "তিনটা বাজে রাত 😂",
    prompt: "রাত ৩টায় ঘুমানোর আগে শেষবার ফোন দেখা",
    emoji: "📱",
  },
  {
    title: "মায়ের ডাক 😭",
    prompt: "মা যখন বলে: ‘একটু এদিকে আয় তো!’",
    emoji: "👩",
  },
  {
    title: "বন্ধুর টাকা 🤣",
    prompt: "বন্ধু বলে: ‘ভাই টাকা কালকে দিয়ে দেব’",
    emoji: "💸",
  },
  {
    title: "Internet Gone 💀",
    prompt: "গেম খেলার সময় হঠাৎ Internet চলে যাওয়া",
    emoji: "🌐",
  },
  {
    title: "Monday Morning 😴",
    prompt: "সোমবার সকালে ঘুম থেকে ওঠার অবস্থা",
    emoji: "⏰",
  },
  {
    title: "Result Day 💀",
    prompt: "Result প্রকাশের ৫ মিনিট আগে ছাত্রের অবস্থা",
    emoji: "📊",
  },
];

// ==========================================
// 🤣 MEME SCORE
// ==========================================

function calculateMemeScore(text) {
  let score = 35;

  const length = text.trim().length;

  if (length >= 15) score += 10;
  if (length >= 30) score += 10;
  if (length >= 50) score += 10;

  const funnyWords = [
    "😂",
    "🤣",
    "😭",
    "💀",
    "ভাই",
    "মা",
    "exam",
    "পরীক্ষা",
    "টাকা",
    "ঘুম",
    "ফোন",
    "mobile",
    "internet",
    "game",
    "গেম",
  ];

  let matches = 0;

  for (const word of funnyWords) {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      matches++;
    }
  }

  score += Math.min(matches * 4, 20);

  const punctuation =
    (text.match(/[!?]/g) || []).length;

  score += Math.min(punctuation * 2, 6);

  return Math.min(score, 100);
}

// ==========================================
// 🤣 BOT MEME CAPTIONS
// ==========================================

const memeBotCaptions = [
  "আমি পড়তে বসেছিলাম... বই আমাকে দেখে নিজেই বন্ধ হয়ে গেল! 😂",
  "একটু ফোন দেখবো বলেছিলাম, হঠাৎ সকাল হয়ে গেল! 😭",
  "মা বললো ‘এদিকে আয়’ — আমি বুঝলাম আজকে আমার শেষ দিন! 💀",
  "বন্ধুর ‘কালকে দেব’ শুনে calendar-ও অবাক! 🤣",
  "Internet চলে গেছে, মনে হলো জীবনটাই offline! 😭",
  "Alarm: উঠো! আমি: ভাই একটু পরে... তারপর দুপুর! 😂",
  "Result আসার আগে আমার confidence: 100%, Result আসার পরে: 💀",
];

// ==========================================
// 🤣 START MEME BATTLE
// ==========================================

function startMemeBattle(ctx) {
  const user = syncUser(ctx);

  const challenge =
    memeChallenges[
      Math.floor(Math.random() * memeChallenges.length)
    ];

  memeBattles.set(user.id, {
    challenge,
    status: "waiting_caption",
  });

  return ctx.reply(
    `🤣 *MEME BATTLE শুরু!*

━━━━━━━━━━━━━━
${challenge.emoji} *${challenge.title}*
━━━━━━━━━━━━━━

🎯 Situation:

*${challenge.prompt}*

✍️ এখন এই situation-এর জন্য
একটা funny meme caption লিখে পাঠাও!

🔥 যত creative caption,
তত বেশি score!`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel Meme", "cancel_meme")],
      ]),
    }
  );
}

// ==========================================
// 🤣 MEME BUTTON
// ==========================================

bot.action("meme", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  if (memeBattles.has(user.id)) {
    return ctx.reply(
      "🤣 তোমার একটা Meme Battle already চলছে!"
    );
  }

  startMemeBattle(ctx);
});

// ==========================================
// ❌ CANCEL MEME
// ==========================================

bot.action("cancel_meme", async (ctx) => {
  await ctx.answerCbQuery();

  const user = syncUser(ctx);

  memeBattles.delete(user.id);

  ctx.reply(
    `❌ *Meme Battle Cancelled*

আবার চাইলে নতুন Meme Battle শুরু করো 😂`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🤣 New Meme Battle", "meme")],
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
});

// ==========================================
// 🤣 FINISH MEME BATTLE
// ==========================================

async function finishMemeBattle(ctx, user, caption) {
  const battle = memeBattles.get(user.id);

  if (!battle) {
    return;
  }

  const playerScore = calculateMemeScore(caption);

  const botScore =
    Math.floor(Math.random() * 31) + 45;

  const botCaption =
    memeBotCaptions[
      Math.floor(Math.random() * memeBotCaptions.length)
    ];

  const playerWon = playerScore >= botScore;

  memeBattles.delete(user.id);

  if (playerWon) {
    const xpReward = 60;
    const coinReward = 30;

    const updatedUser = addGame(
      user.id,
      "meme",
      "win",
      xpReward,
      coinReward
    );

    return ctx.reply(
      `🏆 *MEME BATTLE RESULT*

🤣 Battle শেষ!

━━━━━━━━━━━━━━
👤 *তোমার Caption*

"${caption}"

⭐ Score: ${playerScore}/100

━━━━━━━━━━━━━━
🤖 *Meme Bot*

"${botCaption}"

⭐ Score: ${botScore}/100
━━━━━━━━━━━━━━

🎉 *তুমি জিতে গেছো!* 🔥

⭐ +${xpReward} XP
🪙 +${coinReward} Coins

━━━━━━━━━━━━━━
⭐ Total XP: ${updatedUser.xp}
🪙 Total Coins: ${updatedUser.coins}
🏆 Level: ${getLevel(updatedUser.xp)}
━━━━━━━━━━━━━━`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🤣 Again", "meme")],
          [Markup.button.callback("🏠 Main Menu", "home")],
        ]),
      }
    );
  }

  const xpReward = 20;
  const coinReward = 10;

  const updatedUser = addGame(
    user.id,
    "meme",
    "loss",
    xpReward,
    coinReward
  );

  return ctx.reply(
    `🤣 *MEME BATTLE RESULT*

━━━━━━━━━━━━━━
👤 *তোমার Caption*

"${caption}"

⭐ Score: ${playerScore}/100

━━━━━━━━━━━━━━
🤖 *Meme Bot*

"${botCaption}"

⭐ Score: ${botScore}/100
━━━━━━━━━━━━━━

😈 *Meme Bot জিতে গেছে!*

পরেরবার আরও creative হও 🔥

⭐ +${xpReward} XP
🪙 +${coinReward} Coins`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🤣 Rematch", "meme")],
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
}

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
📊 Game History

🇧🇩 সব game fun ও entertainment-এর জন্য।`,
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
  const text = ctx.message.text.trim();

  // ------------------------------------------
  // 😂 ROAST ANSWER
  // ------------------------------------------

  const roastBattle = roastBattles.get(user.id);

  if (
    roastBattle &&
    roastBattle.status === "waiting_answer"
  ) {
    if (text.length < 5) {
      return ctx.reply(
        "😂 Roast একটু বড় করে লিখো!"
      );
    }

    if (text.length > 500) {
      return ctx.reply(
        "😂 Roast maximum 500 characters হতে পারবে।"
      );
    }

    await ctx.reply(
      "🤖 Roast Bot তোমার roast analyze করছে... ⏳"
    );

    setTimeout(() => {
      finishRoast(ctx, user, text);
    }, 900);

    return;
  }

  // ------------------------------------------
  // 🤣 MEME CAPTION
  // ------------------------------------------

  const memeBattle = memeBattles.get(user.id);

  if (
    memeBattle &&
    memeBattle.status === "waiting_caption"
  ) {
    if (text.length < 5) {
      return ctx.reply(
        "🤣 Caption একটু বড় করে লিখো!"
      );
    }

    if (text.length > 500) {
      return ctx.reply(
        "🤣 Caption maximum 500 characters হতে পারবে।"
      );
    }

    await ctx.reply(
      "🤣 Meme Bot তোমার caption analyze করছে... ⏳"
    );

    setTimeout(() => {
      finishMemeBattle(ctx, user, text);
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
// 😂 FINISH ROAST
// ==========================================

async function finishRoast(ctx, user, playerText) {
  const battle = roastBattles.get(user.id);

  if (!battle) {
    return;
  }

  const playerScore = calculateRoastScore(playerText);

  const botScore =
    Math.floor(Math.random() * 26) + 45;

  const botText =
    battle.challenge.replies[
      Math.floor(
        Math.random() *
          battle.challenge.replies.length
      )
    ];

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

    return ctx.reply(
      `🏆 *ROAST BATTLE RESULT*

🥊 Battle শেষ!

━━━━━━━━━━━━━━
👤 *তোমার Roast*

"${playerText}"

⭐ Score: ${playerScore}/100

━━━━━━━━━━━━━━
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
  }

  const xpReward = 20;
  const coinReward = 10;

  const updatedUser = addGame(
    user.id,
    "roast",
    "loss",
    xpReward,
    coinReward
  );

  return ctx.reply(
    `😂 *ROAST BATTLE RESULT*

🥊 Battle শেষ!

━━━━━━━━━━━━━━
👤 *তোমার Roast*

"${playerText}"

⭐ Score: ${playerScore}/100

━━━━━━━━━━━━━━
🤖 *Roast Bot*

"${botText}"

⭐ Score: ${botScore}/100
━━━━━━━━━━━━━━

😈 *Roast Bot জিতে গেছে!*

পরেরবার আরও creative হও 🔥

⭐ +${xpReward} XP
🪙 +${coinReward} Coins`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("😂 Rematch", "roast")],
        [Markup.button.callback("🏠 Main Menu", "home")],
      ]),
    }
  );
}

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
console.log("😂 Roast Battle enabled!");
console.log("🤣 Meme Battle enabled!");
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
