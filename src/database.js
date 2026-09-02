const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ==========================================
// 📁 Database folder
// ==========================================

const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ==========================================
// 💾 Database
// ==========================================

const db = new Database(path.join(dataDir, "bangla-fun.db"));

db.pragma("journal_mode = WAL");

// ==========================================
// 👤 Users table
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT 'বন্ধু',
    username TEXT DEFAULT '',
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 100,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    games INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ==========================================
// 🎁 Daily rewards table
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_rewards (
    user_id INTEGER PRIMARY KEY,
    last_claim INTEGER NOT NULL DEFAULT 0
  )
`);

// ==========================================
// 🎮 Game history
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    result TEXT DEFAULT '',
    xp INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ==========================================
// 👤 Create / Get user
// ==========================================

function createUser(user) {
  const existing = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(user.id);

  if (!existing) {
    db.prepare(`
      INSERT INTO users (
        id,
        first_name,
        username
      )
      VALUES (?, ?, ?)
    `).run(
      user.id,
      user.firstName || "বন্ধু",
      user.username || ""
    );

    return getUser(user.id);
  }

  // Update profile information
  db.prepare(`
    UPDATE users
    SET
      first_name = ?,
      username = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    user.firstName || existing.first_name,
    user.username || "",
    user.id
  );

  return getUser(user.id);
}

// ==========================================
// 🔎 Get user
// ==========================================

function getUser(userId) {
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId);
}

// ==========================================
// ⭐ Add XP
// ==========================================

function addXP(userId, amount) {
  db.prepare(`
    UPDATE users
    SET
      xp = xp + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(amount, userId);

  return getUser(userId);
}

// ==========================================
// 🪙 Add coins
// ==========================================

function addCoins(userId, amount) {
  db.prepare(`
    UPDATE users
    SET
      coins = coins + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(amount, userId);

  return getUser(userId);
}

// ==========================================
// 🏆 Win
// ==========================================

function addWin(userId) {
  db.prepare(`
    UPDATE users
    SET
      wins = wins + 1,
      games = games + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);

  return getUser(userId);
}

// ==========================================
// 💀 Loss
// ==========================================

function addLoss(userId) {
  db.prepare(`
    UPDATE users
    SET
      losses = losses + 1,
      games = games + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);

  return getUser(userId);
}

// ==========================================
// 🎮 Add game
// ==========================================

function addGame(userId, game, result, xp = 0, coins = 0) {
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO game_history (
        user_id,
        game,
        result,
        xp,
        coins
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      game,
      result || "",
      xp,
      coins
    );

    db.prepare(`
      UPDATE users
      SET
        games = games + 1,
        xp = xp + ?,
        coins = coins + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      xp,
      coins,
      userId
    );
  });

  transaction();

  return getUser(userId);
}

// ==========================================
// 🎁 Daily reward
// ==========================================

function claimDailyReward(userId) {
  const now = Date.now();

  const existing = db
    .prepare(`
      SELECT last_claim
      FROM daily_rewards
      WHERE user_id = ?
    `)
    .get(userId);

  // 24 hours
  const cooldown = 24 * 60 * 60 * 1000;

  if (existing && now - existing.last_claim < cooldown) {
    const remaining =
      cooldown - (now - existing.last_claim);

    return {
      success: false,
      remaining,
    };
  }

  if (existing) {
    db.prepare(`
      UPDATE daily_rewards
      SET last_claim = ?
      WHERE user_id = ?
    `).run(now, userId);
  } else {
    db.prepare(`
      INSERT INTO daily_rewards (
        user_id,
        last_claim
      )
      VALUES (?, ?)
    `).run(userId, now);
  }

  // Daily reward
  const coins = 100;
  const xp = 25;

  db.prepare(`
    UPDATE users
    SET
      coins = coins + ?,
      xp = xp + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    coins,
    xp,
    userId
  );

  return {
    success: true,
    coins,
    xp,
    user: getUser(userId),
  };
}

// ==========================================
// 🏆 Leaderboard
// ==========================================

function getLeaderboard(limit = 10) {
  return db
    .prepare(`
      SELECT *
      FROM users
      ORDER BY xp DESC
      LIMIT ?
    `)
    .all(limit);
}

// ==========================================
// 📊 User rank
// ==========================================

function getUserRank(userId) {
  const user = getUser(userId);

  if (!user) {
    return null;
  }

  const result = db
    .prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM users
      WHERE xp > ?
    `)
    .get(user.xp);

  return result.rank;
}

// ==========================================
// 📈 Statistics
// ==========================================

function getStats() {
  const users = db
    .prepare("SELECT COUNT(*) AS total FROM users")
    .get();

  const games = db
    .prepare("SELECT COUNT(*) AS total FROM game_history")
    .get();

  const coins = db
    .prepare("SELECT COALESCE(SUM(coins), 0) AS total FROM users")
    .get();

  return {
    users: users.total,
    games: games.total,
    coins: coins.total,
  };
}

// ==========================================
// 🧹 Close database
// ==========================================

function closeDatabase() {
  db.close();
}

// ==========================================
// 📦 Export
// ==========================================

module.exports = {
  db,
  createUser,
  getUser,
  addXP,
  addCoins,
  addWin,
  addLoss,
  addGame,
  claimDailyReward,
  getLeaderboard,
  getUserRank,
  getStats,
  closeDatabase,
};
