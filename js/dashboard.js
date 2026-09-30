// Parent report: the last 7 days per child — time, stars, right answers, levels, and what is still hard.
'use strict';

var AREA_INFO = {
  read: ['📖', 'قراءة', '#7b5cff'], write: ['✍️', 'كتابة', '#ff6b6b'], math: ['🔢', 'حساب', '#2fcf8b'],
  speak: ['🐍', 'نطق', '#ffb547'], story: ['📚', 'حكايات', '#6bb8ff']
};
var dashKid = null;

function dashData(k) {
  if (k.id === P.cur) return S;
  try { return JSON.parse(localStorage.getItem(childKey(k.id)) || '{}') || {}; } catch (e) { return {}; }
}
function dashDays(n, back) { // n days ending `back` days ago, oldest first
  var out = [];
  for (var i = n - 1 + (back || 0); i >= (back || 0); i--) { var d = new Date(); d.setDate(d.getDate() - i); out.push(d); }
  return out;
}
function dashSum(log, days) {
  var s = { sec: 0, ok: 0, bad: 0, stars: 0, played: 0, area: {} };
  days.forEach(function (d) {
    var day = (log || {})[dayKey(d)], any = false;
    if (!day) return;
    Object.keys(day).forEach(function (a) {
      var v = day[a], t = s.area[a] || (s.area[a] = [0, 0, 0, 0]);
      for (var i = 0; i < 4; i++) t[i] += v[i] || 0;
      s.sec += v[0] || 0; s.ok += v[1] || 0; s.bad += v[2] || 0; s.stars += v[3] || 0;
      if (v[0] || v[1] || v[2]) any = true;
    });
    if (any) s.played++;
  });
  return s;
}
function dashMin(sec) { return sec > 0 && sec < 60 ? 'أقل من ١' : mNumAr(Math.round(sec / 60)); }
function dashWeak(d, area) {
  var w = (d.weak || {})[area] || {};
  return Object.keys(w).filter(function (k) { var e = w[k]; return e[1] >= 2 && e[1] / (e[0] + e[1]) >= 0.34; })
    .sort(function (x, y) {
      var a = w[x], b = w[y], ra = a[1] / (a[0] + a[1]), rb = b[1] / (b[0] + b[1]);
      return rb - ra || b[1] - a[1];
    }).slice(0, 8).map(function (k) { return { k: k, ok: w[k][0], bad: w[k][1] }; });
}
function dashLevel(d, area) {
  if (area === 'read') return lessonName(Math.min(LEVELS.length, Math.max(1, d.level | 0 || 1)));
  if (area === 'write') return 'المستوى ' + mNumAr(Math.min(WLEVELS.length, Math.max(1, d.wLevel | 0 || 1)));
  if (area === 'math') return MLEVELS[Math.min(MLEVELS.length, Math.max(1, d.mLevel | 0 || 1)) - 1].t();
  if (area === 'speak') return d.lisp && d.lisp.rounds ? 'أحسن نتيجة: ' + mNumAr(d.lisp.best) + ' من ٥٠' : '';
  return '';
}

