// Tala's AI helper, a Render web service called by the game:
//   POST /judge   Claude checks whether a spoken answer to a story question is right
//   POST /report  Claude writes the weekly report for the parents from the week's numbers (never the child's name)
// Needs the environment variable ANTHROPIC_API_KEY (set in the Render dashboard, never in code).
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const PORT = Number(process.env.PORT) || 10000;
// the website, and the phone app (Android serves the game from https://localhost, iOS from capacitor://localhost)
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://tala-reading.onrender.com,https://localhost,capacitor://localhost")
  .split(",").map((s) => s.trim()).filter(Boolean);

const SYSTEM = `You check answers from a 6-year-old girl to questions about an Islamic children's story she just heard in Egyptian Arabic.
Her answer was spoken and turned into text by speech recognition, so it can contain recognition mistakes or missing words. "heard" lists alternative transcripts of the same answer; treat them as possible versions of what she said.
Judge the meaning, not the wording: the answer is correct if any transcript clearly contains the key idea of the expected answer. Synonyms, Egyptian or standard Arabic words, very short answers and answers with extra words all count. It is wrong if she names something else, says she doesn't know, or the text has nothing to do with the question.
"feedback" is one short, warm sentence in Egyptian Arabic for a small girl (at most 12 words), with feminine forms, and may use her name. If correct, praise her. If wrong, encourage her kindly to try again and do not say the answer. Never mention speech recognition or transcripts.`;

const SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    feedback: { type: "string" },
  },
  required: ["correct", "feedback"],
  additionalProperties: false,
};

const REPORT_SYSTEM = `You write a short weekly progress report for the parents of one young child who uses an Arabic learning app: reading vowelled words (قراءة), writing letters (كتابة), first-grade math (حساب) and S-sound pronunciation practice (نطق).
Write in warm, simple Egyptian Arabic, the way a kind teacher talks to parents. Use the child's gender for every form. Never write a name: always write {name} where the child's name belongs; the app fills it in.
Use only the numbers you are given. Do not invent results, do not compare with other children, and do not diagnose anything (no "delay", "disorder", "problem"). Pronunciation numbers come from an app, not a specialist; if they are low, you may gently say a speech therapist can check it if the parents are worried, nothing more.
"hard" lists items the child got wrong several times. Build the home activities on these exact items (the words, letters or math skills), each one concrete, playful, 5-10 minutes, without a screen, and doable in any Arab home.
If the week has little or no practice, say so kindly and suggest a short daily routine instead of judging.
Keep it short: headline one sentence; summary at most 3 sentences; 1-3 strengths; 1-3 focus points; 2-3 activities; child_message one short sentence of praise (at most 15 words) that the parents read aloud to {name}.`;

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    focus: { type: "array", items: { type: "string" } },
    activities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, how: { type: "string" } }, required: ["title", "how"], additionalProperties: false } },
    child_message: { type: "string" },
  },
  required: ["headline", "summary", "strengths", "focus", "activities", "child_message"],
  additionalProperties: false,
};

// small safety net against misuse of the public endpoint: a few requests per minute per visitor
const hits = new Map();
function limited(ip, kind, max) {
  const key = kind + " " + ip, now = Date.now(), list = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function clip(v, n) { return typeof v === "string" ? v.slice(0, n) : ""; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100000, Math.round(n))) : 0; }

function send(res, status, body, origin) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Vary": "Origin" };
  if (origin && ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  res.writeHead(status, headers);
  res.end(body == null ? "" : JSON.stringify(body));
}

async function judge(input) {
  const task = {
    story: clip(input.story, 100),
    question: clip(input.question, 300),
    expected_answer: clip(input.expected, 300),
    child_name: clip(input.name, 30),
    heard: (Array.isArray(input.heard) ? input.heard : []).slice(0, 5).map((h) => clip(h, 200)).filter(Boolean),
  };
  if (!task.question || !task.expected_answer || !task.heard.length) return { status: 400, body: { error: "missing fields" } };

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2048,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(task) }],
  });
  if (response.stop_reason === "refusal") return { status: 502, body: { error: "refused" } };
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const out = JSON.parse(text);
  return { status: 200, body: { correct: !!out.correct, feedback: clip(out.feedback, 200) } };
}

