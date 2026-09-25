// Tala's story helper: Claude checks whether a spoken answer to a story question is right.
// One endpoint, POST /judge, called by the game (index.html). Runs as a Render web service.
// Needs the environment variable ANTHROPIC_API_KEY (set in the Render dashboard, never in code).
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const PORT = Number(process.env.PORT) || 10000;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://tala-reading.onrender.com")
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

// small safety net against misuse of the public endpoint: a few requests per minute per visitor
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 60;
}

function clip(v, n) { return typeof v === "string" ? v.slice(0, n) : ""; }

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

http.createServer((req, res) => {
  const origin = req.headers.origin;
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (req.method === "OPTIONS") return send(res, 204, null, origin);
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) return send(res, 200, { ok: true, model: MODEL }, origin);
  if (req.method !== "POST" || req.url !== "/judge") return send(res, 404, { error: "not found" }, origin);
  if (origin && !ORIGINS.includes(origin)) return send(res, 403, { error: "origin not allowed" }, origin);
  if (limited(ip)) return send(res, 429, { error: "too many requests" }, origin);

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 8000) req.destroy(); });
  req.on("end", async () => {
    let input;
    try { input = JSON.parse(raw); } catch { return send(res, 400, { error: "bad json" }, origin); }
    try {
      const r = await judge(input);
      send(res, r.status, r.body, origin);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) { console.error("Invalid ANTHROPIC_API_KEY"); send(res, 500, { error: "server key" }, origin); }
      else if (error instanceof Anthropic.RateLimitError) send(res, 503, { error: "busy" }, origin);
      else if (error instanceof Anthropic.APIError) { console.error(`API error ${error.status}:`, error.message); send(res, 502, { error: "api" }, origin); }
      else if (error instanceof SyntaxError) send(res, 502, { error: "bad model output" }, origin);
      else { console.error(error); send(res, 500, { error: "server" }, origin); }
    }
  });
}).listen(PORT, () => console.log(`Tala judge listening on ${PORT}, model ${MODEL}, origins ${ORIGINS.join(" ")}`));
