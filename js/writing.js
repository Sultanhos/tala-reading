// كتابة: letter writing, checked on the device.
'use strict';

/* ================= Schreiben: letter writing, checked on the device ================= */
// letters grouped by shape family; each letter is written twice per level (trace, then alone).
// Levels 8+: letter forms — 'ب>' means ب at the start, in the middle and at the end of a word (بـ ـبـ ـب)
var WLEVELS = [['ا','ب','ت','ث'], ['ج','ح','خ'], ['د','ذ','ر','ز'], ['س','ش','ص','ض'], ['ط','ظ','ع','غ'], ['ف','ق','ك','ل'], ['م','ن','ه','و','ي'],
  ['ب>','ت>'], ['ث>','ن>'], ['ي>','ف>'], ['ق>','ج>'], ['ح>','خ>'], ['س>','ش>'], ['ص>','ض>'], ['ط>','ظ>'], ['ع>','غ>'], ['ك>','ل>'], ['م>','ه>'],
  ['ا>','د>','ذ>','ر>','ز>','و>']];
var WINFO = { 'ا':['أَلِف','أَرْنَب','🐰'], 'ب':['بَاء','بَطَّة','🦆'], 'ت':['تَاء','تُفَّاحَة','🍎'], 'ث':['ثَاء','ثَعْلَب','🦊'],
  'ج':['جِيم','جَمَل','🐫'], 'ح':['حَاء','حِصَان','🐴'], 'خ':['خَاء','خَرُوف','🐑'], 'د':['دَال','دُبّ','🐻'], 'ذ':['ذَال','ذُرَة','🌽'],
  'ر':['رَاء','رَادْيُو','📻'], 'ز':['زَاي','زَرَافَة','🦒'], 'س':['سِين','سَمَكَة','🐟'], 'ش':['شِين','شَمْس','☀️'], 'ص':['صَاد','صَقْر','🦅'],
  'ض':['ضَاد','ضِفْدَع','🐸'], 'ط':['طَاء','طَائِرَة','✈️'], 'ظ':['ظَاء','ظَرْف','✉️'], 'ع':['عَيْن','عِنَب','🍇'], 'غ':['غَيْن','غَيْمَة','☁️'],
  'ف':['فَاء','فِيل','🐘'], 'ق':['قَاف','قِطَّة','🐱'], 'ك':['كَاف','كَلْب','🐶'], 'ل':['لَام','لَيْمُون','🍋'], 'م':['مِيم','مَوْز','🍌'],
  'ن':['نُون','نَحْلَة','🐝'], 'ه':['هَاء','هَدِيَّة','🎁'], 'و':['وَاو','وَرْدَة','🌹'], 'ي':['يَاء','يَد','✋'] };
var WALL = [].concat.apply([], WLEVELS.slice(0, 7)); // the 28 letters
S.wLevel = Math.min(WLEVELS.length, S.wLevel);
// letters that never join the next letter have only the end form (ـا)
var WNOJOIN = 'اأإآدذرزوة';
var WFORM_NAME = { i: 'فِي أَوَّلِ الكَلِمَةِ', m: 'فِي وَسَطِ الكَلِمَةِ', f: 'فِي آخِرِ الكَلِمَةِ' };
function wForms(ch) { return WNOJOIN.indexOf(ch) > -1 ? ['f'] : ['i', 'm', 'f']; }
// the letter as it is written in that place, with the joining line (ـ) that the child writes too
function wFormText(ch, f) { var T = '\u0640'; return f === 'i' ? ch + T : f === 'm' ? T + ch + T : f === 'f' ? T + ch : ch; }
// a word from the lessons (or the letter's picture word) with the letter in that place -> [before, letter, after, emoji]
var WWORDS = null;
function wExample(ch, f) {
  if (!WWORDS) {
    WWORDS = [];
    WALL.forEach(function (c) { WWORDS.push([WINFO[c][1], WINFO[c][2]]); });
    LESSONS.forEach(function (L) { L[1].forEach(function (w) { WWORDS.push([w, '']); }); });
  }
  for (var i = 0; i < WWORDS.length; i++) {
    var w = WWORDS[i][0], u = [];
    for (var k = 0; k < w.length; k++) { if (/[\u064B-\u0652\u0670]/.test(w[k]) && u.length) u[u.length - 1].t += w[k]; else u.push({ l: w[k], t: w[k] }); }
    for (var j = 0; j < u.length; j++) {
      if (u[j].l !== ch) continue;
      var joinsBefore = j > 0 && WNOJOIN.indexOf(u[j - 1].l) < 0, last = j === u.length - 1;
      var form = WNOJOIN.indexOf(ch) > -1 ? (joinsBefore ? 'f' : '') : last ? (joinsBefore ? 'f' : '') : (joinsBefore ? 'm' : 'i');
      if (form !== f) continue;
      var t = function (a, b) { return u.slice(a, b).map(function (x) { return x.t; }).join(''); };
      return [t(0, j), u[j].t, t(j + 1), WWORDS[i][1]];
    }
  }
  return null;
}
var WDOTS = { 'ب':1, 'ت':2, 'ث':3, 'ج':1, 'خ':1, 'ذ':1, 'ز':1, 'ش':3, 'ض':1, 'ظ':1, 'غ':1, 'ف':1, 'ق':2, 'ن':1, 'ي':2 };
var WFONT = '"Noto Naskh Arabic", "Amiri", "Traditional Arabic", serif';
// per strictness: tolerance factor, min share of ink on the letter, min share of the letter drawn, min share of each part
var WTOL = [[1, 0.85, 0.82, 0.6], [1.25, 0.8, 0.75, 0.55], [1.5, 0.72, 0.66, 0.45]];
var W = { queue: [], qi: 0, item: null, ch: null, mode: 'trace', strokes: [], cur: null, pid: null, locked: false, fails: 0, help: false,
          box: null, g: null, glyphs: {}, marks: null, timer: 0, started: false, fontReady: false, pen: 12, demo: 0 };

