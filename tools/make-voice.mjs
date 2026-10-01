// Records every Arabic line of the app -> audio/voice/*.mp3 + js/voice-manifest.js
// Engines: Google Gemini TTS (default when GEMINI_API_KEY is set; voice "Fola", clear fusha with exact vowel marks)
//          or VoiceStudio on this PC (--engine voicestudio).
//
// 1. Get the list of lines from the app (it knows them all, girl and boy forms):
//      node tools/make-voice.mjs --collect      then open the game (http://localhost:8080) and run voiceExport() in the console
// 2. Record them (only new or changed lines; --force records everything again):
//      node tools/make-voice.mjs [--engine gemini|voicestudio] [--voice Fola] [--force] [--only "<line>"]
// Gemini: the key is read from the environment variable GEMINI_API_KEY (never put it in a file). A clip that comes out
// far too long (the model sometimes keeps talking after a short word) is made again.
// VoiceStudio: every clip is checked with its speech recognizer; a poor match is made again with another seed.
// (VoiceStudio's demo voice runs on OmniVoice, a non-commercial licence.)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIST = path.join(root, "tools", "voice-texts.json");
const OUT = path.join(root, "audio", "voice");
const MANIFEST = path.join(root, "js", "voice-manifest.js");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const ENGINE = opt("--engine", process.env.GEMINI_API_KEY ? "gemini" : "voicestudio");
const VS = opt("--vs-url", "http://localhost:3900"), VOICE = opt("--voice", ENGINE === "gemini" ? "Fola" : "demo0001");
const MODEL = opt("--model", "gemini-3.8-flash-tts");
// how the Gemini voice should sound
const G_STYLE = "Modern Standard Arabic (fusha), a warm, kind young woman teaching a small child to read. Clear and a little slow. Pronounce every vowel mark (tashkeel) exactly as written, including the last one. Say only the text.";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (args.includes("--collect")) {
  http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.end(); return; }
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      const list = JSON.parse(raw);
      fs.writeFileSync(LIST, JSON.stringify(list, null, 1) + "\n", "utf8");
      res.end("ok");
      console.log(`saved ${list.length} lines to tools/voice-texts.json`);
      process.exit(0);
    });
  }).listen(3911, () => console.log("waiting on port 3911: open the game and run voiceExport() in the console"));
}

