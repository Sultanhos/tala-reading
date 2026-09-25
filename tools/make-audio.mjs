// Makes the story audio ONCE with Microsoft's Egyptian Arabic neural voice (Azure Speech) and saves it in audio/.
// The game then plays these files on every device; no account or internet voice is needed afterwards.
//
// Usage (PowerShell, in the game folder):
//   $env:AZURE_SPEECH_KEY = "<your key>"; $env:AZURE_SPEECH_REGION = "westeurope"
//   node tools/make-audio.mjs              # make all missing files
//   node tools/make-audio.mjs --dry-run    # only count the characters (free tier: 500,000 a month)
//   node tools/make-audio.mjs --only yunus --force --voice ar-EG-ShakirNeural --rate -10%
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] ? args[i + 1] : d; };

const VOICE = opt("--voice", process.env.AZURE_VOICE || "ar-EG-SalmaNeural");
const RATE = opt("--rate", "-6%");
const ONLY = opt("--only", "");
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "stories.js"), "utf8"), ctx);
const stories = ctx.window.TALA_STORIES || [];
const ui = ctx.window.TALA_UI || {};

// everything the storyteller says (the Quran verses are not here: a real reciter recites them)
const items = [];
for (const [k, t] of Object.entries(ui)) items.push({ key: k, file: `audio/ui/${k.slice(3)}.mp3`, text: t, story: "" });
for (const s of stories) {
  s.p.forEach((p, i) => { if (!Array.isArray(p[1])) items.push({ key: `${s.id}:p${i}`, file: `audio/${s.id}/p${i}.mp3`, text: p[1], story: s.id }); });
  s.q.forEach((q, i) => {
    items.push({ key: `${s.id}:q${i}`, file: `audio/${s.id}/q${i}.mp3`, text: q.q, story: s.id });
    items.push({ key: `${s.id}:a${i}`, file: `audio/${s.id}/a${i}.mp3`, text: "الإجابة: " + q.a, story: s.id });
  });
}

function clean(t) {
  return String(t)
    .replace(/[ۖ-ۭ«»]/g, "")
    .replace(/[☀-➿️‍]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/\s+/g, " ").trim();
}
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ssml = (t) => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-EG"><voice name="${VOICE}"><prosody rate="${RATE}">${esc(clean(t))}</prosody></voice></speak>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const todo = items.filter((it) => (!ONLY || it.story === ONLY || !it.story) && (flag("--force") || !fs.existsSync(path.join(root, it.file))));
const chars = todo.reduce((n, it) => n + clean(it.text).length, 0);
console.log(`${items.length} sentences in total, ${todo.length} to make (${chars} characters), voice ${VOICE}, rate ${RATE}`);

if (!flag("--dry-run")) {
  if (!KEY || !REGION) {
    console.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first (see the top of this file).");
    process.exit(1);
  }
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  let n = 0;
  for (const it of todo) {
    let tries = 0;
    for (;;) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "tala-game",
        },
        body: ssml(it.text),
      });
      if (res.status === 429 && tries++ < 6) { await sleep(15000); continue; } // free tier: about 20 requests a minute
      if (!res.ok) {
        console.error(`\nFailed on ${it.key}: ${res.status} ${res.statusText} ${await res.text()}`);
        if (res.status === 401 || res.status === 403) console.error("The key or the region is wrong.");
        process.exit(1);
      }
      const out = path.join(root, it.file);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      break;
    }
    process.stdout.write(`\r${++n}/${todo.length}  ${it.key}          `);
    await sleep(3200);
  }
  console.log("\nDone.");
}

// the list the game reads: every sentence that has a file
const files = {};
for (const it of items) if (fs.existsSync(path.join(root, it.file))) files[it.key] = it.file;
fs.mkdirSync(path.join(root, "audio"), { recursive: true });
fs.writeFileSync(path.join(root, "audio", "manifest.json"), JSON.stringify({ voice: VOICE, files }, null, 1));
console.log(`audio/manifest.json lists ${Object.keys(files).length} of ${items.length} files.`);