// the week's numbers from the app, cleaned: only numbers, short labels and the hard items
function reportTask(input) {
  const areas = {};
  for (const a of ["read", "write", "math", "speak"]) {
    const v = (input.areas || {})[a] || {};
    areas[a] = { minutes: num(v.minutes), right: num(v.right), wrong: num(v.wrong), level: clip(v.level, 60) };
  }
  const hard = {};
  for (const a of ["read", "write", "math"]) {
    hard[a] = (Array.isArray((input.hard || {})[a]) ? input.hard[a] : []).slice(0, 8)
      .map((h) => ({ item: clip(h && h.item, 40), right: num(h && h.right), wrong: num(h && h.wrong) })).filter((h) => h.item);
  }
  return {
    child: { age: num(input.age) || null, gender: input.gender === "boy" ? "boy" : "girl" },
    week: {
      minutes: num(input.minutes), minutes_week_before: num(input.prevMinutes), days_played: Math.min(7, num(input.days)),
      stars: num(input.stars), minutes_per_day_oldest_first: (Array.isArray(input.daily) ? input.daily : []).slice(0, 7).map(num),
    },
    areas,
    pronunciation_language: input.speakLang === "de" ? "German" : "Arabic",
    hard,
  };
}
async function report(input) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: REPORT_SCHEMA } },
    system: REPORT_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(reportTask(input)) }],
  });
  if (response.stop_reason === "refusal") return { status: 502, body: { error: "refused" } };
  const out = JSON.parse(response.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
  const list = (v, n, len) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => clip(x, len)).filter(Boolean);
  return { status: 200, body: {
    headline: clip(out.headline, 200), summary: clip(out.summary, 700),
    strengths: list(out.strengths, 3, 250), focus: list(out.focus, 3, 250),
    activities: (Array.isArray(out.activities) ? out.activities : []).slice(0, 3)
      .map((x) => ({ title: clip(x && x.title, 80), how: clip(x && x.how, 400) })).filter((x) => x.title),
    child_message: clip(out.child_message, 200),
  } };
}
const ROUTES = { "/judge": { run: judge, max: 60 }, "/report": { run: report, max: 10 } };

http.createServer((req, res) => {
  const origin = req.headers.origin;
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (req.method === "OPTIONS") return send(res, 204, null, origin);
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) return send(res, 200, { ok: true, model: MODEL }, origin);
  const route = req.method === "POST" && ROUTES[req.url];
  if (!route) return send(res, 404, { error: "not found" }, origin);
  if (origin && !ORIGINS.includes(origin)) return send(res, 403, { error: "origin not allowed" }, origin);
  if (limited(ip, req.url, route.max)) return send(res, 429, { error: "too many requests" }, origin);

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 8000) req.destroy(); });
  req.on("end", async () => {
    let input;
    try { input = JSON.parse(raw); } catch { return send(res, 400, { error: "bad json" }, origin); }
    try {
      const r = await route.run(input);
      send(res, r.status, r.body, origin);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) { console.error("Invalid ANTHROPIC_API_KEY"); send(res, 500, { error: "server key" }, origin); }
      else if (error instanceof Anthropic.RateLimitError) send(res, 503, { error: "busy" }, origin);
      else if (error instanceof Anthropic.APIError) { console.error(`API error ${error.status}:`, error.message); send(res, 502, { error: "api" }, origin); }
      else if (error instanceof SyntaxError) send(res, 502, { error: "bad model output" }, origin);
      else { console.error(error); send(res, 500, { error: "server" }, origin); }
    }
  });
}).listen(PORT, () => console.log(`Tala AI helper listening on ${PORT}, model ${MODEL}, origins ${ORIGINS.join(" ")}`));