function findFfmpeg() {
  const winget = "C:/Users/icanb/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
  return fs.existsSync(winget) ? winget : "ffmpeg";
}
function toMp3(wav, out) { // trim silence, a short tail, mono 24 kHz, small file
  const r = spawnSync(findFfmpeg(), ["-y", "-loglevel", "error", "-i", "pipe:0",
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.12",
    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", out], { input: wav });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + String(r.stderr || r.error));
}
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
async function make(text) {
  let best = null;
  for (const seed of [7, 21, 42]) {
    const fd = new FormData();
    fd.append("text", text); fd.append("language", "Arabic"); fd.append("profile_id", VOICE); fd.append("seed", String(seed));
    const res = await fetch(`${VS}/generate`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`VoiceStudio ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const wav = Buffer.from(await res.arrayBuffer());
    const td = new FormData();
    td.append("file", new Blob([wav], { type: "audio/wav" }), "clip.wav");
    td.append("model", "whisper-1"); td.append("language", "ar"); td.append("response_format", "json");
    const tr = await fetch(`${VS}/v1/audio/transcriptions`, { method: "POST", body: td });
    const heard = tr.ok ? (await tr.json()).text || "" : "";
    const score = similarity(text, heard);
    if (!best || score > best.score) best = { wav, score, heard, seed };
    if (score >= 0.8) break;
  }
  return best;
}
function findFfprobe() { return findFfmpeg().replace(/ffmpeg(\.exe)?$/, "ffprobe$1"); }
function seconds(file) {
  const r = spawnSync(findFfprobe(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(String(r.stdout).trim()) || 0;
}
// ---- Gemini: several lines per request (the starter tier allows only 100 requests a day), cut apart at the pauses ----
const FADES = "afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse,apad=pad_dur=0.12"; // no click, no hiss, a short rest
let dayLimit = false;
// one request -> the audio as 24 kHz mono samples, or { error }
async function geminiPcm(transcript, note) {
  let last = "";
  for (let tries = 0; tries < 4; tries++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `### DIRECTOR'S NOTES\nStyle: ${G_STYLE}${note ? "\n" + note : ""}\n\n## Transcript:\n${transcript}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e) } }) }));
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(j.error && j.error.message || "");
      last = `${res.status} ${msg.slice(0, 200)}`;
      if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error("Gemini: " + last);
      if (res.status === 429 && /per_day|PerDay/.test(msg)) { dayLimit = true; return { error: "daily limit" }; } // no use waiting
      await sleep(res.status === 429 ? 25000 : 4000); // too fast or busy: wait and try again
      continue;
    }
    const audio = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find((x) => x.inlineData);
    if (!audio) { last = "no audio"; await sleep(1500); continue; }
    const buf = Buffer.from(audio.inlineData.data, "base64");
    const wav = buf.slice(0, 4).toString("latin1") === "RIFF"; // Gemini sends a WAV file (older models: raw samples)
    const rate = Number((/rate=(\d+)/.exec(audio.inlineData.mimeType) || [])[1]) || 24000;
    const r = spawnSync(findFfmpeg(), ["-loglevel", "error", ...(wav ? [] : ["-f", "s16le", "-ar", String(rate), "-ac", "1"]), "-i", "pipe:0",
      "-f", "s16le", "-ac", "1", "-ar", "24000", "pipe:1"], { input: buf, maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error("ffmpeg failed: " + String(r.stderr || r.error));
    return { pcm: new Int16Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + (r.stdout.length & ~1))) };
  }
  return { error: last };
}
// the spoken parts of a recording: [start, end] in samples, split wherever it is quiet for `gap` seconds
function spokenParts(pcm, gap) {
  const W = 480, db = [];
  for (let i = 0; i + W <= pcm.length; i += W) { let e = 0; for (let k = 0; k < W; k++) e += pcm[i + k] * pcm[i + k]; db.push(10 * Math.log10(e / W / 1073741824 + 1e-12)); }
  const peak = db.reduce((m, x) => Math.max(m, x), -120), thr = Math.max(peak - 40, -58), need = Math.round(gap * 24000 / W), parts = [];
  let start = -1, quiet = 0;
  db.forEach((x, i) => {
    if (x > thr) { if (start < 0) start = i; quiet = 0; }
    else if (start >= 0 && ++quiet >= need) { parts.push([start, i - quiet + 1]); start = -1; quiet = 0; }
  });
  if (start >= 0) parts.push([start, db.length - quiet]);
  return parts.filter((p) => p[1] - p[0] >= 4).map((p) => [Math.max(0, p[0] * W - 720), Math.min(pcm.length, p[1] * W + 1200)]);
}
function clipToMp3(pcm, from, to, out) {
  const r = spawnSync(findFfmpeg(), ["-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-af", FADES,
    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", out], { input: Buffer.from(pcm.buffer, pcm.byteOffset + from * 2, (to - from) * 2) });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + String(r.stderr || r.error));
}
const maxSeconds = (text) => 2.5 + 0.3 * text.replace(/[^\u0621-\u064A]/g, "").length; // longer than this: the model kept talking
// records the lines [[text, file], ...]; returns the lines that did not come out (to try again, alone)
async function makeGeminiBatch(items) {
  if (dayLimit) return items;
  const single = items.length === 1;
  const r = await geminiPcm(items.map((x) => x[0]).join("\n\n"),
    single ? "" : "The transcript is a list of separate lines. Read them one by one, each exactly once. After every line stay completely silent for two full seconds before the next line.");
  if (r.error) return items;
  const parts = spokenParts(r.pcm, single ? 9 : 0.7);
  if (parts.length !== items.length) return items; // the pauses did not come out clearly: these lines are done again in smaller groups
  const bad = [];
  items.forEach(([text, f], i) => {
    const sec = (parts[i][1] - parts[i][0]) / 24000;
    if (sec < 0.25 || sec > maxSeconds(text)) { bad.push([text, f]); return; }
    clipToMp3(r.pcm, parts[i][0], parts[i][1], path.join(OUT, f));
  });
  return bad;
}
async function record() {
  if (ENGINE === "gemini") {
    if (!process.env.GEMINI_API_KEY) { console.error("Set GEMINI_API_KEY first (see the top of this file)."); process.exit(1); }
  } else {
    const h = await fetch(`${VS}/health`).then((r) => r.json()).catch(() => null);
    if (!h || h.status !== "ok") { console.error(`VoiceStudio is not ready at ${VS}. Start the VoiceStudio app first.`); process.exit(1); }
  }
  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const only = opt("--only", null), force = args.includes("--force");
  fs.mkdirSync(OUT, { recursive: true });
  const files = {};
  const todo = [];
  for (const text of list) {
    const f = crypto.createHash("sha1").update(ENGINE + ":" + VOICE + "\n" + text).digest("hex").slice(0, 12) + ".mp3";
    files[text] = f;
    if ((only ? text === only : true) && (force || only || !fs.existsSync(path.join(OUT, f)))) todo.push([text, f]);
  }
  const doubtful = [];
  let n = 0;
  if (ENGINE === "gemini") {
    // groups of lines; a group whose pauses did not come out is halved, down to single lines
    let groups = [];
    const size = Number(opt("--batch", 10));
    for (let i = 0; i < todo.length; i += size) groups.push(todo.slice(i, i + size));
    while (groups.length && !dayLimit) {
      const g = groups.shift(), left = await makeGeminiBatch(g);
      n += g.length - left.length;
      process.stdout.write(`\r${n}/${todo.length}   `);
      if (!left.length || dayLimit) continue;
      if (left.length === 1 && g.length === 1) { g.tries = (g.tries || 0) + 1; if (g.tries < 3) groups.push(g); else doubtful.push(`${g[0][0]}  (did not come out right 3 times)`); }
      else if (left.length === g.length && g.length > 1) { const h = Math.ceil(g.length / 2); groups.push(g.slice(0, h), g.slice(h)); }
      else left.forEach((x) => groups.push([x]));
    }
    if (dayLimit) console.log("\nGoogle's daily limit for this model is reached. Run the same command again later: it goes on where it stopped.");
  } else for (const [text, f] of todo) {
    const b = await make(text);
    toMp3(b.wav, path.join(OUT, f));
    if (b.score < 0.8) doubtful.push(`${text}  (match ${Math.round(b.score * 100)}%, heard «${b.heard}»)`);
    process.stdout.write(`\r${++n}/${todo.length}  ${Math.round(b.score * 100)}%   `);
  }
  // files no longer used are removed, the list for the app is written
  for (const t of Object.keys(files)) if (!fs.existsSync(path.join(OUT, files[t]))) delete files[t]; // only what was really recorded
  const keep = new Set(Object.values(files));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".mp3") && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
  fs.writeFileSync(MANIFEST, "// Recorded voice lines: sentence -> file in audio/voice/. Generated by tools/make-voice.mjs - do not edit by hand.\n" +
    `// Voice: ${ENGINE === "gemini" ? "Google Gemini TTS " + MODEL + ", voice " + VOICE : "VoiceStudio profile " + VOICE}.\nwindow.VOICE_FILES = ${JSON.stringify(files)};\n`, "utf8");
  console.log(`\nDone: ${Object.keys(files).length} of ${list.length} lines are recorded (${n} now).`);
  if (doubtful.length) console.log("Please check these:\n  " + doubtful.join("\n  "));
}

if (!args.includes("--collect")) await record(); // at the end: everything above is defined by now
