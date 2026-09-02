```js
require("dotenv").config();

const {
  getUser,
  getLeaderboard,
  getStats,
  addXP,
  addCoins,
  db,
} = require("./database");

// ==========================================
// 🛡️ ADMIN CONFIG
// ==========================================

const ADMIN_IDS = String(process.env.ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// ==========================================
// 🔐 ADMIN CHECK
// ==========================================

function isAdmin(userId) {
  if (!userId) {
    return false;
  }

  return ADMIN_IDS.includes(String(userId));
}

// ==========================================
// 👤 GET USER
// ==========================================

function adminGetUser(userId) {
  if (!userId) {
    return null;
  }

  return getUser(Number(userId));
}

// ==========================================
// 📊 ADMIN DASHBOARD
// ==========================================

function getAdminDashboard() {
  const stats = getStats();

  const users = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(wins), 0) AS wins,
        COALESCE(SUM(losses), 0) AS losses,
        COALESCE(SUM(xp), 0) AS xp,
        COALESCE(SUM(coins), 0) AS coins
      FROM users
    `)
    .get();

  const games = db
    .prepare(`
      SELECT
        game,
        COUNT(*) AS total
      FROM game_history
      GROUP BY game
      ORDER BY total DESC
    `)
    .all();

  return {
    users: {
      total: users.total,
      wins: users.wins,
      losses: users.losses,
      xp: users.xp,
      coins: users.coins,
    },

    games: {
      total: stats.games,
      breakdown: games,
    },
  };
}

// ==========================================
// 👥 USER LIST
// ==========================================

function getUsers(limit = 20, offset = 0) {
  limit = Math.max(
    1,
    Math.min(Number(limit) || 20, 100)
  );

  offset = Math.max(
    0,
    Number(offset) || 0
  );

  return db
    .prepare(`
      SELECT
        id,
        first_name,
        username,
        xp,
        coins,
        wins,
        losses,
        games,
        created_at,
        updated_at
      FROM users
      ORDER BY xp DESC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset);
}

// ==========================================
// 🔎 SEARCH USERS
// ==========================================

function searchUsers(query, limit = 20) {
  if (!query) {
    return [];
  }

  const value = String(query).trim();

  if (!value) {
    return [];
  }

  const numericId = Number(value);

  if (Number.isInteger(numericId)) {
    const user = getUser(numericId);

    return user ? [user] : [];
  }

  const search = `%${value}%`;

  return db
    .prepare(`
      SELECT
        id,
        first_name,
        username,
        xp,
        coins,
        wins,
        losses,
        games,
        created_at,
        updated_at
      FROM users
      WHERE
        first_name LIKE ?
        OR username LIKE ?
      ORDER BY xp DESC
      LIMIT ?
    `)
    .all(
      search,
      search,
      Math.min(Number(limit) || 20, 100)
    );
}

// ==========================================
// 🪙 ADD COINS
// ==========================================

function giveCoins(userId, amount) {
  const id = Number(userId);
  const coins = Number(amount);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  if (!Number.isFinite(coins) || coins === 0) {
    return {
      success: false,
      reason: "invalid_amount",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  const updated = addCoins(id, Math.trunc(coins));

  return {
    success: true,
    user: updated,
  };
}

// ==========================================
// ⭐ ADD XP
// ==========================================

function giveXP(userId, amount) {
  const id = Number(userId);
  const xp = Number(amount);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  if (!Number.isFinite(xp) || xp === 0) {
    return {
      success: false,
      reason: "invalid_amount",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  const updated = addXP(id, Math.trunc(xp));

  return {
    success: true,
    user: updated,
  };
}

// ==========================================
// 🚫 BLOCK SYSTEM
// ==========================================

// Database-এ blocked column না থাকলে
// প্রথমবার automatically add করার চেষ্টা করবে।

function ensureBlockColumn() {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(users)`)
      .all();

    const exists = columns.some(
      (column) => column.name === "blocked"
    );

    if (!exists) {
      db.exec(`
        ALTER TABLE users
        ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0
      `);
    }
  } catch (error) {
    console.error(
      "❌ Could not create blocked column:",
      error.message
    );
  }
}