function wLetters() { return WLEVELS[S.wLevel - 1]; }
function wItems() {
  var l = wLetters(), a = [];
  [0, 1].forEach(function (pass) {
    l.forEach(function (c) {
      if (c.slice(-1) !== '>') { a.push(c + '#' + pass); return; }
      var ch = c.slice(0, -1);
      wForms(ch).forEach(function (f) { a.push(ch + '>' + f + '#' + pass); });
    });
  });
  return a;
}
function wLevelName(n) {
  var L = WLEVELS[n - 1], forms = L[0].slice(-1) === '>';
  return 'المستوى ' + mNumAr(n) + ':  ' + (forms ? 'أشكال ' + L.map(function (c) { return c.slice(0, -1); }).join(' ') : L.join(' '));
}
function wBuild() {
  var items = wItems();
  S.wDone = S.wDone.filter(function (k) { return items.indexOf(k) > -1; });
  var left = items.filter(function (k) { return S.wDone.indexOf(k) < 0; });
  W.queue = left.filter(function (k) { return /#0$/.test(k); }).concat(shuffle(left.filter(function (k) { return /#1$/.test(k); })));
  W.qi = 0;
}
function wModeFor(item) {
  var m = S.wHelp || 'auto';
  if (m === 'auto') return /#0$/.test(item) ? 'trace' : 'copy';
  return m;
}
function wSay(t) { popBubble($('wBubble'), t); }
function wPips() {
  var p = $('wPips'), items = wItems(); p.innerHTML = '';
  for (var i = 0; i < items.length; i++) {
    var d = document.createElement('div'), on = i < S.wDone.length;
    d.className = 'pip' + (on ? ' on' : '');
    d.textContent = on ? '⭐' : '';
    p.appendChild(d);
  }
}

/* ----- geometry helpers ----- */
function wChamfer(src, w, h, lab) {
  var n = w * h, d = new Float32Array(n), R = 1.4142, x, y, i;
  for (i = 0; i < n; i++) d[i] = src[i] ? 0 : 1e6;
  function rel(i, j, c) { if (d[j] + c < d[i]) { d[i] = d[j] + c; if (lab) lab[i] = lab[j]; } }
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = y * w + x;
    if (x > 0) rel(i, i - 1, 1);
    if (y > 0) { rel(i, i - w, 1); if (x > 0) rel(i, i - w - 1, R); if (x < w - 1) rel(i, i - w + 1, R); }
  }
  for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) {
    i = y * w + x;
    if (x < w - 1) rel(i, i + 1, 1);
    if (y < h - 1) { rel(i, i + w, 1); if (x < w - 1) rel(i, i + w + 1, R); if (x > 0) rel(i, i + w - 1, R); }
  }
  return d;
}
function wAt(arr, w, h, x, y) { // value at grid position, plus the distance outside the grid
  var xi = Math.floor(x), yi = Math.floor(y), out = 0;
  if (xi < 0) { out += -xi; xi = 0; } else if (xi >= w) { out += xi - w + 1; xi = w - 1; }
  if (yi < 0) { out += -yi; yi = 0; } else if (yi >= h) { out += yi - h + 1; yi = h - 1; }
  return { v: arr[yi * w + xi], out: out };
}
function wDt(arr, w, h, x, y) { var r = wAt(arr, w, h, x, y); return r.v + r.out; }
function wThin(src, w, h) { // Zhang-Suen thinning -> centre line of the letter
  var a = Uint8Array.from(src), del = [], changed = true, x, y, i;
  while (changed) {
    changed = false;
    for (var pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
        i = y * w + x; if (!a[i]) continue;
        var p2 = a[i - w], p3 = a[i - w + 1], p4 = a[i + 1], p5 = a[i + w + 1], p6 = a[i + w], p7 = a[i + w - 1], p8 = a[i - 1], p9 = a[i - w - 1];
        var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        var A = (!p2 && p3 ? 1 : 0) + (!p3 && p4 ? 1 : 0) + (!p4 && p5 ? 1 : 0) + (!p5 && p6 ? 1 : 0) + (!p6 && p7 ? 1 : 0) + (!p7 && p8 ? 1 : 0) + (!p8 && p9 ? 1 : 0) + (!p9 && p2 ? 1 : 0);
        if (A !== 1) continue;
        if (pass === 0 ? (!(p2 && p4 && p6) && !(p4 && p6 && p8)) : (!(p2 && p4 && p8) && !(p2 && p6 && p8))) del.push(i);
      }
      for (i = 0; i < del.length; i++) a[del[i]] = 0;
      if (del.length) changed = true;
    }
  }
  return a;
}
function wComps(mask, w, h) {
  var lab = new Int16Array(w * h).fill(-1), comps = [], st = [];
  for (var i = 0; i < mask.length; i++) if (mask[i] && lab[i] < 0) {
    var c = { area: 0, sx: 0, sy: 0, x0: w, y0: h, x1: 0, y1: 0 }, id = comps.length;
    comps.push(c); lab[i] = id; st.push(i);
    while (st.length) {
      var j = st.pop(), x = j % w, y = (j - x) / w;
      c.area++; c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var k = yy * w + xx;
        if (mask[k] && lab[k] < 0) { lab[k] = id; st.push(k); }
      }
    }
  }
  return { lab: lab, comps: comps };
}

