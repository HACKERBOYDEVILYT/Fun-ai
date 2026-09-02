require("dotenv").config();

const OpenAI = require("openai");

// ==========================================
// ⚙️ CONFIG
// ==========================================

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ OPENAI_API_KEY পাওয়া যায়নি!");
  console.error("👉 Render Environment Variables-এ OPENAI_API_KEY যোগ করো।");
  process.exit(1);
}

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const openai = new OpenAI({
  apiKey,
  timeout: 30_000,
  maxRetries: 2,
});

// ==========================================
// 🛠️ HELPERS
// ==========================================

function cleanJSON(text) {
  if (!text) {
    throw new Error("AI response empty");
  }

  let cleaned = String(text).trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }

  return JSON.parse(cleaned);
}

function clampScore(value, fallback = 50) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function safeComment(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();

  if (!text) {
    return fallback;
  }

  return text.slice(0, 500);
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();

  if (!text) {
    return fallback;
  }

  return text.slice(0, 1000);
}

function getErrorMessage(error) {
  if (!error) {
    return "Unknown AI error";
  }

  if (error.status === 429) {
    return "AI rate limit reached";
  }

  if (error.status === 401) {
    return "Invalid OpenAI API key";
  }

  if (error.status === 403) {
    return "OpenAI API access denied";
  }

  if (error.status === 404) {
    return "AI model not found";
  }

  if (error.name === "APIConnectionTimeoutError") {
    return "AI request timeout";
  }

  if (error.name === "APIConnectionError") {
    return "AI connection error";
  }

  return error.message || "Unknown AI error";
}

async function createResponse(input) {
  try {
    return await openai.responses.create({
      model: MODEL,
      input,
    });
  } catch (error) {
    console.error("❌ OpenAI Error:", getErrorMessage(error));
    throw error;
  }
}

// ==========================================
// 🧠 AI ROAST JUDGE
// ==========================================

async function judgeRoast({
  target,
  playerRoast,
}) {
  const prompt = `
তুমি "Bangla Fun Hub" নামের একটি Bengali entertainment Roast Battle-এর AI Judge।

Target:
${target}

Player Roast:
${playerRoast}

এই roast-এর quality বিচার করো।

Scoring:
- Funny: 0-30
- Creativity: 0-25
- Target relevance: 0-20
- Originality: 0-15
- Delivery: 0-10

মোট score = সবগুলোর যোগফল।
Score অবশ্যই 0 থেকে 100-এর মধ্যে হবে।

Rules:
- Playful/funny roast হলে ভালো score দাও।
- Generic বা boring হলে score কমাও।
- ধর্ম, জাতি, ethnicity, disability, sexual orientation,
  বা অন্য sensitive/protected characteristic নিয়ে attack করলে
  bonus দেবে না।
- Serious threat, hateful attack বা dangerous encouragement হলে
  safe=false দাও।
- ব্যক্তিগত sensitive তথ্য ব্যবহার করে roast করা যাবে না।

শুধু valid JSON return করো।

Format:
{
  "score": 0,
  "funny": 0,
  "creativity": 0,
  "relevance": 0,
  "originality": 0,
  "delivery": 0,
  "comment": "বাংলায় ছোট funny বিচার",
  "safe": true
}
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    const funny = Math.min(30, clampScore(result.funny, 15));
    const creativity = Math.min(25, clampScore(result.creativity, 12));
    const relevance = Math.min(20, clampScore(result.relevance, 10));
    const originality = Math.min(15, clampScore(result.originality, 8));
    const delivery = Math.min(10, clampScore(result.delivery, 5));

    const calculatedScore =
      funny +
      creativity +
      relevance +
      originality +
      delivery;

    return {
      score: clampScore(
        result.score,
        Math.min(100, calculatedScore)
      ),

      funny,
      creativity,
      relevance,
      originality,
      delivery,

      comment: safeComment(
        result.comment,
        "ভালো চেষ্টা ছিল! 😂"
      ),

      safe:
        typeof result.safe === "boolean"
          ? result.safe
          : true,
    };
  } catch (error) {
    console.error(
      "❌ judgeRoast failed:",
      getErrorMessage(error)
    );

    return {
      score: 50,
      funny: 15,
      creativity: 12,
      relevance: 10,
      originality: 8,
      delivery: 5,
      comment:
        "AI Judge এখন একটু busy। তাই temporary score দেওয়া হয়েছে 😂",
      safe: true,
      fallback: true,
    };
  }
}

// ==========================================
// 🤖 AI OPPONENT ROAST
// ==========================================

async function generateOpponentRoast(target) {
  const prompt = `
তুমি Bangla Fun Hub-এর AI Roast Battle opponent।

Target:
${target}

Target-কে নিয়ে একটি short, funny এবং playful Bengali roast তৈরি করো।

Rules:
- Bengali language ব্যবহার করো।
- 1-2 sentence।
- Friendly entertainment roast।
- Hate speech নয়।
- Serious threat নয়।
- Sensitive/protected personal characteristics নিয়ে joke নয়।
- Sexual বা dangerous content নয়।
- খুব offensive হবে না।
- Emoji ব্যবহার করতে পারো।

শুধু roast text return করো।
`;

  try {
    const response = await createResponse(prompt);

    let roast = response.output_text.trim();

    roast = roast
      .replace(/^["']|["']$/g, "")
      .trim();

    if (!roast) {
      throw new Error("Opponent roast empty");
    }

    return roast.slice(0, 500);
  } catch (error) {
    console.error(
      "❌ generateOpponentRoast failed:",
      getErrorMessage(error)
    );

    return "তোমার roast দেখে AI-ও একটু চিন্তায় পড়ে গেছে! 😂";
  }
}

// ==========================================
// 🧠 AI OPPONENT SCORE
// ==========================================

async function judgeOpponent({
  target,
  opponentRoast,
}) {
  const prompt = `
তুমি Bengali Roast Battle-এর AI Judge।

Target:
${target}

Opponent Roast:
${opponentRoast}

এই roast-এর:
- Funny quality
- Creativity
- Relevance
- Originality

বিবেচনা করে 0-100 score দাও।

শুধু valid JSON return করো:

{
  "score": 0,
  "comment": "বাংলায় ছোট বিচার"
}
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    return {
      score: clampScore(result.score, 50),

      comment: safeComment(
        result.comment,
        "AI opponent-এর roast মোটামুটি ছিল 😂"
      ),
    };
  } catch (error) {
    console.error(
      "❌ judgeOpponent failed:",
      getErrorMessage(error)
    );

    return {
      score: 50,
      comment:
        "Opponent-এর score calculate করতে AI একটু glitch করেছে 😂",
      fallback: true,
    };
  }
}

