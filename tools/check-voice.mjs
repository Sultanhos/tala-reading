// Quality check of the recorded voice lines (audio/voice): each clip is heard by Whisper (VoiceStudio must be running)
// and compared with its text; clips with noise at the end or a poor match are listed.
//   node tools/check-voice.mjs            -> report
//   node tools/check-voice.mjs --delete   -> also deletes the bad clips, so `node tools/make-voice.mjs` records them again
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "audio", "voice");
const VS = "http://localhost:3900";
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "js", "voice-manifest.js"), "utf8"), ctx);
const files = ctx.window.VOICE_FILES;
const FF = (() => { const w = "C:/Users/icanb/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe"; return fs.existsSync(w) ? w : "ffmpeg"; })();

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
// how loud the very end of the clip is (dB)
function tailNoise(file) {
  const r = spawnSync(FF, ["-loglevel", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", "24000", "pipe:1"], { maxBuffer: 1 << 28 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1), W = 1200, db = [];
  for (let i = 0; i + W <= pcm.length; i += W) { let s = 0; for (let k = 0; k < W; k++) s += pcm[i + k] * pcm[i + k]; db.push(10 * Math.log10(s / W / 1073741824 + 1e-12)); }
  // the clip must end in silence; a loud last moment after the word has faded is the "shhh" kind of noise
  const peak = Math.max(...db);
  return { sec: pcm.length / 24000, endDb: db[db.length - 1], peak };
}
const h = await fetch(`${VS}/health`).then((r) => r.json()).catch(() => null);
const whisper = !!(h && h.status === "ok");
if (!whisper) console.log("VoiceStudio is not running: only the noise check is done, not the word check.");
const bad = [];
let n = 0;
const entries = Object.entries(files);
for (const [text, f] of entries) {
  const file = path.join(OUT, f);
  if (!fs.existsSync(file)) { bad.push([text, f, "missing"]); continue; }
  const t = tailNoise(file);
  let why = "";
  if (t.endDb > -45) why = `not silent at the end (${Math.round(t.endDb)} dB)`;
  if (!why && whisper) {
    const td = new FormData();
    td.append("file", new Blob([fs.readFileSync(file)], { type: "audio/mpeg" }), "clip.mp3");
    td.append("model", "whisper-1"); td.append("language", "ar"); td.append("response_format", "json");
    const tr = await fetch(`${VS}/v1/audio/transcriptions`, { method: "POST", body: td });
    const heard = tr.ok ? (await tr.json()).text || "" : "";
    const score = similarity(text, heard), letters = normAr(text).length;
    // single short words are hard for the recognizer: only flag them when nothing like the word was heard
    if (score < (letters <= 4 ? 0.34 : 0.6)) why = `heard «${heard.trim().slice(0, 60)}» (${Math.round(score * 100)}%)`;
  }
  if (why) bad.push([text, f, why]);
  process.stdout.write(`\r${++n}/${entries.length}  doubtful: ${bad.length}   `);
}
console.log(`\n${entries.length - bad.length} of ${entries.length} clips are fine.`);
bad.forEach(([text, f, why]) => console.log(`  ${text}  [${f}]  ${why}`));
if (process.argv.includes("--delete")) { bad.forEach(([, f]) => { try { fs.unlinkSync(path.join(OUT, f)); } catch {} }); console.log("deleted the doubtful clips; run make-voice.mjs to record them again"); }