ensureBlockColumn();

// ==========================================
// 🚫 BLOCK USER
// ==========================================

function blockUser(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  db.prepare(`
    UPDATE users
    SET
      blocked = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  return {
    success: true,
    user: getUser(id),
  };
}

// ==========================================
// ✅ UNBLOCK USER
// ==========================================

function unblockUser(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  db.prepare(`
    UPDATE users
    SET
      blocked = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  return {
    success: true,
    user: getUser(id),
  };
}

// ==========================================
// 🔎 CHECK BLOCK STATUS
// ==========================================

function isUserBlocked(userId) {
  const user = getUser(Number(userId));

  if (!user) {
    return false;
  }

  return Number(user.blocked) === 1;
}

// ==========================================
// 🎮 GAME HISTORY
// ==========================================

function getGameHistory(limit = 50) {
  limit = Math.max(
    1,
    Math.min(Number(limit) || 50, 200)
  );

  return db
    .prepare(`
      SELECT
        game_history.*,
        users.first_name,
        users.username
      FROM game_history
      LEFT JOIN users
        ON users.id = game_history.user_id
      ORDER BY game_history.id DESC
      LIMIT ?
    `)
    .all(limit);
}

// ==========================================
// 📢 BROADCAST USERS
// ==========================================

function getBroadcastUsers() {
  return db
    .prepare(`
      SELECT
        id,
        first_name,
        username
      FROM users
      WHERE COALESCE(blocked, 0) = 0
      ORDER BY id ASC
    `)
    .all();
}

// ==========================================
// 📈 DAILY GAME STATS
// ==========================================

function getDailyStats() {
  return db
    .prepare(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS games,
        COUNT(DISTINCT user_id) AS players
      FROM game_history
      GROUP BY DATE(created_at)
      ORDER BY day DESC
      LIMIT 30
    `)
    .all();
}

// ==========================================
// 🏆 TOP PLAYERS
// ==========================================

function getTopPlayers(limit = 10) {
  return getLeaderboard(
    Math.min(Number(limit) || 10, 50)
  );
}

// ==========================================
// 📊 GAME BREAKDOWN
// ==========================================

function getGameBreakdown() {
  return db
    .prepare(`
      SELECT
        game,
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN result = 'win'
            THEN 1
            ELSE 0
          END
        ) AS wins,
        SUM(
          CASE
            WHEN result = 'loss'
            THEN 1
            ELSE 0
          END
        ) AS losses
      FROM game_history
      GROUP BY game
      ORDER BY total DESC
    `)
    .all();
}

// ==========================================
// 🧹 RESET USER STATS
// ==========================================

function resetUserStats(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET
        xp = 0,
        coins = 100,
        wins = 0,
        losses = 0,
        games = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    db.prepare(`
      DELETE FROM game_history
      WHERE user_id = ?
    `).run(id);

    db.prepare(`
      DELETE FROM daily_rewards
      WHERE user_id = ?
    `).run(id);
  });

  transaction();

  return {
    success: true,
    user: getUser(id),
  };
}

// ==========================================
// 🗑️ DELETE USER
// ==========================================

function deleteUser(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id)) {
    return {
      success: false,
      reason: "invalid_user_id",
    };
  }

  const user = getUser(id);

  if (!user) {
    return {
      success: false,
      reason: "user_not_found",
    };
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM game_history
      WHERE user_id = ?
    `).run(id);

    db.prepare(`
      DELETE FROM daily_rewards
      WHERE user_id = ?
    `).run(id);

    db.prepare(`
      DELETE FROM users
      WHERE id = ?
    `).run(id);
  });

  transaction();

  return {
    success: true,
  };
}

// ==========================================
// 📦 EXPORT
// ==========================================

module.exports = {
  ADMIN_IDS,
  isAdmin,

  adminGetUser,

  getAdminDashboard,
  getUsers,
  searchUsers,

  giveCoins,
  giveXP,

  blockUser,
  unblockUser,
  isUserBlocked,

  getGameHistory,
  getBroadcastUsers,
  getDailyStats,
  getTopPlayers,
  getGameBreakdown,

  resetUserStats,
  deleteUser,
};
```
