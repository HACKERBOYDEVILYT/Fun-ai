// ==========================================
// 🛡️ BANGLA FUN HUB — ADMIN SYSTEM
// ==========================================

require("dotenv").config();

const {
  db,
  getUser,
  addCoins,
  addXP,
} = require("./database");

// ==========================================
// ⚙️ ADMIN CONFIG
// ==========================================

function parseAdminIds() {
  const raw =
    process.env.ADMIN_IDS ||
    process.env.ADMIN_ID ||
    "";

  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id));
}

function getAdminIds() {
  return parseAdminIds();
}

// ==========================================
// 🛠️ DATABASE MIGRATION
// ==========================================

// আগের database.js-এ blocked column না থাকলেও
// Admin system নিজে থেকে সেটি তৈরি করবে।

function ensureAdminSchema() {
  try {
    const columns =
      db
        .prepare("PRAGMA table_info(users)")
        .all();

    const hasBlocked =
      columns.some(
        (column) =>
          column.name === "blocked"
      );

    if (!hasBlocked) {
      db.exec(`
        ALTER TABLE users
        ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0
      `);

      console.log(
        "✅ Admin schema: blocked column added."
      );
    }

    // Admin actions-এর জন্য indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_xp
      ON users(xp);

      CREATE INDEX IF NOT EXISTS idx_users_blocked
      ON users(blocked);

      CREATE INDEX IF NOT EXISTS idx_game_history_user
      ON game_history(user_id);

      CREATE INDEX IF NOT EXISTS idx_game_history_game
      ON game_history(game);
    `);
  } catch (error) {
    console.error(
      "❌ Admin schema error:",
      error.message
    );
  }
}

ensureAdminSchema();

// ==========================================
// 👑 ADMIN CHECK
// ==========================================

function isAdmin(userId) {
  if (!userId) {
    return false;
  }

  const admins =
    getAdminIds();

  return admins.includes(
    Number(userId)
  );
}

// ==========================================
// 🔐 ADMIN INFO
// ==========================================

function getAdminInfo() {
  const ids =
    getAdminIds();

  return {
    count: ids.length,
    ids,
  };
}

// ==========================================
// 👤 GET USER
// ==========================================

function getManagedUser(userId) {
  const id =
    Number(userId);

  if (!Number.isSafeInteger(id)) {
    return null;
  }

  return db
    .prepare(`
      SELECT *
      FROM users
      WHERE id = ?
    `)
    .get(id);
}

// ==========================================
// 📊 DASHBOARD
// ==========================================

function getAdminDashboard() {
  const users =
    db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(xp), 0) AS xp,
          COALESCE(SUM(coins), 0) AS coins,
          COALESCE(SUM(wins), 0) AS wins,
          COALESCE(SUM(losses), 0) AS losses,
          COALESCE(SUM(games), 0) AS games
        FROM users
      `)
      .get();

  const games =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM game_history
      `)
      .get();

  const blocked =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE blocked = 1
      `)
      .get();

  const active =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE blocked = 0
      `)
      .get();

  const breakdown =
    getGameBreakdown();

  return {
    users: {
      total: users.total,
      active: active.total,
      blocked: blocked.total,
      xp: users.xp,
      coins: users.coins,
      wins: users.wins,
      losses: users.losses,
      games: users.games,
    },

    games: {
      total: games.total,
      breakdown,
    },

    admins:
      getAdminInfo(),
  };
}

// ==========================================
// 👥 USER LIST
// ==========================================

function getUsers(
  limit = 20,
  offset = 0
) {
  const safeLimit = Math.max(
    1,
    Math.min(
      Number(limit) || 20,
      100
    )
  );

  const safeOffset = Math.max(
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
        blocked,
        created_at,
        updated_at
      FROM users
      ORDER BY
        xp DESC,
        created_at ASC
      LIMIT ? OFFSET ?
    `)
    .all(
      safeLimit,
      safeOffset
    );
}

// ==========================================
// 👥 SEARCH USERS
// ==========================================

function searchUsers(
  query,
  limit = 20
) {
  const text =
    String(query || "")
      .trim();

  if (!text) {
    return [];
  }

  const safeLimit = Math.max(
    1,
    Math.min(
      Number(limit) || 20,
      100
    )
  );

  const numeric =
    /^\d+$/.test(text);

  if (numeric) {
    return db
      .prepare(`
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT ?
      `)
      .all(
        Number(text),
        safeLimit
      );
  }

  const search =
    `%${text.replace(
      /[%_]/g,
      "\\$&"
    )}%`;

  return db
    .prepare(`
      SELECT *
      FROM users
      WHERE
        first_name LIKE ? ESCAPE '\\'
        OR username LIKE ? ESCAPE '\\'
      ORDER BY xp DESC
      LIMIT ?
    `)
    .all(
      search,
      search,
      safeLimit
    );
}

