# 🇧🇩 Bangla Fun Hub

<div align="center">

### 🤖 AI-Powered Bengali Telegram Entertainment Bot

**Roast • Meme Battle • Troll Boss • XP • Coins • Leaderboard • Daily Rewards • Admin Panel**

<br/>

![Bangla Fun Hub](https://img.shields.io/badge/Bangla%20Fun%20Hub-AI%20Entertainment-00d4ff?style=for-the-badge\&logo=telegram)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge\&logo=node.js\&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge\&logo=telegram\&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Powered-412991?style=for-the-badge\&logo=openai\&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge\&logo=sqlite\&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge\&logo=render\&logoColor=white)

<br/>

> 🎮 **Bangla Fun Hub** is a professional Bengali Telegram entertainment bot built for fun, competition, AI-powered battles, XP progression and community engagement.

<br/>

### ⚡ Built with ❤️ for the Bengali Telegram Community

</div>

---

## ✨ Features

### 😂 AI Roast Battle

Challenge your friends with an AI-powered roast battle.

* 🧠 AI-powered judging
* 🎯 Dynamic roast challenges
* 📊 Score breakdown
* 🏆 Win / Loss / Draw system
* ⭐ XP rewards
* 🪙 Coin rewards
* 🛡️ Basic safety checking
* 🤖 AI opponent roast
* 📈 Level progression

---

### 🤣 AI Meme Battle

Create hilarious meme captions and compete against an AI opponent.

* 🎲 AI-generated meme situations
* 🤖 AI-generated opponent captions
* 🧠 AI judging
* 📊 Score calculation
* ⭐ XP rewards
* 🪙 Coin rewards
* 🏆 Battle result system
* 🔄 New challenge generation

---

### 😈 Troll Boss

Face the **Troll Boss** and try to survive the challenge.

* 👹 Boss-style challenges
* 🎯 Interactive gameplay
* ⭐ XP system
* 🪙 Coin rewards
* 🏆 Competitive progression

---

## 👤 User System

Every user gets a personal gaming profile.

### Profile includes

* 👤 Name
* 🆔 Telegram ID
* 📈 Level
* ⭐ XP
* 🪙 Coins
* 🎮 Games played
* 🏆 Wins
* 💀 Losses
* 📊 Statistics

---

## ⭐ XP & Level System

Users can earn XP by playing games and completing activities.

```text
🎮 Play Games
      ↓
⭐ Earn XP
      ↓
📈 Level Up
      ↓
🏆 Improve Ranking
      ↓
🔥 Become Top Player
```

The system keeps users engaged through continuous progression.

---

## 🪙 Coin Economy

Coins are the main virtual currency of Bangla Fun Hub.

Users can earn coins from:

* 😂 Roast Battles
* 🤣 Meme Battles
* 😈 Troll Boss
* 🎁 Daily Rewards
* 🏆 Winning games

Coins can later be used for additional game mechanics and rewards.

---

## 🏆 Leaderboard

Compete with other players.

Leaderboard supports competitive statistics such as:

* ⭐ XP
* 🏆 Wins
* 🎮 Games
* 🪙 Coins
* 📈 Player ranking

```text
🏆 TOP PLAYERS

🥇 Player 1 — 12,540 XP
🥈 Player 2 — 10,850 XP
🥉 Player 3 —  9,420 XP

🔥 Keep playing to reach #1!
```

---

## 🎁 Daily Reward

Users can claim a daily reward.

```text
🎁 DAILY REWARD

🪙 Coins
⭐ XP

Come back tomorrow for another reward!
```

This helps maintain daily user engagement.

---

# 🛡️ Professional Admin Panel

Bangla Fun Hub includes a dedicated administrator system.

## Admin Features

### 📊 Dashboard

View important bot statistics from one place.

* 👥 Total users
* 🎮 Total games
* 🏆 Game statistics
* 📈 User activity
* 🪙 Economy information

---

### 👥 User Management

Administrators can manage users.

Available actions include:

* 🔎 Search user
* 👤 View user profile
* 🪙 Add / remove coins
* ⭐ Add / remove XP
* 🚫 Block user
* ✅ Unblock user
* 🔄 Reset user
* 🗑️ Delete user
* 📜 View user history
* 📊 View user statistics

---

### 📢 Safe Broadcast

Send announcements to users safely.

Broadcast flow:

```text
📝 Create Message
       ↓
👀 Preview
       ↓
✅ Confirm
       ↓
📢 Broadcast
```

The confirmation system helps prevent accidental broadcasts.

---

### 🛡️ Admin Protection

Only Telegram IDs configured inside `ADMIN_IDS` can access administrator functions.

Example:

```env
ADMIN_IDS=123456789,987654321
```

> ⚠️ Never publish your real admin IDs together with sensitive credentials.

---

# 🧠 AI Architecture

Bangla Fun Hub uses OpenAI for dynamic entertainment features.

### AI-powered modules

```text
                ┌──────────────────┐
                │   Bangla Fun Hub │
                └────────┬─────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        😂 Roast Battle       🤣 Meme Battle
              │                     │
              └──────────┬──────────┘
                         │
                    🧠 OpenAI
                         │
                ┌────────┴────────┐
                │                 │
             Generate           Judge
             Content            Battle
```

The bot is designed so AI failures can be handled without crashing the entire bot process.

---

# 🗄️ Database

Bangla Fun Hub uses **SQLite** for persistent local data storage.

The database stores information such as:

* Users
* XP
* Coins
* Wins
* Losses
* Games
* Daily rewards
* Game history
* Admin blocking status

### Database architecture

```text
Telegram User
      │
      ▼
   Telegraf
      │
      ▼
  Bot Logic
      │
      ▼
  Database Layer
      │
      ▼
    SQLite
```

---

# 📁 Project Structure

```text
Fun-ai/
│
├── bot.js
├── ai.js
├── admin.js
├── database.js
├── package.json
├── README.md
├── .gitignore
│
└── data/
    └── bangla-fun.db
```

### Main files

| File           | Purpose                     |
| -------------- | --------------------------- |
| `bot.js`       | Main Telegram bot           |
| `ai.js`        | OpenAI / AI functionality   |
| `admin.js`     | Admin system                |
| `database.js`  | SQLite database             |
| `package.json` | Node.js dependencies        |
| `.gitignore`   | Protect local/private files |
| `README.md`    | Project documentation       |

---

# ⚙️ Requirements

Before running the project, install:

* Node.js 18+
* npm
* Telegram Bot Token
* OpenAI API Key
* SQLite support

---

# 🚀 Installation

## 1️⃣ Clone the repository

```bash
git clone https://github.com/HACKERBOYDEVILYT/Fun-ai.git
```

```bash
cd Fun-ai
```

---

## 2️⃣ Install dependencies

```bash
npm install
```

---

## 3️⃣ Create environment variables

Create a `.env` file locally:

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5-mini
ADMIN_IDS=YOUR_TELEGRAM_USER_ID
```

### Example

```env
BOT_TOKEN=xxxxxxxxxxxxxxxx
OPENAI_API_KEY=xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-mini
ADMIN_IDS=123456789
```

> 🔐 Do NOT commit `.env` to GitHub.

---

# 🔐 Environment Variables

| Variable         | Required | Description                        |
| ---------------- | -------: | ---------------------------------- |
| `BOT_TOKEN`      |        ✅ | Telegram Bot API token             |
| `OPENAI_API_KEY` |        ✅ | OpenAI API key                     |
| `OPENAI_MODEL`   |        ❌ | AI model name                      |
| `ADMIN_IDS`      |        ✅ | Comma-separated Telegram admin IDs |
| `PORT`           |        ❌ | Render web service port            |

---

# ▶️ Run Locally

Start the bot:

```bash
npm start
```

You should see something similar to:

```text
🇧🇩 Bangla Fun Hub
🤖 Telegram Bot Started
🧠 AI Roast Enabled
🤣 AI Meme Battle Enabled
😈 Troll Boss Enabled
🛡️ Professional Admin Panel Enabled
📢 Safe Broadcast Enabled
🌐 HTTP server running on port 3000
```

---

# ☁️ Deploy on Render

Bangla Fun Hub can run as a Render Web Service.

## Build Command

```bash
npm install
```

## Start Command

```bash
npm start
```

The project uses the `PORT` provided by Render and binds the HTTP server to:

```text
0.0.0.0
```

This allows the Web Service to pass Render's port detection.

---

# 🌐 Render Environment Variables

In Render:

```text
Dashboard
   ↓
Your Service
   ↓
Environment
   ↓
Add Environment Variable
```

Add:

```text
BOT_TOKEN
OPENAI_API_KEY
OPENAI_MODEL
ADMIN_IDS
```

Example:

```text
OPENAI_MODEL = gpt-5-mini
```

Do not put secret keys directly inside JavaScript files.

---

# 🤖 Telegram Setup

Create your Telegram bot using **BotFather**.

After creating the bot:

1. Copy the Bot Token.
2. Add it to Render Environment Variables.
3. Restart / redeploy the service.
4. Open your bot on Telegram.
5. Send:

```text
/start
```

---

# 🛠️ Admin Setup

Find your Telegram numeric user ID and add it to:

```env
ADMIN_IDS=YOUR_ID
```

For multiple administrators:

```env
ADMIN_IDS=123456789,987654321
```

Then restart the bot.

Open the admin panel using:

```text
/admin
```

---

# 🎮 User Commands

| Command            | Function          |
| ------------------ | ----------------- |
| `/start`           | Start bot         |
| `/admin`           | Admin panel       |
| `/user ID`         | View user         |
| `/coins ID AMOUNT` | Manage coins      |
| `/xp ID AMOUNT`    | Manage XP         |
| `/broadcast`       | Broadcast message |

Most user interactions are available directly through the Telegram buttons.

---

# 🛡️ Security

Security is important for Bangla Fun Hub.

### Never expose:

```text
BOT_TOKEN
OPENAI_API_KEY
.env
Database files
Private admin credentials
```

### Recommended `.gitignore`

```gitignore
# Environment variables
.env
.env.*
!.env.example

# Dependencies
node_modules/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# SQLite database
*.db
*.db-shm
*.db-wal

# OS files
.DS_Store
Thumbs.db
```

---

# ⚠️ OpenAI Rate Limits

If you see:

```text
AI rate limit reached
```

this normally means the OpenAI API request has hit an API usage/rate limit.

The Telegram bot itself may still be running correctly.

Check:

* API usage
* Account limits
* API project settings
* Request frequency
* Model availability

---

# 🔄 Bot Architecture

```text
                    Telegram
                       │
                       ▼
                ┌──────────────┐
                │   Telegraf   │
                └──────┬───────┘
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
          😂 Roast   🤣 Meme   😈 Troll
             │         │         │
             └─────────┼─────────┘
                       │
                       ▼
                   🧠 AI Layer
                       │
                       ▼
                 🗄️ SQLite DB
                       │
                       ▼
                 👤 User System
                       │
                       ▼
                🛡️ Admin Panel
```

---

# 🎨 UI / UX Philosophy

Bangla Fun Hub is designed around:

* 🇧🇩 Bengali-first experience
* 🎮 Game-like interaction
* ⚡ Fast Telegram buttons
* 🎯 Simple navigation
* 🏆 Competitive progression
* ✨ Emoji-rich interface
* 🤖 AI-powered dynamic content
* 🛡️ Safe admin workflows

---

# ✨ Animated GitHub Section

<div align="center">

### 🚀 ENTERTAINMENT NEVER STOPS 🚀

```text
😂 ───── 🤣 ───── 😈 ───── 🏆 ───── ⭐ ───── 🪙
       ROAST      MEME       TROLL       LEVEL UP
😂 ───── 🤣 ───── 😈 ───── 🏆 ───── ⭐ ───── 🪙
```

### 🔥 PLAY • COMPETE • LEVEL UP • DOMINATE 🔥

</div>

---

# 📈 Roadmap

Future improvements can include:

* [ ] 🎟️ Premium membership
* [ ] 🎁 Advanced reward system
* [ ] 🏪 Coin shop
* [ ] 🎨 Custom user badges
* [ ] 🏆 Seasonal tournaments
* [ ] 🎯 Daily missions
* [ ] 🔥 Streak system
* [ ] 👥 Friend battles
* [ ] 🎮 More mini-games
* [ ] 📊 Advanced analytics
* [ ] 🌐 Multi-language support
* [ ] 🛡️ Advanced moderation
* [ ] 📢 Scheduled broadcasts

---

# 🤝 Contributing

Contributions are welcome.

### Basic workflow

```bash
git clone https://github.com/HACKERBOYDEVILYT/Fun-ai.git
```

Create a feature branch:

```bash
git checkout -b feature/my-feature
```

Make your changes, test them, then create a Pull Request.

---

# 🐛 Bug Reports

If you find a bug, please provide:

```text
🐛 Bug:
What happened?

📱 Environment:
Local / Render

📋 Error:
Paste the relevant error log

🔁 Steps:
1.
2.
3.
```

Never include API keys or bot tokens in bug reports.

---

# ❤️ Credits

<div align="center">

### 🇧🇩 Bangla Fun Hub

Built with:

**Node.js • Telegraf • OpenAI • SQLite • Render**

<br/>

### 😂 Roast Hard

### 🤣 Meme Harder

### 😈 Defeat the Troll Boss

### 🏆 Become #1

<br/>

**Made with ❤️ for the Bengali community**

</div>

---

# 📜 License

This project is provided for personal and educational use.

Please respect:

* Telegram Terms
* OpenAI Terms
* Applicable laws
* User privacy
* Content safety

---

<div align="center">

## 🇧🇩 BANGLA FUN HUB

### `😂 🤣 😈 ⭐ 🪙 🏆`

**The ultimate Bengali Telegram entertainment experience.**

<br/>

⭐ **Star the repository if you like the project!**

</div>
