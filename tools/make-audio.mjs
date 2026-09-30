// Makes the story audio ONCE with an AI voice and saves it in audio/. The game then plays these files on every device.
// Every paragraph, question and answer is made separately, so nothing has to be cut.
//
// VoiceStudio (runs on this PC, free; needs the VoiceStudio app running):
//   node tools/make-audio.mjs --engine voicestudio                 # all missing files, with the demo voice
//   options: --voice <VoiceStudio profile id>   --only yunus   --force
//   Every file is checked by VoiceStudio's speech recognizer; a mismatch is made again with another seed.
//
// Google Gemini (the "Fola" voice from AI Studio, Egyptian storyteller style):
//   $env:GEMINI_API_KEY = "<your key>"
//   node tools/make-audio.mjs --only yunus     # one story first, to listen to it
//   node tools/make-audio.mjs                  # all missing files
//   options: --voice Fola   --model gemini-3.8-flash-tts   --force (make again)
//
// OpenAI (natural Egyptian storyteller; roughly a dollar for all stories):
//   $env:OPENAI_API_KEY = "<your key>"
//   node tools/make-audio.mjs --only yunus     # one story first, to listen to it
//   node tools/make-audio.mjs                  # all missing files
//   options: --voice coral|sage|shimmer|nova|ash|ballad|echo|onyx|alloy|verse   --model gpt-4o-mini-tts   --force
//
// Microsoft Azure (free tier):
//   $env:AZURE_SPEECH_KEY = "<your key>"; $env:AZURE_SPEECH_REGION = "westeurope"
//   node tools/make-audio.mjs --engine azure   options: --voice ar-EG-ShakirNeural --rate -10%
//
//   --dry-run only counts what would be made. The Quran verses are not made here: a real reciter recites them.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] ? args[i + 1] : d; };

const ENGINE = opt("--engine", process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "azure");
const VOICE = opt("--voice", { gemini: "Fola", openai: "coral", azure: "ar-EG-SalmaNeural", voicestudio: "demo0001" }[ENGINE]);
const VS = opt("--vs-url", "http://localhost:3900");
const MODEL = opt("--model", ENGINE === "gemini" ? "gemini-3.8-flash-tts" : "gpt-4o-mini-tts");
const RATE = opt("--rate", "-6%");
const ONLY = opt("--only", "");

// how the OpenAI voice should sound
const STYLE = `Speak in Egyptian Arabic with a natural Cairo (Egyptian) accent, like a native Egyptian mother.
You are a warm, gentle storyteller telling a true Islamic story to a 6-year-old girl.
Calm, clear and a little slow, friendly and lively but not theatrical. Small pauses at commas and full stops.
Read the text exactly as written, word for word; say nothing else.`;
const STYLE_OWL = `Speak in Egyptian Arabic with a natural Cairo (Egyptian) accent.
You are a kind teacher talking to a 6-year-old girl during a quiz: warm, cheerful and encouraging, clear and not too fast.
Read the text exactly as written, word for word; say nothing else.`;

// how the Gemini voice should sound (the style that was chosen in AI Studio)
const G_STYLE = "Natural Egyptian (Cairo) Arabic accent, like a warm Egyptian mother telling a true story to her 6-year-old daughter. Calm, clear, a little slow, gentle and lively.";
const G_STYLE_OWL = "Natural Egyptian (Cairo) Arabic accent, like a kind, cheerful Egyptian teacher talking to a 6-year-old girl during a quiz. Warm, encouraging, clear, not too fast.";

