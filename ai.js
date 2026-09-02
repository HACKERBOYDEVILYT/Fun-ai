require("dotenv").config();

const OpenAI = require("openai");

// ==========================================
// ⚙️ CONFIG
// ==========================================

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ OPENAI_API_KEY পাওয়া যায়নি!");
  console.error("👉 .env ফাইলে OPENAI_API_KEY যোগ করো।");
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

  let cleaned = text.trim();

  // Markdown code fence remove
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extra text থাকলে JSON object খুঁজে বের করার চেষ্টা
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

    const funny = clampScore(result.funny, 15);
    const creativity = clampScore(result.creativity, 12);
    const relevance = clampScore(result.relevance, 10);
    const originality = clampScore(result.originality, 8);
    const delivery = clampScore(result.delivery, 5);

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

      funny: Math.min(30, funny),
      creativity: Math.min(25, creativity),
      relevance: Math.min(20, relevance),
      originality: Math.min(15, originality),
      delivery: Math.min(10, delivery),

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

    // AI safety service unavailable হলে
    // conservative fallback ব্যবহার করা হচ্ছে।
    return {
      safe: true,
      reason:
        "Safety check temporarily unavailable.",
      fallback: true,
    };
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
      success: response.output_text.trim() === "AI_OK",
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
  judgeRoast,
  generateOpponentRoast,
  judgeOpponent,
  checkRoastSafety,
  testAI,
};