/* ----- the letter: where it sits in the box, its parts, dots and centre line ----- */
var wMeasureCv = document.createElement('canvas'), wGridCv = document.createElement('canvas');
function wGlyph(ch) {
  if (W.glyphs[ch]) return W.glyphs[ch];
  var B = W.box, M = 600, c = wMeasureCv.getContext('2d'), i, x, y;
  wMeasureCv.width = M; wMeasureCv.height = M;
  c.font = '700 200px ' + WFONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#000';
  c.fillText(ch, 300, 380);
  var d = c.getImageData(0, 0, M, M).data, x0 = M, y0 = M, x1 = -1, y1 = -1;
  for (y = 0; y < M; y++) for (x = 0; x < M; x++) if (d[(y * M + x) * 4 + 3] > 100) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { x0 = 250; x1 = 350; y0 = 280; y1 = 380; }
  var gw = x1 + 1 - x0, gh = y1 + 1 - y0, m = Math.min(B.w, B.h), pad = m * 0.15;
  var k = Math.min((B.w - 2 * pad) / gw, (B.h - 2 * pad) / gh, m * 0.95 / 200);
  var fs = 200 * k, ox = B.w / 2 - ((x0 + x1 + 1) / 2 - 300) * k, oy = B.h / 2 - ((y0 + y1 + 1) / 2 - 380) * k;
  var cell = Math.max(B.w, B.h) / 96, GW = Math.ceil(B.w / cell), GH = Math.ceil(B.h / cell), n = GW * GH;
  wGridCv.width = GW; wGridCv.height = GH;
  var gc = wGridCv.getContext('2d');
  gc.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0);
  gc.font = '700 ' + fs + 'px ' + WFONT; gc.textAlign = 'center'; gc.textBaseline = 'alphabetic'; gc.fillStyle = '#000';
  gc.fillText(ch, ox, oy);
  var gd = gc.getImageData(0, 0, GW, GH).data, mask = new Uint8Array(n);
  for (i = 0; i < n; i++) mask[i] = gd[i * 4 + 3] > 60 ? 1 : 0;

  var size = Math.max(gw, gh) * k, u = size / 20, sizeC = size / cell;
  var cc = wComps(mask, GW, GH), comps = cc.comps, maxA = 0;
  comps.forEach(function (c) { if (c.area > maxA) maxA = c.area; });
  comps.forEach(function (c) {
    c.cx = (c.sx / c.area + 0.5) * cell; c.cy = (c.sy / c.area + 0.5) * cell;
    c.ignore = c.area < 3;
    c.dot = !c.ignore && c.area < maxA * 0.25 && Math.max(c.x1 - c.x0, c.y1 - c.y0) + 1 < sizeC * 0.42;
    c.diam = Math.max(c.x1 - c.x0, c.y1 - c.y0) * cell + cell;
    c.group = -1;
  });
  // the dots of a letter form one group with a known count (dots may melt together when drawn small);
  // other small marks (the little sign inside ك) count as one mark each
  var base = ch.replace(/\u0640/g, ''), groups = [], nd = WDOTS[base] || 0;
  comps.forEach(function (c, id) {
    if (!c.dot) return;
    var gi = nd && groups.length ? 0 : groups.length;
    if (!groups[gi]) groups.push({ ids: [] });
    groups[gi].ids.push(id); c.group = gi;
  });
  groups.forEach(function (gr) {
    var sx = 0, sy = 0, sp = 0, dm = 0;
    gr.ids.forEach(function (a) { sx += comps[a].cx; sy += comps[a].cy; dm = Math.max(dm, comps[a].diam);
      gr.ids.forEach(function (b) { sp = Math.max(sp, Math.hypot(comps[a].cx - comps[b].cx, comps[a].cy - comps[b].cy)); }); });
    gr.n = nd || 1; gr.cx = sx / gr.ids.length; gr.cy = sy / gr.ids.length; gr.spread = sp + dm;
  });
  var near = Int16Array.from(cc.lab), dt = wChamfer(mask, GW, GH, near);
  var sk = wThin(mask, GW, GH), body = [], hasPt = {};
  for (i = 0; i < n; i++) if (sk[i]) {
    var ci = cc.lab[i]; if (ci < 0 || comps[ci].dot || comps[ci].ignore) continue;
    x = i % GW; y = (i - x) / GW;
    body.push({ x: (x + 0.5) * cell, y: (y + 0.5) * cell, c: ci }); hasPt[ci] = 1;
  }
  comps.forEach(function (c, id) { if (!c.dot && !c.ignore && !hasPt[id]) body.push({ x: c.cx, y: c.cy, c: id }); });
  var bodyS = body;
  if (body.length > 260) { var step = body.length / 260; bodyS = []; for (i = 0; i < 260; i++) bodyS.push(body[Math.floor(i * step)]); }
  var g = { ch: ch, base: base, fs: fs, ox: ox, oy: oy, cell: cell, gw: GW, gh: GH, dt: dt, near: near, comps: comps, groups: groups, body: body, bodyS: bodyS,
            size: size, u: u, cx: B.w / 2, cy: B.h / 2, x0: ox + (x0 - 300) * k, y0: oy + (y0 - 380) * k, x1: ox + (x1 + 1 - 300) * k, y1: oy + (y1 + 1 - 380) * k };
  W.glyphs[ch] = g;
  return g;
}