// ==========================================
// 🛡️ AI CONTENT SAFETY CHECK
// ==========================================

async function checkRoastSafety(text) {
  const prompt = `
Check whether this Bengali roast is appropriate for a fun entertainment bot.

Text:
${text}

Return only valid JSON:

{
  "safe": true,
  "reason": "short Bengali explanation"
}

safe=false যদি text-এ থাকে:
- serious threat
- hateful attack
- protected/sensitive characteristics নিয়ে abusive attack
- sexual exploitation content
- dangerous violent encouragement
- severe harassment

Normal playful teasing হলে safe=true।
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    return {
      safe:
        typeof result.safe === "boolean"
          ? result.safe
          : true,

      reason: safeComment(
        result.reason,
        "Normal playful roast."
      ),
    };
  } catch (error) {
    console.error(
      "❌ checkRoastSafety failed:",
      getErrorMessage(error)
    );

    return {
      safe: true,
      reason:
        "Safety check temporarily unavailable.",
      fallback: true,
    };
  }
}

// ==========================================
// 😂 AI MEME CHALLENGE GENERATOR
// ==========================================

async function generateMemeChallenge() {
  const prompt = `
তুমি "Bangla Fun Hub" Telegram bot-এর AI Meme Battle Challenge Generator।

একটি completely NEW Bengali meme situation তৈরি করো,
যেটা user দেখে নিজের funny caption লিখবে।

Situation হতে হবে:
- দৈনন্দিন জীবনভিত্তিক
- Bangladesh/Bengali audience-এর জন্য relatable
- funny
- creative
- short
- meme-friendly
- প্রতিবার নতুন হওয়ার চেষ্টা করবে

Possible themes:
- মা-বাবা
- বন্ধু
- প্রেম/crush
- পড়াশোনা
- চাকরি
- salary
- টাকা
- খাবার
- mobile
- internet
- WiFi
- gaming
- ঘুম
- exam
- Eid
- বৃষ্টি
- traffic
- family
- social media

কোনো নির্দিষ্ট protected group নিয়ে joke করবে না।
Sexual, hateful বা dangerous content নয়।

শুধু valid JSON return করো:

{
  "situation": "একটি নতুন Bengali meme situation",
  "emoji": "একটি বা দুইটি emoji",
  "theme": "short theme"
}
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    const situation = safeText(
      result.situation,
      "যখন তুমি ভাবো আজকে অনেক কাজ করবে, কিন্তু বিছানা তোমাকে যেতে দেয় না! 😂"
    );

    const emoji = safeText(
      result.emoji,
      "😂"
    ).slice(0, 10);

    const theme = safeText(
      result.theme,
      "Daily Life"
    ).slice(0, 50);

    return {
      situation,
      emoji,
      theme,
    };
  } catch (error) {
    console.error(
      "❌ generateMemeChallenge failed:",
      getErrorMessage(error)
    );

    return {
      situation:
        "যখন বন্ধু বলে 'ভাই ৫ মিনিটে আসতেছি' আর ২ ঘণ্টা পরও তার কোনো খবর নেই! 😂",
      emoji: "😂",
      theme: "Friends",
      fallback: true,
    };
  }
}