// ==========================================
// 📢 BROADCAST USERS
// ==========================================

// শুধু active users
// blocked users broadcast পাবে না।

function getBroadcastUsers() {
  return db
    .prepare(`
      SELECT
        id,
        first_name,
        username
      FROM users
      WHERE blocked = 0
      ORDER BY id ASC
    `)
    .all();
}

// ==========================================
// 🚫 BLOCK STATUS
// ==========================================

function isUserBlocked(userId) {
  const user =
    getManagedUser(userId);

  if (!user) {
    return false;
  }

  return Number(
    user.blocked || 0
  ) === 1;
}

// ==========================================
// 🚫 BLOCK USER
// ==========================================

function blockUser(userId) {
  const id =
    Number(userId);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  db
    .prepare(`
      UPDATE users
      SET
        blocked = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(id);

  return {
    success: true,
    user: getManagedUser(id),
  };
}

// ==========================================
// ✅ UNBLOCK USER
// ==========================================

function unblockUser(userId) {
  const id =
    Number(userId);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  db
    .prepare(`
      UPDATE users
      SET
        blocked = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(id);

  return {
    success: true,
    user: getManagedUser(id),
  };
}

// ==========================================
// 🪙 GIVE / REMOVE COINS
// ==========================================

function giveCoins(
  userId,
  amount
) {
  const id =
    Number(userId);

  const value =
    Number(amount);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return {
      success: false,
      reason: "Amount must be an integer.",
    };
  }

  if (value === 0) {
    return {
      success: false,
      reason: "Amount cannot be zero.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  // Coins কখনো negative হবে না
  if (
    Number(user.coins) + value <
    0
  ) {
    return {
      success: false,
      reason:
        "User does not have enough coins.",
    };
  }

  addCoins(
    id,
    value
  );

  return {
    success: true,
    amount: value,
    user: getManagedUser(id),
  };
}

// ==========================================
// ⭐ GIVE / REMOVE XP
// ==========================================

function giveXP(
  userId,
  amount
) {
  const id =
    Number(userId);

  const value =
    Number(amount);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return {
      success: false,
      reason: "Amount must be an integer.",
    };
  }

  if (value === 0) {
    return {
      success: false,
      reason: "Amount cannot be zero.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  if (
    Number(user.xp) + value <
    0
  ) {
    return {
      success: false,
      reason:
        "XP cannot become negative.",
    };
  }

  addXP(
    id,
    value
  );

  return {
    success: true,
    amount: value,
    user: getManagedUser(id),
  };
}

// ==========================================
// 🔄 RESET USER STATS
// ==========================================

function resetUserStats(userId) {
  const id =
    Number(userId);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  const transaction =
    db.transaction(() => {
      db
        .prepare(`
          UPDATE users
          SET
            xp = 0,
            coins = 100,
            wins = 0,
            losses = 0,
            games = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(id);

      db
        .prepare(`
          DELETE FROM game_history
          WHERE user_id = ?
        `)
        .run(id);

      db
        .prepare(`
          DELETE FROM daily_rewards
          WHERE user_id = ?
        `)
        .run(id);
    });

  transaction();

  return {
    success: true,
    user: getManagedUser(id),
  };
}

// ==========================================
// 🗑️ DELETE USER
// ==========================================

function deleteUser(userId) {
  const id =
    Number(userId);

  if (!Number.isSafeInteger(id)) {
    return {
      success: false,
      reason: "Invalid user ID.",
    };
  }

  const user =
    getManagedUser(id);

  if (!user) {
    return {
      success: false,
      reason: "User not found.",
    };
  }

  const transaction =
    db.transaction(() => {
      // Delete game history first
      db
        .prepare(`
          DELETE FROM game_history
          WHERE user_id = ?
        `)
        .run(id);

      // Delete daily reward
      db
        .prepare(`
          DELETE FROM daily_rewards
          WHERE user_id = ?
        `)
        .run(id);

      // Delete user
      db
        .prepare(`
          DELETE FROM users
          WHERE id = ?
        `)
        .run(id);
    });

  transaction();

  return {
    success: true,
    deletedUser: user,
  };
}

// ==========================================
// 🎮 GAME HISTORY
// ==========================================

function getGameHistory(
  limit = 20,
  offset = 0
) {
  const safeLimit = Math.max(
    1,
    Math.min(
      Number(limit) || 20,
      100
    )
  );

  const safeOffset = Math.max(
    0,
    Number(offset) || 0
  );

  return db
    .prepare(`
      SELECT
        gh.id,
        gh.user_id,
        gh.game,
        gh.result,
        gh.xp,
        gh.coins,
        gh.created_at,
        u.first_name,
        u.username
      FROM game_history gh
      LEFT JOIN users u
        ON u.id = gh.user_id
      ORDER BY gh.id DESC
      LIMIT ? OFFSET ?
    `)
    .all(
      safeLimit,
      safeOffset
    );
}

// ==========================================
// 🎮 GAME BREAKDOWN
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
        ) AS losses,

        SUM(
          CASE
            WHEN result = 'draw'
            THEN 1
            ELSE 0
          END
        ) AS draws,

        COALESCE(
          SUM(xp),
          0
        ) AS xp,

        COALESCE(
          SUM(coins),
          0
        ) AS coins

      FROM game_history

      GROUP BY game

      ORDER BY total DESC
    `)
    .all();
}

// ==========================================
// 📊 USER STATISTICS
// ==========================================

function getUserStatistics(userId) {
  const id =
    Number(userId);

  const user =
    getManagedUser(id);

  if (!user) {
    return null;
  }

  const history =
    db
      .prepare(`
        SELECT
          game,
          COUNT(*) AS total,
          COALESCE(SUM(xp), 0) AS xp,
          COALESCE(SUM(coins), 0) AS coins
        FROM game_history
        WHERE user_id = ?
        GROUP BY game
        ORDER BY total DESC
      `)
      .all(id);

  return {
    user,
    history,
  };
}

// ==========================================
// 📈 TOTAL USER COUNT
// ==========================================

function getUserCount() {
  const result =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
      `)
      .get();

  return result.total;
}

// ==========================================
// 🟢 ACTIVE USER COUNT
// ==========================================

function getActiveUserCount() {
  const result =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE blocked = 0
      `)
      .get();

  return result.total;
}

// ==========================================
// 🚫 BLOCKED USER COUNT
// ==========================================

function getBlockedUserCount() {
  const result =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE blocked = 1
      `)
      .get();

  return result.total;
}

// ==========================================
// 📅 TODAY'S GAMES
// ==========================================

function getTodayGames() {
  const result =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM game_history
        WHERE date(created_at) =
              date('now')
      `)
      .get();

  return result.total;
}

// ==========================================
// 📅 TODAY'S USERS
// ==========================================

function getTodayUsers() {
  const result =
    db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE date(created_at) =
              date('now')
      `)
      .get();

  return result.total;
}

// ==========================================
// 🏆 TOP USERS
// ==========================================

function getTopUsers(
  limit = 10
) {
  const safeLimit = Math.max(
    1,
    Math.min(
      Number(limit) || 10,
      50
    )
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
        blocked
      FROM users
      ORDER BY xp DESC
      LIMIT ?
    `)
    .all(safeLimit);
}

// ==========================================
// 🧹 CLEAN OLD HISTORY
// ==========================================

function cleanOldHistory(
  days = 90
) {
  const safeDays =
    Math.max(
      1,
      Math.min(
        Number(days) || 90,
        3650
      )
    );

  const result =
    db
      .prepare(`
        DELETE FROM game_history
        WHERE created_at <
          datetime(
            'now',
            ?
          )
      `)
      .run(
        `-${safeDays} days`
      );

  return {
    success: true,
    deleted:
      result.changes,
  };
}

// ==========================================
// 🔎 ADMIN HEALTH
// ==========================================

function getAdminHealth() {
  const dashboard =
    getAdminDashboard();

  return {
    database: true,

    adminConfigured:
      dashboard.admins.count > 0,

    adminCount:
      dashboard.admins.count,

    users:
      dashboard.users.total,

    activeUsers:
      dashboard.users.active,

    blockedUsers:
      dashboard.users.blocked,

    games:
      dashboard.games.total,

    todayUsers:
      getTodayUsers(),

    todayGames:
      getTodayGames(),
  };
}

// ==========================================
// 📦 EXPORT
// ==========================================

module.exports = {
  // Admin
  isAdmin,
  getAdminIds,
  getAdminInfo,

  // Dashboard
  getAdminDashboard,
  getAdminHealth,

  // Users
  getManagedUser,
  getUsers,
  searchUsers,
  getUserCount,
  getActiveUserCount,
  getBlockedUserCount,
  getTopUsers,
  getUserStatistics,

  // Block
  isUserBlocked,
  blockUser,
  unblockUser,

  // Economy
  giveCoins,
  giveXP,

  // Dangerous actions
  resetUserStats,
  deleteUser,

  // Broadcast
  getBroadcastUsers,

  // Games
  getGameHistory,
  getGameBreakdown,
  getTodayGames,
  getTodayUsers,

  // Maintenance
  cleanOldHistory,
};