/* ----- her writing ----- */
function wInkData(g) {
  var cell = g.cell, sp = cell * 0.6, all = [], sts = [], X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
  W.strokes.forEach(function (s) {
    var pts = [{ x: s[0].x, y: s[0].y }];
    for (var i = 1; i < s.length; i++) {
      var a = s[i - 1], b = s[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(L / sp);
      for (var j = 1; j <= n; j++) pts.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
    }
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, sx = 0, sy = 0;
    pts.forEach(function (p) { sx += p.x; sy += p.y; if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; });
    sts.push({ pts: pts, cx: sx / pts.length, cy: sy / pts.length, size: Math.max(x1 - x0, y1 - y0) });
    X0 = Math.min(X0, x0); Y0 = Math.min(Y0, y0); X1 = Math.max(X1, x1); Y1 = Math.max(Y1, y1);
    all = all.concat(pts);
  });
  var seed = new Uint8Array(g.gw * g.gh);
  all.forEach(function (p) {
    var x = Math.min(g.gw - 1, Math.max(0, Math.floor(p.x / cell))), y = Math.min(g.gh - 1, Math.max(0, Math.floor(p.y / cell)));
    seed[y * g.gw + x] = 1;
  });
  var sub = all;
  if (all.length > 220) { var st = all.length / 220; sub = []; for (var i = 0; i < 220; i++) sub.push(all[Math.floor(i * st)]); }
  return { pts: all, strokes: sts, sub: sub, dt: wChamfer(seed, g.gw, g.gh), size: Math.max(X1 - X0, Y1 - Y0), cx: (X0 + X1) / 2, cy: (Y0 + Y1) / 2 };
}

// how far her writing (moved/scaled by T) is from the letter, and the letter from her writing
function wCost(g, ink, T) {
  var cell = g.cell, s1 = 0, s2 = 0, CL = 8, i, p, sc = Math.sqrt(T.ax * T.ay);
  for (i = 0; i < ink.sub.length; i++) { p = ink.sub[i]; s1 += Math.min(CL, wDt(g.dt, g.gw, g.gh, (T.ax * p.x + T.bx) / cell, (T.ay * p.y + T.by) / cell)); }
  for (i = 0; i < g.bodyS.length; i++) { p = g.bodyS[i]; s2 += Math.min(CL, sc * wDt(ink.dt, g.gw, g.gh, (p.x - T.bx) / T.ax / cell, (p.y - T.by) / T.ay / cell)); }
  return s1 / ink.sub.length + s2 / Math.max(1, g.bodyS.length);
}
function wAdj(g, T, fx, fy, tx, ty) { return { ax: T.ax * fx, ay: T.ay * fy, bx: g.cx + fx * (T.bx - g.cx) + tx, by: g.cy + fy * (T.by - g.cy) + ty }; }
// line up her writing with the letter: try "as written" and "same size and centre", then fine-tune
function wFit(g, ink) {
  var s0 = g.size / Math.max(1, ink.size), cell = g.cell, best = null, bestC = Infinity;
  [{ ax: 1, ay: 1, bx: 0, by: 0 }, { ax: s0, ay: s0, bx: g.cx - s0 * ink.cx, by: g.cy - s0 * ink.cy }].forEach(function (T0) {
    var cur = T0, cc = Infinity;
    [0.85, 1, 1.18].forEach(function (s) {
      for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) {
        var T = wAdj(g, T0, s, s, i * 4 * cell, j * 4 * cell), c = wCost(g, ink, T);
        if (c < cc) { cc = c; cur = T; }
      }
    });
    [[0.08, 2], [0.04, 1], [0.02, 0.5]].forEach(function (st) {
      for (var it = 0; it < 10; it++) {
        var ds = st[0], dd = st[1] * cell, bm = null, bc = cc;
        [[1 + ds, 1, 0, 0], [1 - ds, 1, 0, 0], [1, 1 + ds, 0, 0], [1, 1 - ds, 0, 0], [1 + ds, 1 + ds, 0, 0], [1 - ds, 1 - ds, 0, 0],
         [1, 1, dd, 0], [1, 1, -dd, 0], [1, 1, 0, dd], [1, 1, 0, -dd]].forEach(function (mv) {
          var T = wAdj(g, cur, mv[0], mv[1], mv[2], mv[3]), rx = T.ax / T0.ax, ry = T.ay / T0.ay;
          if (rx < 0.75 || rx > 1.35 || ry < 0.75 || ry > 1.35 || rx / ry > 1.3 || ry / rx > 1.3) return;
          var c = wCost(g, ink, T);
          if (c < bc - 1e-6) { bc = c; bm = T; }
        });
        if (!bm) break;
        cur = bm; cc = bc;
      }
    });
    if (cc < bestC) { bestC = cc; best = cur; }
  });
  best.cost = bestC;
  return best;
}