// ==========================================
// 🤖 AI MEME OPPONENT CAPTION
// ==========================================

async function generateMemeOpponentCaption(situation) {
  const prompt = `
তুমি Bangla Fun Hub-এর AI Meme Battle opponent।

Meme Situation:
${situation}

এই situation-এর জন্য একটি খুব funny Bengali meme caption তৈরি করো।

Rules:
- Bengali language।
- Short এবং punchy।
- Maximum 2 sentence।
- Internet/meme style হতে পারে।
- Relatable হতে হবে।
- Emoji ব্যবহার করা যাবে।
- একই generic joke বারবার ব্যবহার করবে না।
- Hate speech নয়।
- Protected/sensitive characteristic নিয়ে joke নয়।
- Sexual বা dangerous content নয়।

শুধু caption text return করো।
`;

  try {
    const response = await createResponse(prompt);

    let caption = response.output_text.trim();

    caption = caption
      .replace(/^["']|["']$/g, "")
      .trim();

    if (!caption) {
      throw new Error("AI meme caption empty");
    }

    return caption.slice(0, 500);
  } catch (error) {
    console.error(
      "❌ generateMemeOpponentCaption failed:",
      getErrorMessage(error)
    );

    return "আমি: আজকে productive হবো।\nআমার বিছানা: আগে আমাকে জয় কর! 😂";
  }
}

// ==========================================
// 🧠 AI MEME JUDGE
// ==========================================

async function judgeMeme({
  situation,
  playerCaption,
}) {
  const prompt = `
তুমি Bangla Fun Hub-এর AI Meme Battle Judge।

Meme Situation:
${situation}

Player Caption:
${playerCaption}

Player-এর meme caption বিচার করো।

Scoring:
- Funny: 0-30
- Creativity: 0-25
- Situation relevance: 0-20
- Originality: 0-15
- Punchline/Delivery: 0-10

Total = 100।

Judge করার সময়:
1. Caption সত্যিই হাসির কিনা।
2. Situation-এর সাথে কতটা ভালোভাবে match করেছে।
3. Idea কতটা creative।
4. Joke generic নাকি original।
5. Punchline কতটা effective।

Rules:
- Short হলেও ভালো joke হলে high score দিতে পারো।
- শুধু বড় লেখা হলে bonus দেবে না।
- Emoji একা funny content হিসেবে count করবে না।
- Protected/sensitive characteristics নিয়ে attack করলে score কমাও।
- Serious threat/hate/dangerous content হলে safe=false।
- Personal sensitive information ব্যবহার করলে safe=false।

শুধু valid JSON return করো:

{
  "score": 0,
  "funny": 0,
  "creativity": 0,
  "relevance": 0,
  "originality": 0,
  "delivery": 0,
  "comment": "বাংলায় funny judge comment",
  "safe": true
}
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    const funny = Math.min(30, clampScore(result.funny, 15));
    const creativity = Math.min(
      25,
      clampScore(result.creativity, 12)
    );
    const relevance = Math.min(
      20,
      clampScore(result.relevance, 10)
    );
    const originality = Math.min(
      15,
      clampScore(result.originality, 8)
    );
    const delivery = Math.min(
      10,
      clampScore(result.delivery, 5)
    );

    const calculatedScore =
      funny +
      creativity +
      relevance +
      originality +
      delivery;

    return {
      score: clampScore(
        result.score,
        calculatedScore
      ),

      funny,
      creativity,
      relevance,
      originality,
      delivery,

      comment: safeComment(
        result.comment,
        "Caption ভালো ছিল! 😂"
      ),

      safe:
        typeof result.safe === "boolean"
          ? result.safe
          : true,
    };
  } catch (error) {
    console.error(
      "❌ judgeMeme failed:",
      getErrorMessage(error)
    );

    return {
      score: 50,
      funny: 15,
      creativity: 12,
      relevance: 10,
      originality: 8,
      delivery: 5,
      comment:
        "AI Meme Judge একটু busy, তাই temporary score দেওয়া হয়েছে 😂",
      safe: true,
      fallback: true,
    };
  }
}

// ==========================================
// 🛡️ AI MEME SAFETY CHECK
// ==========================================

async function checkMemeSafety(text) {
  const prompt = `
তুমি একটি Bengali entertainment meme bot-এর content safety checker।

Meme Caption:
${text}

শুধু valid JSON return করো:

{
  "safe": true,
  "reason": "short Bengali explanation"
}

safe=false যদি:
- serious threat থাকে
- hateful attack থাকে
- protected/sensitive characteristic নিয়ে abusive content থাকে
- sexual exploitation content থাকে
- dangerous violent encouragement থাকে
- severe harassment থাকে

Normal funny meme বা playful teasing হলে safe=true।
`;

  try {
    const response = await createResponse(prompt);
    const result = cleanJSON(response.output_text);

    return {
      safe:
        typeof result.safe === "boolean"
          ? result.safe
          : true,

      reason: safeComment(
        result.reason,
        "Normal playful meme."
      ),
    };
  } catch (error) {
    console.error(
      "❌ checkMemeSafety failed:",
      getErrorMessage(error)
    );

    return {
      safe: true,
      reason:
        "Meme safety check temporarily unavailable.",
      fallback: true,
    };
  }
}

// ==========================================
// 🎭 AI MEME ROAST
// ==========================================

async function generateMemeRoast({
  situation,
  playerCaption,
  score,
}) {
  const prompt = `
তুমি Bangla Fun Hub-এর Meme Battle AI commentator।

Situation:
${situation}

Player Caption:
${playerCaption}

Player Score:
${score}/100

Player-এর caption নিয়ে একটি short funny Bengali reaction দাও।

Rules:
- 1-2 sentence।
- Score অনুযায়ী reaction বদলাবে।
- 80+ হলে legendary praise।
- 60-79 হলে strong praise।
- 40-59 হলে funny teasing।
- 40-এর নিচে হলে playful roast।
- কোনো hateful বা offensive content নয়।
- Protected/sensitive characteristics নিয়ে joke নয়।

শুধু reaction text return করো।
`;

  try {
    const response = await createResponse(prompt);

    let reaction = response.output_text.trim();

    reaction = reaction
      .replace(/^["']|["']$/g, "")
      .trim();

    if (!reaction) {
      throw new Error("Meme reaction empty");
    }

    return reaction.slice(0, 500);
  } catch (error) {
    console.error(
      "❌ generateMemeRoast failed:",
      getErrorMessage(error)
    );

    if (Number(score) >= 80) {
      return "ভাই, এই caption দেখে meme department-ও standing ovation দিচ্ছে! 🏆😂";
    }

    if (Number(score) >= 60) {
      return "ভালোই মেরেছো! AI opponent এখন একটু চিন্তায় আছে! 🤣";
    }

    if (Number(score) >= 40) {
      return "চেষ্টা খারাপ না, কিন্তু punchline একটু ছুটিতে গেছে! 😂";
    }

    return "ভাই joke দিতে গিয়ে joke-টাই তোমাকে দিয়ে দিল! 💀😂";
  }
}

// ==========================================
// 🔎 AI HEALTH CHECK
// ==========================================

async function testAI() {
  try {
    const response = await createResponse(
      "Reply with exactly: AI_OK"
    );

    return {
      success:
        response.output_text.trim() === "AI_OK",
      model: MODEL,
    };
  } catch (error) {
    return {
      success: false,
      model: MODEL,
      error: getErrorMessage(error),
    };
  }
}

// ==========================================
// 📦 EXPORT
// ==========================================

module.exports = {
  // Roast Battle
  judgeRoast,
  generateOpponentRoast,
  judgeOpponent,
  checkRoastSafety,

  // AI Meme Battle
  generateMemeChallenge,
  generateMemeOpponentCaption,
  judgeMeme,
  checkMemeSafety,
  generateMemeRoast,

  // AI Health
  testAI,
};