// ffmpeg turns Gemini's raw audio into MP3
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const pk = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  try {
    for (const d of fs.readdirSync(pk).filter((d) => /ffmpeg/i.test(d))) {
      for (const b of fs.readdirSync(path.join(pk, d))) {
        const exe = path.join(pk, d, b, "bin", "ffmpeg.exe");
        if (fs.existsSync(exe)) return exe;
      }
    }
  } catch {}
  return "ffmpeg";
}
function wavToMp3(wav, out) {
  const r = spawnSync(findFfmpeg(), ["-y", "-loglevel", "error", "-i", "pipe:0",
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.25",
    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", out], { input: wav });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + String(r.stderr || r.error));
}
// how close the recognizer's words are to the text (0..1), ignoring vowel marks and punctuation
function normAr(t) {
  return String(t).replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647").replace(/[^\u0621-\u064A]/g, "");
}
function similarity(a, b) {
  a = normAr(a); b = normAr(b);
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}
async function vsMake(it) { // make one piece with VoiceStudio, check it, try other seeds if needed
  let best = null;
  for (const seed of [7, 21, 42]) {
    const fd = new FormData();
    fd.append("text", clean(it.text)); fd.append("language", "Arabic"); fd.append("profile_id", VOICE); fd.append("seed", String(seed));
    const res = await fetch(`${VS}/generate`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`VoiceStudio ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const wav = Buffer.from(await res.arrayBuffer());
    const td = new FormData();
    td.append("file", new Blob([wav], { type: "audio/wav" }), "clip.wav");
    td.append("model", "whisper-1"); td.append("language", "ar"); td.append("response_format", "json");
    const tr = await fetch(`${VS}/v1/audio/transcriptions`, { method: "POST", body: td });
    const heard = tr.ok ? (await tr.json()).text || "" : "";
    const score = similarity(it.text, heard);
    if (!best || score > best.score) best = { wav, score, heard, seed };
    if (score >= 0.85) break;
  }
  return best;
}
function pcmToMp3(pcm, rate, out) {
  const r = spawnSync(findFfmpeg(), ["-y", "-loglevel", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", "pipe:0",
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.25",
    "-codec:a", "libmp3lame", "-b:a", "48k", out], { input: pcm });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + String(r.stderr || r.error));
}

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "stories.js"), "utf8"), ctx);
const stories = ctx.window.TALA_STORIES || [];
const ui = ctx.window.TALA_UI || {};

// everything the storyteller and the owl say
const items = [];
for (const [k, t] of Object.entries(ui)) items.push({ key: k, file: `audio/ui/${k.slice(3)}.mp3`, text: t, story: "", owl: true });
for (const s of stories) {
  s.p.forEach((p, i) => { if (!Array.isArray(p[1])) items.push({ key: `${s.id}:p${i}`, file: `audio/${s.id}/p${i}.mp3`, text: p[1], story: s.id }); });
  s.q.forEach((q, i) => {
    items.push({ key: `${s.id}:q${i}`, file: `audio/${s.id}/q${i}.mp3`, text: q.q, story: s.id, owl: true });
    items.push({ key: `${s.id}:a${i}`, file: `audio/${s.id}/a${i}.mp3`, text: "الإجابة: " + q.a + ".", story: s.id, owl: true });
  });
}

function clean(t) {
  return String(t)
    .replace(/[ۖ-ۭ«»]/g, "")
    .replace(/[☀-➿️‍]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/\s+/g, " ").trim();
}
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(it) {
  if (ENGINE === "gemini") {
    const prompt = `### DIRECTOR'S NOTES
Style: ${it.owl ? G_STYLE_OWL : G_STYLE}

## Transcript:
${clean(it.text)}`;
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1, responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    });
  }
  if (ENGINE === "openai") {
    return fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: clean(it.text), instructions: it.owl ? STYLE_OWL : STYLE, response_format: "mp3" }),
    });
  }
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-EG"><voice name="${VOICE}"><prosody rate="${RATE}">${esc(clean(it.text))}</prosody></voice></speak>`;
  return fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "tala-game",
    },
    body: ssml,
  });
}

const todo = items.filter((it) => (!ONLY || it.story === ONLY || !it.story) && (flag("--force") || !fs.existsSync(path.join(root, it.file))));
const chars = todo.reduce((n, it) => n + clean(it.text).length, 0);
console.log(`${items.length} sentences in total, ${todo.length} to make (${chars} characters). Engine ${ENGINE}, voice ${VOICE}${ENGINE === "openai" ? ", model " + MODEL : ""}`);

if (!flag("--dry-run") && todo.length) {
  if (ENGINE === "voicestudio") {
    const h = await fetch(`${VS}/health`).then((r) => r.json()).catch(() => null);
    if (!h || h.status !== "ok") { console.error(`VoiceStudio is not running at ${VS}. Start the VoiceStudio app first.`); process.exit(1); }
  }
  const missing = ENGINE === "voicestudio" ? false : ENGINE === "gemini" ? !process.env.GEMINI_API_KEY : ENGINE === "openai" ? !process.env.OPENAI_API_KEY : !(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  if (missing) {
    console.error({ gemini: "Set GEMINI_API_KEY first", openai: "Set OPENAI_API_KEY first", azure: "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first" }[ENGINE] + " (see the top of this file).");
    process.exit(1);
  }
  let n = 0;
  const doubtful = [];
  for (const it of todo) {
    if (ENGINE === "voicestudio") {
      const out = path.join(root, it.file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const b = await vsMake(it);
      wavToMp3(b.wav, out);
      if (b.score < 0.85) doubtful.push(`${it.key} (match ${Math.round(b.score * 100)}%): heard «${b.heard}»`);
      process.stdout.write(`\r${++n}/${todo.length}  ${it.key}  match ${Math.round(b.score * 100)}%          `);
      continue;
    }
    let tries = 0;
    for (;;) {
      let res;
      try { res = await request(it); } catch (e) { if (tries++ < 4) { await sleep(5000); continue; } throw e; }
      if ((res.status === 429 || res.status >= 500) && tries++ < 6) { await sleep(ENGINE === "azure" ? 15000 : 8000); continue; }
      if (!res.ok) {
        console.error(`\nFailed on ${it.key}: ${res.status} ${res.statusText}\n${(await res.text()).slice(0, 500)}`);
        if (res.status === 401 || res.status === 403) console.error("The key is wrong, or (Azure) the region is wrong.");
        if (res.status === 429) console.error("Rate limit or no credit left: check Billing in your account.");
        process.exit(1);
      }
      const out = path.join(root, it.file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      if (ENGINE === "gemini") {
        const j = await res.json();
        const part = (((j.candidates || [])[0] || {}).content || {}).parts || [];
        const audio = part.find((p) => p.inlineData && p.inlineData.data);
        if (!audio) {
          if (tries++ < 4) { await sleep(3000); continue; } // sometimes no audio comes back: try again
          console.error(`
No audio for ${it.key}: ${JSON.stringify(j).slice(0, 400)}`);
          process.exit(1);
        }
        const rate = Number((/rate=(\d+)/.exec(audio.inlineData.mimeType || "") || [])[1]) || 24000;
        pcmToMp3(Buffer.from(audio.inlineData.data, "base64"), rate, out);
      } else fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      break;
    }
    process.stdout.write(`\r${++n}/${todo.length}  ${it.key}          `);
    await sleep(ENGINE === "azure" ? 3200 : ENGINE === "gemini" ? 1000 : 300); // Azure's free tier allows about 20 requests a minute
  }
  console.log("\nDone.");
  if (doubtful.length) console.log("Please listen to these (the recognizer was not sure):\n  " + doubtful.join("\n  "));
}

// the list the game reads: every sentence that has a file
const files = {};
for (const it of items) if (fs.existsSync(path.join(root, it.file))) files[it.key] = it.file;
const voiceName = ENGINE === "openai" ? `OpenAI ${VOICE}` : ENGINE === "gemini" ? `Google Gemini ${VOICE}` : ENGINE === "voicestudio" ? `VoiceStudio ${VOICE}` : VOICE;
fs.mkdirSync(path.join(root, "audio"), { recursive: true });
fs.writeFileSync(path.join(root, "audio", "manifest.json"), JSON.stringify({ voice: voiceName, ai: true, files }, null, 1));
console.log(`audio/manifest.json lists ${Object.keys(files).length} of ${items.length} files.`);