function wAssess(g, ink, lenient) {
  var P = WTOL[lenient] || WTOL[1], f = P[0], u = g.u, cell = g.cell;
  if (!ink.pts.length) return { pass: false, reason: 'empty' };
  if (ink.size < g.size * 0.3) return { pass: false, reason: 'small' };
  var T = wFit(g, ink), sc = Math.sqrt(T.ax * T.ay);
  function tx(p) { return { x: (T.ax * p.x + T.bx) / cell, y: (T.ay * p.y + T.by) / cell }; }

  // dots: small marks next to a dot of the letter
  g.groups.forEach(function (gr) { gr.marks = []; });
  var isMark = {};
  ink.strokes.forEach(function (st, si) {
    if (st.size * sc >= g.size * 0.4) return;
    var q = tx({ x: st.cx, y: st.cy }), ci = wAt(g.near, g.gw, g.gh, q.x, q.y).v, comp = g.comps[ci];
    if (!comp || comp.group < 0) return;
    if (wDt(g.dt, g.gw, g.gh, q.x, q.y) * cell > 2.5 * u * f) return;
    g.groups[comp.group].marks.push(st); isMark[si] = 1;
  });
  var missG = [], manyG = [];
  g.groups.forEach(function (gr) {
    var seen = [], taps = true, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    gr.marks.forEach(function (m) {
      var mx = T.ax * m.cx + T.bx, my = T.ay * m.cy + T.by;
      if (m.size * sc > 0.6 * u) taps = false;
      if (!seen.some(function (s) { return Math.hypot(s[0] - mx, s[1] - my) < 0.6 * u; })) seen.push([mx, my]);
      m.pts.forEach(function (p) { var X = T.ax * p.x + T.bx, Y = T.ay * p.y + T.by; x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y); });
    });
    var cnt = seen.length;
    if (!cnt) missG.push(gr);
    else if (cnt > gr.n) manyG.push(gr);
    else if (cnt < gr.n && (taps || Math.max(x1 - x0, y1 - y0) < gr.spread * 0.5)) missG.push(gr); // a dash or "^" may stand for several dots
  });

  // is her ink on the letter?
  var inTol = 1.1 * u * f, onCnt = 0, extra = [];
  ink.strokes.forEach(function (st, si) {
    var on = 0;
    st.pts.forEach(function (p) { var q = tx(p); if (wDt(g.dt, g.gw, g.gh, q.x, q.y) * cell <= inTol) on++; });
    onCnt += on;
    if (!isMark[si] && on < st.pts.length * 0.5) extra.push(si);
  });
  var prec = onCnt / ink.pts.length;

  // is every part of the letter drawn?
  var covTol = 1.3 * u * f, got = 0, miss = [], per = {};
  g.body.forEach(function (k) {
    var d = sc * cell * wDt(ink.dt, g.gw, g.gh, (k.x - T.bx) / T.ax / cell, (k.y - T.by) / T.ay / cell);
    var pc = per[k.c] || (per[k.c] = [0, 0]); pc[1]++;
    if (d <= covTol) { got++; pc[0]++; } else miss.push(k);
  });
  var cov = got / Math.max(1, g.body.length);
  var partsOk = Object.keys(per).every(function (c) { return per[c][0] >= per[c][1] * P[3]; });

  var reason = null;
  if (cov < 0.5) reason = 'shape';
  else if (missG.length) reason = 'dots';
  else if (manyG.length) reason = 'many';
  else if (cov < P[2] || !partsOk) reason = 'shape';
  else if (prec < P[1] || extra.length) reason = 'messy';
  return { pass: !reason, reason: reason, cov: cov, prec: prec, T: T, cost: T.cost, miss: miss, missG: missG, manyG: manyG, extra: extra };
}

// does her writing match another letter clearly better?
function wLookalike(r, ink) {
  var best = null, bestC = Infinity, lenient = S.wLenient == null ? 1 : S.wLenient, ratio = [0.9, 0.8, 0.7][lenient] || 0.8;
  WALL.forEach(function (ch) {
    if (ch === W.ch || (W.form && wForms(ch).indexOf(W.form) < 0)) return;
    var r2 = wAssess(wGlyph(wFormText(ch, W.form)), ink, lenient);
    if (r2.pass && (!r || r2.cost < r.cost * ratio) && r2.cost < bestC) { bestC = r2.cost; best = ch; }
  });
  return best;
}

