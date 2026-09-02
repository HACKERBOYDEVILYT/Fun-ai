require("dotenv").config();

const OpenAI = require("openai");

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ OPENAI_API_KEY পাওয়া যায়নি!");
  console.error("👉 .env ফাইলে OPENAI_API_KEY যোগ করো।");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

// ==========================================
// 🧠 AI ROAST JUDGE
// ==========================================

async function judgeRoast({
  target,
  playerRoast,
}) {
  const prompt = `
তুমি "Bangla Fun Hub" নামের একটি fun Bengali Roast Battle-এর AI Judge।

Target:
${target}

Player-এর Roast:
${playerRoast}

এই roast-টি বিচার করো।

Score-এর criteria:
1. Funny — 0-30
2. Creativity — 0-25
3. Target relevance — 0-20
4. Originality — 0-15
5. Delivery — 0-10

মোট score 0 থেকে 100।

নিয়ম:
- Roast অবশ্যই playful/funny হতে হবে।
- ব্যক্তিগত sensitive বিষয় নিয়ে আক্রমণ করবে না।
- ধর্ম, জাতি, ethnicity, disability, sexual orientation ইত্যাদি নিয়ে অপমানকে bonus দেবে না।
- হুমকি, সহিংসতা বা hateful content হলে score কমাবে।
- খুব generic হলে score কমাবে।

শুধু valid JSON দাও।

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

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
  });

  const text = response.output_text.trim();

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 50,
      funny: 15,
      creativity: 12,
      relevance: 10,
      originality: 8,
      delivery: 5,
      comment: "AI বিচার করতে গিয়ে একটু glitch করেছে 😂",
      safe: true,
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
- 1-2 sentence।
- Bengali language ব্যবহার করো।
- Friendly roast হবে।
- Hate speech নয়।
- Threat নয়।
- Sensitive personal characteristics নিয়ে joke নয়।
- খুব offensive বা abusive হবে না।
- Emoji ব্যবহার করতে পারো।

শুধু roast text return করো।
`;

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
  });

  return response.output_text.trim();
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

এই roast-এর funny এবং creative quality বিচার করো।

0-100 score দাও।

শুধু JSON return করো:

{
  "score": 0,
  "comment": "বাংলায় ছোট বিচার"
}
`;

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
  });

  const text = response.output_text.trim();

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 50,
      comment: "Opponent-এর score calculate করতে AI glitch করেছে 😂",
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

Return only JSON:

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

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
  });

  const result = response.output_text.trim();

  try {
    return JSON.parse(result);
  } catch {
    return {
      safe: true,
      reason: "Could not parse safety result.",
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
};
