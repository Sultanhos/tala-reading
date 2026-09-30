// What the child did, for the parent report: time, right / wrong answers and stars per day and area, and the words,
// letters and math levels that are still hard. Kept in the child's own saved progress (S.log, S.weak).
'use strict';

var AREAS = ['read', 'write', 'math', 'speak', 'quran', 'chat', 'story'];
var LOG_KEEP_DAYS = 120, WEAK_KEEP = 150;

function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
// S.log['2026-09-30'].read = [seconds, right, wrong, stars]
function logDay(area) {
  if (!S.log || typeof S.log !== 'object') S.log = {};
  var k = dayKey(), d = S.log[k] || (S.log[k] = {});
  return d[area] || (d[area] = [0, 0, 0, 0]);
}
// one answer: right or wrong; item = the word, letter or math level it was about (optional)
function track(area, item, ok) {
  var d = logDay(area);
  d[ok ? 1 : 2]++;
  if (item != null && item !== '') {
    if (!S.weak || typeof S.weak !== 'object') S.weak = {};
    var w = S.weak[area] || (S.weak[area] = {}), e = w[item] || (w[item] = [0, 0, 0]);
    e[ok ? 0 : 1]++; e[2] = Date.now();
  }
}
function trackStar(area) { logDay(area)[3]++; }
function logTrim() {
  var keys = Object.keys(S.log || {}).sort();
  keys.slice(0, Math.max(0, keys.length - LOG_KEEP_DAYS)).forEach(function (k) { delete S.log[k]; });
  Object.keys(S.weak || {}).forEach(function (a) {
    var w = S.weak[a], ks = Object.keys(w);
    if (ks.length <= WEAK_KEEP) return;
    ks.sort(function (x, y) { return w[y][2] - w[x][2]; }).slice(WEAK_KEEP).forEach(function (k) { delete w[k]; });
  });
}
logTrim();

/* ----- time: counts while the game is on screen and she touched it in the last 90 seconds ----- */
var actLast = Date.now(), actTicks = 0;
['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { actLast = Date.now(); }, true); });
function actParentOpen() {
  return ['parentPanel', 'dashOv', 'kidsOv', 'kidFormOv', 'gateOv'].some(function (id) { var e = $(id); return e && !e.hidden; });
}
setInterval(function () {
  if (document.visibilityState !== 'visible' || Date.now() - actLast > 90000 || actParentOpen()) return;
  logDay(view)[0] += 5;
  if (++actTicks % 6 === 0) save(); // write every 30 seconds of play
}, 5000);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
