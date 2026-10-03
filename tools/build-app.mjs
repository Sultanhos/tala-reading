// Release helper.
//   node tools/build-app.mjs --bump   new version number on every css/js link in index.html (phones then load fresh files)
//   node tools/build-app.mjs          copy the game into www/ for the phone app (Capacitor webDir)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = path.join(root, "index.html");

if (process.argv.includes("--bump")) {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  const v = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
  const html = fs.readFileSync(index, "utf8").replace(/((?:src|href)="(?:js\/[\w-]+\.js|stories\.js|css\/[\w-]+\.css))(?:\?v=[\w.-]+)?"/g, `$1?v=${v}"`);
  fs.writeFileSync(index, html);
  console.log("version", v);
  process.exit(0);
}

const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www);
for (const item of ["index.html", "stories.js", "css", "js", "audio", "icons", "manifest.webmanifest"]) {
  if (!fs.existsSync(path.join(root, item))) continue;
  fs.cpSync(path.join(root, item), path.join(www, item), { recursive: true });
}
console.log("www/ ready");