function dashTile(big, label, sub) {
  var t = mEl('div', 'dTile');
  t.appendChild(mEl('b', '', big));
  t.appendChild(mEl('span', '', label));
  if (sub) t.appendChild(mEl('small', '', sub));
  return t;
}
function dashRender() {
  var k = dashKid || pCur(), d = dashData(k), girl = k.gender !== 'boy';
  $('dashTitle').textContent = 'تقرير ' + k.avatar + ' ' + k.name;

  var kids = $('dashKids');
  kids.textContent = '';
  kids.hidden = P.list.length < 2;
  P.list.forEach(function (x) {
    var b = mEl('button', 'small' + (x.id === k.id ? ' on' : ''), x.avatar + ' ' + x.name);
    b.onclick = function () { dashKid = x; dashRender(); };
    kids.appendChild(b);
  });

  var body = $('dashBody');
  body.textContent = '';
  var week = dashDays(7), wk = dashSum(d.log, week), prev = dashSum(d.log, dashDays(7, 7));
  var anything = Object.keys(d.log || {}).length > 0;
  if (!anything) {
    body.appendChild(mEl('p', 'dEmpty', 'التقرير هيبتدي يتملي لما ' + k.name + (girl ? ' تلعب' : ' يلعب') + '. كل دقيقة وكل إجابة بتتسجل هنا.'));
    return;
  }

  // this week at a glance
  var diff = Math.round((wk.sec - prev.sec) / 60), tries = wk.ok + wk.bad;
  var tiles = mEl('div', 'dTiles');
  tiles.appendChild(dashTile(dashMin(wk.sec), 'دقيقة الأسبوع ده',
    prev.sec ? (diff >= 0 ? '▲ ' + mNumAr(diff) + ' عن الأسبوع اللي فات' : '▼ ' + mNumAr(-diff) + ' عن الأسبوع اللي فات') : ''));
  tiles.appendChild(dashTile(mNumAr(wk.stars), 'نجوم الأسبوع ده', 'كل النجوم: ' + mNumAr(d.stars | 0)));
  tiles.appendChild(dashTile(mNumAr(wk.played) + ' / ٧', 'أيام ' + (girl ? 'لعبت' : 'لعب') + ' فيها'));
  tiles.appendChild(dashTile(tries ? mNumAr(Math.round(wk.ok / tries * 100)) + '٪' : '–', 'إجابات صح', tries ? mNumAr(wk.ok) + ' صح من ' + mNumAr(tries) : ''));
  body.appendChild(tiles);

  // minutes per day, coloured by area
  body.appendChild(mEl('h3', '', 'الدقايق كل يوم'));
  var chart = mEl('div', 'dChart'), maxSec = 600, fmt;
  try { fmt = new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }); } catch (e) { fmt = null; }
  week.forEach(function (day) { var x = dashSum(d.log, [day]); maxSec = Math.max(maxSec, x.sec); });
  week.forEach(function (day, i) {
    var x = dashSum(d.log, [day]), col = mEl('div', 'dCol');
    col.appendChild(mEl('span', 'dVal', x.sec ? dashMin(x.sec) : ''));
    var bar = mEl('div', 'dBar');
    bar.style.height = Math.max(x.sec ? 4 : 0, x.sec / maxSec * 72) + '%'; // room above for the minutes and below for the day
    AREAS.forEach(function (a) {
      if (!x.area[a] || !x.area[a][0]) return;
      var seg = mEl('div');
      seg.style.flexGrow = x.area[a][0]; seg.style.background = AREA_INFO[a][2];
      bar.appendChild(seg);
    });
    col.appendChild(bar);
    col.appendChild(mEl('span', 'dDay', i === 6 ? 'النهارده' : fmt ? fmt.format(day) : dayKey(day).slice(5)));
    chart.appendChild(col);
  });
  body.appendChild(chart);
  var legend = mEl('div', 'dLegend');
  AREAS.forEach(function (a) {
    if (!wk.area[a] || !wk.area[a][0]) return;
    var l = mEl('span', '', AREA_INFO[a][1]);
    var dot = mEl('i'); dot.style.background = AREA_INFO[a][2];
    l.insertBefore(dot, l.firstChild);
    legend.appendChild(l);
  });
  body.appendChild(legend);

  // each area: level now, minutes, right / wrong this week
  body.appendChild(mEl('h3', '', 'كل جزء'));
  ['read', 'write', 'math', 'speak'].forEach(function (a) {
    var v = wk.area[a] || [0, 0, 0, 0], row = mEl('div', 'dArea');
    row.appendChild(mEl('span', 'av', AREA_INFO[a][0]));
    var mid = mEl('div', 'nm');
    mid.appendChild(mEl('b', '', AREA_INFO[a][1]));
    var lv = dashLevel(d, a);
    if (lv) { var lvEl = mEl('small', '', lv); lvEl.dir = 'rtl'; mid.appendChild(lvEl); }
    row.appendChild(mid);
    var nums = mEl('span', 'dNums');
    if (v[0] || v[1] || v[2]) [['⏱', dashMin(v[0]) + ' د'], ['✔', mNumAr(v[1])], ['✘', mNumAr(v[2])]].forEach(function (n) {
      var s = mEl('span', '', n[0] + ' ' + n[1]); s.dir = 'rtl'; nums.appendChild(s);
    });
    else nums.textContent = 'مفيش الأسبوع ده';
    row.appendChild(nums);
    body.appendChild(row);
  });

  // what is still hard
  body.appendChild(mEl('h3', '', (girl ? 'محتاجة' : 'محتاج') + ' تمرين أكتر في'));
  var anyWeak = false;
  [['read', 'كلمات'], ['write', 'حروف'], ['math', 'حساب']].forEach(function (p) {
    var list = dashWeak(d, p[0]);
    if (!list.length) return;
    anyWeak = true;
    var box = mEl('div', 'dWeak');
    box.appendChild(mEl('span', 'dWeakT', AREA_INFO[p[0]][0] + ' ' + p[1]));
    var chips = mEl('div', 'chips');
    list.forEach(function (it) {
      var label = p[0] === 'math' ? (MLEVELS[(it.k | 0) - 1] ? MLEVELS[(it.k | 0) - 1].t() : it.k) : it.k;
      var c = mEl('span', 'chip' + (p[0] === 'math' ? ' txt' : ''), label);
      var n = mEl('small', '', '✘' + mNumAr(it.bad) + ' ✔' + mNumAr(it.ok)); n.dir = 'rtl';
      c.appendChild(n);
      chips.appendChild(c);
    });
    box.appendChild(chips);
    body.appendChild(box);
  });
  if (!anyWeak) body.appendChild(mEl('p', 'dEmpty', 'لسه مفيش حاجة صعبة عليه' + (girl ? 'ا' : '') + ' 👍'));
  else body.appendChild(mEl('p', 'hint', 'دي الحاجات اللي غلط فيها أكتر من مرة. جرّبوا تتمرنوا عليها سوا بصوت عالي، أو ارجعوا للدرس بتاعها من الإعدادات.'));
}
function dashOpen() { dashKid = pCur(); save(); dashRender(); $('dashOv').hidden = false; $('dashOv').scrollTop = 0; }
$('ppDash').onclick = dashOpen;
$('dashClose').onclick = function () { $('dashOv').hidden = true; };