/* ----- drawing ----- */
function wLayout() {
  var cv = $('wInk'), r = cv.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  if (!w || !h) return false;
  if (W.box && W.box.w === w && W.box.h === h) return true;
  var dpr = Math.min(3, window.devicePixelRatio || 1);
  ['wGuide', 'wInk'].forEach(function (id) {
    var c = $(id); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  });
  if (W.box) {
    var kx = w / W.box.w, ky = h / W.box.h;
    W.strokes.forEach(function (s) { s.forEach(function (p) { p.x *= kx; p.y *= ky; }); });
  }
  W.box = { w: w, h: h };
  W.glyphs = {}; W.marks = null;
  W.pen = Math.max(8, Math.min(18, Math.min(w, h) * 0.042));
  if (W.ch) { W.g = wGlyph(W.txt); wDrawGuide(); wDrawInk(); }
  return true;
}
function wDrawGuide(reveal) {
  var c = $('wGuide').getContext('2d'), B = W.box, g = W.g;
  if (!B || !g) return;
  c.clearRect(0, 0, B.w, B.h);
  c.save();
  c.strokeStyle = 'rgba(123,92,255,.35)'; c.lineWidth = 2; c.setLineDash([8, 8]);
  c.beginPath(); c.moveTo(12, g.oy); c.lineTo(B.w - 12, g.oy); c.stroke();
  c.restore();
  if (W.mode === 'trace' || W.help || reveal != null) {
    c.save();
    if (reveal != null) { // demo: the letter appears in writing direction
      c.beginPath();
      if (g.base === 'ا') c.rect(0, 0, B.w, g.y0 + (g.y1 - g.y0) * reveal);
      else c.rect(g.x1 - (g.x1 - g.x0) * reveal, 0, B.w, B.h);
      c.clip();
    }
    c.font = '700 ' + g.fs + 'px ' + WFONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = reveal != null ? '#c9bbff' : '#ece6ff'; c.fillText(g.ch, g.ox, g.oy);
    c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeStyle = '#7b5cff'; c.strokeText(g.ch, g.ox, g.oy);
    c.restore();
  }
}
function wStroke(c, s) {
  if (s.length === 1) { c.beginPath(); c.arc(s[0].x, s[0].y, c.lineWidth / 2, 0, 7); c.fill(); return; }
  c.beginPath(); c.moveTo(s[0].x, s[0].y);
  for (var i = 1; i < s.length - 1; i++) c.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i + 1].x) / 2, (s[i].y + s[i + 1].y) / 2);
  c.lineTo(s[s.length - 1].x, s[s.length - 1].y); c.stroke();
}
function wDrawInk(color) {
  var c = $('wInk').getContext('2d'), B = W.box;
  if (!B) return;
  c.clearRect(0, 0, B.w, B.h);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = W.pen;
  c.strokeStyle = c.fillStyle = color || '#2b2350';
  W.strokes.forEach(function (s) { wStroke(c, s); });
  var mk = W.marks;
  if (!mk) return;
  c.strokeStyle = c.fillStyle = '#ff6b6b';
  (mk.strokes || []).forEach(function (i) { if (W.strokes[i]) wStroke(c, W.strokes[i]); });
  (mk.pts || []).forEach(function (p) { c.beginPath(); c.arc(p.x, p.y, Math.max(3, W.pen * 0.3), 0, 7); c.fill(); });
  c.lineWidth = 3; c.setLineDash([6, 5]);
  (mk.rings || []).forEach(function (p) { c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.stroke(); });
  c.setLineDash([]);
}

/* ----- finger / pen input ----- */
function wPt(e) {
  var r = $('wInk').getBoundingClientRect();
  return { x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)) };
}
(function () {
  var cv = $('wInk');
  cv.addEventListener('pointerdown', function (e) {
    if (W.locked || W.pid !== null || !W.g) return;
    e.preventDefault();
    wStopDemo();
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    W.pid = e.pointerId;
    if (W.marks) { W.marks = null; wDrawInk(); }
    var p = wPt(e); W.cur = [p]; W.strokes.push(W.cur);
    var c = cv.getContext('2d');
    c.fillStyle = '#2b2350'; c.beginPath(); c.arc(p.x, p.y, W.pen / 2, 0, 7); c.fill();
    $('wNote').textContent = '';
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== W.pid || !W.cur) return;
    e.preventDefault();
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!evs.length) evs = [e];
    var c = cv.getContext('2d'), last = W.cur[W.cur.length - 1];
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = W.pen; c.strokeStyle = '#2b2350';
    c.beginPath(); c.moveTo(last.x, last.y);
    evs.forEach(function (ev) {
      var p = wPt(ev);
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
      W.cur.push(p); c.lineTo(p.x, p.y); last = p;
    });
    c.stroke();
  });
  function end(e) { if (e.pointerId !== W.pid) return; W.pid = null; W.cur = null; wDrawInk(); }
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('lostpointercapture', end);
})();

