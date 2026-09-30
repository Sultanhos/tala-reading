// Records every Arabic line of the app with VoiceStudio (runs on this PC) -> audio/voice/*.mp3 + js/voice-manifest.js
//
// 1. Get the list of lines from the app (it knows them all, girl and boy forms):
//      node tools/make-voice.mjs --collect      then open the game (http://localhost:8080) and run voiceExport() in the console
// 2. Record them (only new or changed lines; --force records everything again):
//      node tools/make-voice.mjs [--voice demo0001] [--force] [--only "<line>"]
// Every clip is checked with VoiceStudio's speech recognizer; a poor match is made again with another seed.
// NOTE: the demo voice runs on OmniVoice (non-commercial licence). For the paid app, record again with a VoxCPM2 voice.
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
const VS = opt("--vs-url", "http://localhost:3900"), VOICE = opt("--voice", "demo0001");

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
} else {
  await record();
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
async function record() {
  const h = await fetch(`${VS}/health`).then((r) => r.json()).catch(() => null);
  if (!h || h.status !== "ok") { console.error(`VoiceStudio is not ready at ${VS}. Start the VoiceStudio app first.`); process.exit(1); }
  const list = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const only = opt("--only", null), force = args.includes("--force");
  fs.mkdirSync(OUT, { recursive: true });
  const files = {};
  const todo = [];
  for (const text of list) {
    const f = crypto.createHash("sha1").update(VOICE + "\n" + text).digest("hex").slice(0, 12) + ".mp3";
    files[text] = f;
    if ((only ? text === only : true) && (force || only || !fs.existsSync(path.join(OUT, f)))) todo.push([text, f]);
  }
  const doubtful = [];
  let n = 0;
  for (const [text, f] of todo) {
    const b = await make(text);
    toMp3(b.wav, path.join(OUT, f));
    if (b.score < 0.8) doubtful.push(`${text}  (match ${Math.round(b.score * 100)}%, heard «${b.heard}»)`);
    process.stdout.write(`\r${++n}/${todo.length}  ${Math.round(b.score * 100)}%   `);
  }
  // files no longer used are removed, the list for the app is written
  const keep = new Set(Object.values(files));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".mp3") && !keep.has(f)) fs.unlinkSync(path.join(OUT, f));
  fs.writeFileSync(MANIFEST, "// Recorded voice lines: sentence -> file in audio/voice/. Generated by tools/make-voice.mjs - do not edit by hand.\n" +
    `// Voice: VoiceStudio profile ${VOICE}.\nwindow.VOICE_FILES = ${JSON.stringify(files)};\n`, "utf8");
  console.log(`\nDone: ${Object.keys(files).length} lines, ${todo.length} recorded now.`);
  if (doubtful.length) console.log("Please listen to these (the recognizer was not sure):\n  " + doubtful.join("\n  "));
}