/* ----- flow ----- */
function wNext() {
  clearTimeout(W.timer); wStopDemo();
  if (W.qi >= W.queue.length) wBuild();
  W.item = W.queue[W.qi++];
  var key = W.item.split('#')[0].split('>');
  W.ch = key[0]; W.form = key[1] || ''; W.txt = wFormText(W.ch, W.form); W.mode = wModeFor(W.item);
  W.strokes = []; W.cur = null; W.pid = null; W.locked = false; W.fails = 0; W.help = false; W.marks = null;
  var info = WINFO[W.ch];
  $('wCard').className = 'card';
  $('wReward').classList.remove('show');
  $('wCheck').disabled = false; $('wUndo').disabled = false; $('wClear').disabled = false;
  $('wHear').classList.remove('callout');
  $('wNote').textContent = '';
  $('wParentOk').hidden = !S.alwaysOk;
  $('wModel').hidden = W.mode === 'trace';
  $('wModel').textContent = W.mode === 'memory' ? '❓' : W.txt;
  var wd = $('wWord'), ex = W.form ? wExample(W.ch, W.form) : null, emo = info[2];
  wd.innerHTML = '';
  if (W.mode !== 'memory') {
    // the picture word with its first letter marked, or for a letter form a word with the letter in that place
    if (!ex) { var m = info[1].match(/^.[ً-ْ]*/)[0]; ex = W.form ? null : ['', m, info[1].slice(m.length), info[2]]; }
    if (ex) {
      var t = document.createElement('span');
      [[ex[0], ''], [ex[1], 'first'], [ex[2], '']].forEach(function (p) { if (!p[0]) return; var sp = document.createElement('span'); sp.className = p[1]; sp.textContent = p[0]; t.appendChild(sp); });
      wd.appendChild(t);
      emo = ex[3];
    }
  }
  if (emo) { var em = document.createElement('span'); em.className = 'em'; em.textContent = emo; wd.appendChild(em); }
  if (wLayout()) { W.g = wGlyph(W.txt); wDrawGuide(); wDrawInk(); }
  var where = W.form ? ' ' + WFORM_NAME[W.form] : '';
  wSay(W.mode === 'memory' ? 'اِسْتَمِعِي وَاكْتُبِي 🔊' : (W.mode === 'trace' ? 'اُكْتُبِي فَوْقَ الحَرْفِ: ' : 'اُكْتُبِي: ') + info[0] + where + ' ✏️');
  wPips(); renderHud();
  if (W.mode === 'memory') setTimeout(wSpeak, 300);
}
function wSpeak() {
  if (!window.speechSynthesis || !W.ch) return;
  try {
    window.speechSynthesis.cancel();
    var info = WINFO[W.ch], where = W.form ? ' ' + WFORM_NAME[W.form] : '';
    var u = new SpeechSynthesisUtterance(W.mode === 'memory' ? info[0] + where : info[0] + where + '، ' + info[1]);
    u.lang = 'ar-SA'; u.rate = 0.6;
    window.speechSynthesis.speak(u);
    $('wHear').classList.remove('callout');
  } catch (e) {}
}
function wCheck() {
  if (W.locked || !W.g) return;
  wStopDemo();
  if (!W.strokes.length) { soundTry(); wSay('اُكْتُبِي الحَرْفَ أَوَّلاً ✏️'); return; }
  var lenient = S.wLenient == null ? 1 : S.wLenient, g = W.g, ink = wInkData(g), r = wAssess(g, ink, lenient);
  if (r.pass) { var o = wLookalike(r, ink); if (o) { r.pass = false; r.reason = 'like'; r.like = o; } }
  else if (r.reason === 'shape' || r.reason === 'messy') { r.like = wLookalike(null, ink); if (r.like) r.reason = 'like'; }
  if (r.cov != null) $('wNote').textContent = 'الحرف مكتمل ' + Math.round(r.cov * 100) + '٪  ·  على الحرف ' + Math.round(r.prec * 100) + '٪' + (g.groups.length ? '  ·  النقاط ' + (r.missG.length || r.manyG.length ? '✘' : '✔') : '');
  if (r.pass) { wSuccess(); return; }
  wFail(r);
}
function wFail(r) {
  W.fails++;
  track('write', W.txt, false);
  soundTry();
  var T = r.T, name = WINFO[W.ch][0];
  function back(p) { return { x: (p.x - T.bx) / T.ax, y: (p.y - T.by) / T.ay }; }
  W.marks = null;
  if (r.reason === 'dots' || r.reason === 'many') {
    W.marks = { rings: (r.reason === 'dots' ? r.missG : r.manyG).map(function (gr) {
      var p = back({ x: gr.cx, y: gr.cy }); p.r = (gr.spread / 2 + W.g.u) / Math.sqrt(T.ax * T.ay); return p; }) };
  } else if (r.reason === 'shape') {
    W.marks = { pts: r.miss.filter(function (k, i) { return i % 2 === 0; }).map(back) };
  } else if (r.reason === 'messy') {
    W.marks = { strokes: r.extra };
  }
  wDrawInk();
  var msg = {
    empty: 'اُكْتُبِي الحَرْفَ أَوَّلاً ✏️',
    small: 'اُكْتُبِي الحَرْفَ أَكْبَرَ 🔍',
    dots: r.missG && r.missG.length && r.missG[0].n === 1 ? 'أَيْنَ النُّقْطَة؟ 🔴' : 'أَيْنَ النُّقَاط؟ 🔴',
    many: 'نُقَاطٌ كَثِيرَة! عُدِّي النُّقَاط 😊',
    shape: 'أَكْمِلِي الحَرْفَ ✏️',
    messy: W.mode === 'trace' ? 'اُكْتُبِي عَلَى الحَرْفِ ✏️' : 'حَاوِلِي مَرَّةً أُخْرَى 💪',
    like: r.like ? 'هَذَا يُشْبِهُ «' + WINFO[r.like][0] + '» 😊 اُكْتُبِي «' + name + '»' : ''
  }[r.reason] || 'حَاوِلِي مَرَّةً أُخْرَى 💪';
  wSay(msg);
  if (W.fails >= 2) {
    $('wParentOk').hidden = false;
    if (W.mode !== 'trace' && !W.help) { W.help = true; wDrawGuide(); }
  }
  if (W.fails >= 3) $('wHear').classList.add('callout');
}
function wSuccess() {
  if (W.locked) return;
  W.locked = true; W.marks = null; wStopDemo();
  wDrawInk('#1fae6f');
  $('wCard').className = 'card good';
  $('wReward').textContent = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  $('wReward').classList.add('show');
  $('wCheck').disabled = true; $('wUndo').disabled = true; $('wClear').disabled = true;
  $('wParentOk').hidden = true;
  wSay(PRAISE[Math.floor(Math.random() * PRAISE.length)] + ' يَا ' + S.name + '! 🎉');
  soundGood(); confetti(14);
  track('write', W.txt, true);
  if (S.wDone.indexOf(W.item) < 0) S.wDone.push(W.item);
  if (S.wDone.length >= wItems().length) {
    var fin = S.wLevel, wrap = fin >= WLEVELS.length;
    S.stars++; S.wDone = []; trackStar('write');
    S.wLevel = wrap ? 1 : fin + 1;
    W.queue = []; W.qi = 0;
    save();
    W.timer = setTimeout(function () { wLevelUp(fin, wrap); }, 1500);
  } else {
    save();
    W.timer = setTimeout(wNext, 2300);
  }
  wPips(); renderHud();
}
function wLevelUp(fin, wrap) {
  luMode = 'write';
  soundStar(); confetti(40);
  $('luTitle').textContent = gx('برافو! خلصتي مستوى الكتابة ' + mNumAr(fin));
  $('luLonger').hidden = !wrap;
  $('luLonger').textContent = gx('بقيتي تكتبي كل الحروف! هنبدأ تاني من أول مستوى.');
  $('luGo').textContent = 'المستوى ' + mNumAr(S.wLevel) + ' ◀';
  $('levelUp').hidden = false;
  var pill = $('starsPill');
  pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  wPips(); renderHud();
  $('luGo').focus();
}
// 💡 show me: the letter appears in writing direction with a moving pencil
function wStopDemo() {
  if (!W.demo) return;
  cancelAnimationFrame(W.demo); W.demo = 0;
  $('wPen').hidden = true;
  wDrawGuide();
}
function wDemo() {
  if (!W.g || W.locked) return;
  wStopDemo();
  var g = W.g, t0 = performance.now(), dur = 1600, pen = $('wPen');
  pen.hidden = false;
  function step(now) {
    var k = Math.min(1, (now - t0) / dur);
    wDrawGuide(k);
    if (g.base === 'ا') { pen.style.left = g.cx + 'px'; pen.style.top = (g.y0 + (g.y1 - g.y0) * k) + 'px'; }
    else { pen.style.left = (g.x1 - (g.x1 - g.x0) * k) + 'px'; pen.style.top = g.oy + 'px'; }
    if (k < 1) W.demo = requestAnimationFrame(step);
    else { W.demo = 0; setTimeout(function () { if (!W.demo) { pen.hidden = true; if (!W.help && W.mode !== 'trace') W.help = true; wDrawGuide(); } }, 500); }
  }
  W.demo = requestAnimationFrame(step);
}
function wEnter() {
  function go() {
    if (!W.started) { W.started = true; wBuild(); wNext(); }
    else { wLayout(); wPips(); }
  }
  if (W.fontReady || !document.fonts || !document.fonts.load) { W.fontReady = true; go(); return; }
  var done = false;
  function fin() { if (done) return; done = true; W.fontReady = true; W.glyphs = {}; go(); }
  document.fonts.load('700 100px "Noto Naskh Arabic"', WALL.join('')).then(fin, fin);
  setTimeout(fin, 3000);
}
$('wCheck').onclick = wCheck;
$('wHear').onclick = wSpeak;
$('wShow').onclick = wDemo;
$('wParentOk').onclick = wSuccess;
$('wUndo').onclick = function () { if (W.locked) return; W.strokes.pop(); W.marks = null; wDrawInk(); };
$('wClear').onclick = function () { if (W.locked) return; W.strokes = []; W.marks = null; wDrawInk(); };
$('wSkip').onclick = function () {
  if (W.locked) return;
  if (W.item && W.qi >= W.queue.length) wBuild(); // push the skipped letter to the end of the queue
  else if (W.item) W.queue.push(W.item);
  wNext();
};
if (window.ResizeObserver) new ResizeObserver(function () { if (view === 'write' && W.started) wLayout(); }).observe($('writeBox'));
else window.addEventListener('resize', function () { if (view === 'write' && W.started) wLayout(); });
for (var wl = 1; wl <= WLEVELS.length; wl++) {
  var wo = document.createElement('option');
  wo.value = wl; wo.textContent = wLevelName(wl);
  $('wLvlSel').appendChild(wo);
}
$('wLvlSel').onchange = function () { S.wLevel = parseInt(this.value, 10); S.wDone = []; save(); W.queue = []; W.qi = 0; if (W.started) { wBuild(); wNext(); } else wPips(); renderHud(); };
$('wHelpSel').onchange = function () { S.wHelp = this.value; save(); if (W.started && !W.locked) { W.mode = wModeFor(W.item); W.qi--; wNext(); } };
$('wStrictSel').onchange = function () { S.wLenient = parseInt(this.value, 10); save(); };
