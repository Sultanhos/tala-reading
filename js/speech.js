// نطق: German S / Z training and game with the on-device S detector.
'use strict';

/* ================= Sprechen: S / Z training + game (German) ================= */
// S and Z words mixed together: [text, picture, needed words (each with accepted spellings)]
var POOL = [
  ['Sonne','☀️',[['sonne']]], ['Sand','🏖️',[['sand']]], ['Suppe','🍲',[['suppe']]], ['Seife','🧼',[['seife']]],
  ['Sofa','🛋️',[['sofa']]], ['Salat','🥗',[['salat']]], ['Socke','🧦',[['socke']]], ['Wasser','💧',[['wasser']]],
  ['Tasse','☕',[['tasse']]], ['Haus','🏠',[['haus']]], ['Maus','🐭',[['maus']]], ['Eis','🍦',[['eis']]],
  ['Bus','🚌',[['bus']]], ['Glas','🥛',[['glas']]], ['Nase','👃',[['nase']]], ['Hase','🐰',[['hase']]],
  ['Zahn','🦷',[['zahn','zahne']]], ['Zebra','🦓',[['zebra']]], ['Zug','🚂',[['zug']]], ['Zitrone','🍋',[['zitrone']]],
  ['Zelt','⛺',[['zelt']]], ['Zucker','🍬',[['zucker']]], ['Katze','🐱',[['katze']]], ['Kerze','🕯️',[['kerze']]],
  ['Herz','❤️',[['herz']]], ['Pilz','🍄',[['pilz']]], ['Zirkus','🎪',[['zirkus','circus']]], ['Cent','🪙',[['cent','zent','sent']]],
  ['Ziege','🐐',[['ziege']]], ['Zwiebel','🧅',[['zwiebel']]], ['Blitz','⚡',[['blitz']]], ['Salz','🧂',[['salz']]],
  ['Sonne und Sand','☀️ 🏖️',[['sonne'],['sand']]],
  ['Zwei Zebras','2️⃣ 🦓',[['zwei','2'],['zebras','zebra']]],
  ['Sieben Zitronen','7️⃣ 🍋',[['sieben','7'],['zitronen','zitrone']]],
  ['Zucker und Salz','🍬 🧂',[['zucker'],['salz']]],
  ['Die Maus im Haus','🐭 🏠',[['maus'],['haus']]],
  ['Eis im Sand','🍦 🏖️',[['eis'],['sand']]],
  ['Zehn Zähne','🔟 🦷',[['zehn','10'],['zahne','zahn']]],
  ['Der Zug fährt zum Zoo','🚂',[['zug'],['zoo']]],
  ['Die Katze sitzt auf dem Sofa','🐱 🛋️',[['katze'],['sitzt'],['sofa']]],
  ['Wasser und Seife','💧 🧼',[['wasser'],['seife']]]
];
// one question is picked per level (5 levels per round); needs = words she has to say
var QBANK = [
  [ {q:'Was strahlt am Himmel und macht warm?', needs:[['sonne']], p:'☀️'},
    {q:'Welches Tier hat schwarze und weiße Streifen?', needs:[['zebra']], p:'🦓'},
    {q:'Woraus baut man am Strand eine Burg?', needs:[['sand']], p:'🏖️'},
    {q:'Was hast du im Mund und putzt du jeden Abend?', needs:[['zahn','zahne']], p:'🦷'} ],
  [ {q:'Was ist nass und man kann darin schwimmen?', needs:[['wasser']], p:'💧'},
    {q:'Welches kleine Tier frisst gern Käse?', needs:[['maus']], p:'🐭'},
    {q:'Womit fährt man mit vielen Leuten in die Stadt?', needs:[['bus']], p:'🚌'},
    {q:'Was ist kalt und süß und schmeckt im Sommer?', needs:[['eis']], p:'🍦'} ],
  [ {q:'Welches Tier sagt miau?', needs:[['katze','kater']], p:'🐱'},
    {q:'Was ist gelb und schmeckt sauer?', needs:[['zitrone']], p:'🍋'},
    {q:'Was fährt auf Schienen und macht tuut tuut?', needs:[['zug']], p:'🚂'},
    {q:'Was brennt auf dem Geburtstagskuchen?', needs:[['kerze']], p:'🕯️'} ],
  [ {q:'Was ist weiß und süß und kommt in den Tee?', needs:[['zucker']], p:'🍬'},
    {q:'Was streut man auf die Pommes? Es ist weiß und salzig.', needs:[['salz']], p:'🧂'},
    {q:'Was siehst du? Sag beide Wörter!', needs:[['sonne'],['sand']], p:'☀️ 🏖️', show:true},
    {q:'Was siehst du? Sag beide Wörter!', needs:[['maus'],['haus']], p:'🐭 🏠', show:true},
    {q:'Was siehst du? Sag beide Wörter!', needs:[['zitrone'],['zucker']], p:'🍋 🍬', show:true} ],
  [ {q:'Zähle von sechs bis acht.', needs:[['sechs','6'],['sieben','7']], p:'6️⃣ 7️⃣ 8️⃣'},
    {q:'Zähle von eins bis drei.', needs:[['eins','1'],['zwei','2']], p:'1️⃣ 2️⃣ 3️⃣'},
    {q:'Sag nach: Sieben Zebras sitzen im Sand.', needs:[['sieben','7'],['zebras','zebra'],['sitzen','sitzt'],['sand']], p:'7️⃣ 🦓 🏖️'},
    {q:'Sag nach: Zwei Katzen sitzen auf dem Sofa.', needs:[['zwei','2'],['katzen','katze'],['sitzen','sitzt'],['sofa']], p:'2️⃣ 🐱 🛋️'} ]
];

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function feedback(n) {
  if (n >= 9) return 'Super, ganz klar gesprochen! 🌟';
  if (n >= 7) return 'Sehr gut! 👏';
  if (n >= 4) return 'Gut! Noch einmal mit der Schlangen-Zunge 🐍';
  return 'Fast! Zähne zusammen, Zunge hinter die Zähne 🐍';
}

function speakDe(text, rate) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; u.rate = rate || 0.85; u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ----- S-Detektor: records her word and measures the S / Z sound itself -----
   Speech recognition only hears *which* word was said and is built to ignore a lisp, so it cannot judge the S.
   Instead the raw sound is analysed: a clear S is a loud, sharp, high hiss; a lisp (tongue between the teeth)
   makes it weak and flat, a lateral lisp ("slushy" S) makes it lower. Every parent rating (😀 / 😕) is kept
   as an example of HER good and HER lisped S, so the detector adapts to her voice and to this phone. */
var SREC = { on: false };
function sRecord(btn, h) {
  if (SREC.on) { sRecStop(false); return; } // second tap: stop and check now
  stopAll();
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AC) { h.error('unsupported'); return; }
  SREC = { on: true, btn: btn, h: h, chunks: [], len: 0, sr: 48000, nf: 0, nfN: 0, voiced: false, quietMs: 0 };
  var me = SREC;
  // create and wake the audio engine right inside the tap (Safari only allows that from a tap)
  try { me.ctx = new AC(); if (me.ctx.resume) me.ctx.resume(); } catch (e) { me.on = false; h.error('unsupported'); return; }
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
    if (!me.on) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
    me.stream = stream;
    setTimeout(function () { // no sound arriving at all: don't leave the button stuck
      if (me.on && SREC === me && me.len === 0) { sRecStop(true); h.error('nosound'); }
    }, 3000);
    var go = function () {
      if (!me.on) return;
      var src = me.ctx.createMediaStreamSource(stream), proc = me.ctx.createScriptProcessor(2048, 1, 1), mute = me.ctx.createGain();
      mute.gain.value = 0;
      src.connect(proc); proc.connect(mute); mute.connect(me.ctx.destination);
      me.proc = proc; me.sr = me.ctx.sampleRate;
      proc.onaudioprocess = function (e) {
        if (!me.on) return;
        var c = new Float32Array(e.inputBuffer.getChannelData(0)), s = 0, i;
        me.chunks.push(c); me.len += c.length;
        for (i = 0; i < c.length; i++) s += c[i] * c[i];
        var rms = Math.sqrt(s / c.length), el = me.len / me.sr;
        if (el < 0.25) { me.nf += rms; me.nfN++; return; } // first quarter second: room noise
        var nf = Math.max(me.nf / Math.max(1, me.nfN), 2e-4);
        if (rms > nf * 4) { me.voiced = true; me.quietMs = 0; } else if (me.voiced) me.quietMs += c.length / me.sr * 1000;
        if ((me.voiced && me.quietMs > 900) || el > 6 || (!me.voiced && el > 4)) sRecStop(false);
      };
      btn.classList.add('on'); h.start();
    };
    if (me.ctx.state === 'suspended' && me.ctx.resume) me.ctx.resume().then(go, go); else go();
  }, function () { sRecStop(true); h.error('not-allowed'); });
}
function sRecStop(abort) {
  var me = SREC;
  if (!me.on) return;
  me.on = false;
  try { if (me.proc) { me.proc.onaudioprocess = null; me.proc.disconnect(); } } catch (e) {}
  try { if (me.stream) me.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
  try { if (me.ctx && me.ctx.close) me.ctx.close(); } catch (e) {}
  if (me.btn) me.btn.classList.remove('on');
  if (abort) return;
  var x = new Float32Array(me.len), o = 0;
  me.chunks.forEach(function (c) { x.set(c, o); o += c.length; });
  var a = sAnalyse(x, me.sr);
  if (a.speech) me.h.result(a); else me.h.none();
}

function sFft(re, im) {
  var n = re.length, i, j, k, t, bit;
  for (i = 1, j = 0; i < n; i++) {
    for (bit = n >> 1; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (var len = 2; len <= n; len <<= 1) {
    var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (i = 0; i < n; i += len) {
      var cr = 1, ci = 0;
      for (k = 0; k < half; k++) {
        var a = i + k, b = a + half, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function sPct(arr, p) { var a = arr.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0; }
// -> { speech, sib, feat: [centre kHz-ish (Hz), peak (Hz), flatness 0-1, strength vs. vowels (dB)], dur }
function sAnalyse(x, sr) {
  var N = 256; while (N < sr * 0.02) N *= 2; // ~20 ms frames
  var hop = N >> 1, bw = sr / N, top = Math.min(11000, sr / 2 * 0.95), kTop = Math.floor(top / bw);
  var k80 = Math.ceil(80 / bw), k1 = Math.round(1000 / bw), k2 = Math.round(2000 / bw), k25 = Math.round(2500 / bw), k35 = Math.round(3500 / bw);
  var win = new Float64Array(N), re = new Float64Array(N), im = new Float64Array(N), fr = [], i, k;
  for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  for (var s = 0; s + N <= x.length; s += hop) {
    for (i = 0; i < N; i++) { re[i] = x[s + i] * win[i]; im[i] = 0; }
    sFft(re, im);
    var P = new Float32Array(kTop + 1), lo = 0, mid = 0, hi = 0;
    for (k = k80; k <= kTop; k++) { var p = re[k] * re[k] + im[k] * im[k]; P[k] = p; if (k < k1) lo += p; else if (k < k35) mid += p; else hi += p; }
    fr.push({ lo: lo, mid: mid, hi: hi, tot: lo + mid + hi, P: P });
  }
  var res = { speech: false, sib: false, lowRate: top < 7000 };
  if (fr.length < 8) return res;
  var totNF = Math.max(sPct(fr.map(function (f) { return f.tot; }), 0.1), 1e-12);
  var hiNF = Math.max(sPct(fr.map(function (f) { return f.hi; }), 0.1), 1e-14);
  var sp = fr.filter(function (f) { return f.tot > totNF * 30; });
  if (sp.length < 6) return res;
  res.speech = true;
  var vref = Math.max(sPct(sp.map(function (f) { return f.lo + f.mid; }), 0.9), 1e-20);
  // hiss frames: high band clearly above the room noise, more high than mid energy (vowels are the other way round), not inaudibly weak
  var flag = fr.map(function (f) { return f.hi > hiNF * 10 && f.hi > f.mid && f.hi > vref * 1e-3; });
  for (i = 1; i < flag.length - 1; i++) if (!flag[i] && flag[i - 1] && flag[i + 1]) flag[i] = true;
  var sib = [], run = [], runs = 0;
  for (i = 0; i <= fr.length; i++) {
    if (i < fr.length && flag[i]) run.push(fr[i]);
    else { if (run.length >= 3) { sib = sib.concat(run); runs++; } run = []; }
  }
  res.runs = runs; // separate hisses (Siii – Saaa – Sooo has three)
  if (!sib.length) return res;
  res.sib = true;
  var M = new Float64Array(kTop + 1), hiSum = 0, num = 0, den = 0, lg = 0, cnt = 0;
  sib.forEach(function (f) { for (k = k2; k <= kTop; k++) M[k] += f.P[k]; hiSum += f.hi; });
  for (k = k2; k <= kTop; k++) { num += k * bw * M[k]; den += M[k]; lg += Math.log(M[k] + 1e-30); cnt++; }
  var h = Math.max(1, Math.round(250 / bw)), best = 0, peak = 0;
  for (k = k25; k <= kTop; k++) {
    var a = 0;
    for (var j = Math.max(k2, k - h); j <= Math.min(kTop, k + h); j++) a += M[j];
    if (a > best) { best = a; peak = k * bw; }
  }
  res.feat = [num / den, peak, Math.exp(lg / cnt) / (den / cnt), 10 * Math.log10(hiSum / sib.length / vref)];
  res.dur = sib.length * hop / sr;
  return res;
}

// starting guess for a child's clear S vs. a lisped S; replaced step by step by her own rated examples
var S_DEF = { g: [6800, 7000, 0.65, -12], b: [4800, 4000, 0.9, -25], sd: [800, 1300, 0.1, 4] };
function sModel() {
  var ex = S.sEx || [], G = ex.filter(function (e) { return e.y >= 9; }), B = ex.filter(function (e) { return e.y <= 4; }), m0 = 2;
  function mean(list, def) { return def.map(function (d, i) { return (m0 * d + list.reduce(function (a, e) { return a + e.f[i]; }, 0)) / (m0 + list.length); }); }
  var mg = mean(G, S_DEF.g), mb = mean(B, S_DEF.b), sd = S_DEF.sd.slice();
  if (G.length + B.length >= 6) sd = sd.map(function (fl, i) {
    var ss = 0, n = 0;
    [[G, mg], [B, mb]].forEach(function (c) { c[0].forEach(function (e) { ss += Math.pow(e.f[i] - c[1][i], 2); n++; }); });
    return Math.max(fl * 0.5, Math.sqrt(ss / Math.max(1, n - 2)));
  });
  // each measurement counts as much as it separates her good S from her lisped S
  var w = mg.map(function (g, i) { return (g - mb[i]) / (sd[i] * sd[i]); }), d = 0;
  w.forEach(function (wi, i) { d += wi * (mg[i] - mb[i]); });
  return { mg: mg, mb: mb, w: w, d: d, nG: G.length, nB: B.length };
}
function sScore(a) {
  if (!a.sib) return 1; // she spoke, but no clear hiss at all
  var m = sModel(), t = 0.5;
  if (m.d > 1e-9) { t = 0; m.w.forEach(function (wi, i) { t += wi * (a.feat[i] - m.mb[i]); }); t /= m.d; }
  return Math.round(10 * clamp01(t));
}
// a parent rating teaches the detector (the phone's guess was made before, so the agreement count is fair)
function sLearn(a, v) {
  if (!a) return;
  S.sHist = (S.sHist || []).concat([[a.score, v]]).slice(-20);
  if (a.feat && (v >= 9 || v <= 4)) {
    S.sEx = (S.sEx || []).concat([{ f: a.feat.map(function (x) { return Math.round(x * 100) / 100; }), y: v }]);
    var good = S.sEx.filter(function (e) { return e.y >= 9; }).slice(-30), bad = S.sEx.filter(function (e) { return e.y <= 4; }).slice(-30);
    S.sEx = good.concat(bad);
  }
  save();
}
function sInfo(a, withScore) {
  if (!a) return '';
  var t = a.sib ? 'S-Höhe ' + (a.feat[0] / 1000).toFixed(1) + ' kHz  ·  S-Stärke ' + Math.round(a.feat[3]) + ' dB' : 'Kein klares S gefunden';
  if (withScore) t = '📱 Handy: ' + a.score + ' / 10  ·  ' + t;
  if (a.lowRate) t += '  ·  ميكروفون ضعيف الجودة';
  return t;
}
function sStatus() {
  var ex = S.sEx || [], g = ex.filter(function (e) { return e.y >= 9; }).length, b = ex.length - g, h = S.sHist || [];
  var agree = h.filter(function (p) { return (p[1] >= 10) === (p[0] >= 7); }).length;
  var t = 'كاشف حرف S اتعلم من ' + g + ' تقييم 😀 و' + b + ' تقييم 😕.';
  if (h.length) t += ' اتفق معكم في ' + agree + ' من آخر ' + h.length + ' تقييم.';
  if (g < 5 || b < 5) t += ' قيّموا ٥ على الأقل من كل نوع في وضع «الأهل» قبل الاعتماد على وضع «التليفون».';
  return t;
}
function deErr(code, say, note) {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    say('Das Mikrofon ist aus 🔇');
    note('الميكروفون مقفول. افتحوا اللعبة من عنوانها مباشرة واسمحوا بالميكروفون.');
  } else if (code === 'unsupported') {
    say('Hier geht das Mikrofon nicht 🔇');
    note('هذا المتصفح لا يستطيع التسجيل من الميكروفون. استخدموا كروم أو إيدج أو سفاري.');
  } else if (code !== 'aborted') {
    say('Nochmal versuchen 🎤');
  }
}
function sMarker(id, score) { $(id).style.left = (6 + clamp01(score / 10) * 88) + '%'; }

/* ----- training (S and Z mixed) ----- */
var TIP_DE = 'Zähne fast zusammen, Zunge hinter die Zähne: ssss 🐍  ·  bei Z: tssss 🦓';
var TIP_EN = 'الأسنان شبه مقفولة، وطرف اللسان يفضل ورا الأسنان (مش بينها). S = صفير رفيع ومستمر. Z = «ت» سريعة وبعدها الصفير.';
var tRound = [], tIdx = 0, tDone = {};
function tNewRound() {
  var singles = shuffle(POOL.filter(function (x) { return x[0].indexOf(' ') < 0; })).slice(0, 7);
  var phrases = shuffle(POOL.filter(function (x) { return x[0].indexOf(' ') > -1; })).slice(0, 3);
  tRound = shuffle(singles.concat(phrases)); tIdx = 0; tDone = {};
}
function tAllDone() { return Object.keys(tDone).length >= tRound.length; }
function tSay(t) { popBubble($('tBubble'), t); }
function tPips() {
  var p = $('tPips'); p.innerHTML = '';
  for (var i = 0; i < tRound.length; i++) {
    var d = document.createElement('div');
    d.className = 'pip' + (tDone[i] ? ' on' : '');
    d.textContent = tDone[i] ? '⭐' : (i === tIdx ? '•' : '');
    p.appendChild(d);
  }
}
function tRender() {
  if (!tRound.length) tNewRound();
  var w = tRound[tIdx];
  $('tWord').textContent = w[0];
  $('tWord').style.fontSize = w[0].length > 9 ? 'min(44px, 9.5vw)' : '';
  $('tPic').textContent = w[1];
  $('tTipDe').textContent = TIP_DE;
  $('tTipEn').textContent = TIP_EN;
  $('tNote').textContent = '';
  $('tRate').hidden = true; $('tGauge').hidden = true; tLast = null;
  tSay('Hör zu und sag nach: ' + w[0] + ' 🎤');
  tPips();
}
$('tHear').onclick = function () { if (tRound.length) speakDe(tRound[tIdx][0], 0.7); };
$('tNext').onclick = function () {
  stopAll();
  if (tAllDone()) tNewRound();
  else { do { tIdx = (tIdx + 1) % tRound.length; } while (tDone[tIdx]); }
  tRender();
  speakDe(tRound[tIdx][0], 0.7);
};
function tMarkDone() {
  tDone[tIdx] = true; soundGood(); tPips();
  if (tAllDone()) { tSay('Alle Wörter geschafft! 🎉 Tippe auf ➡️ für neue Wörter.'); soundStar(); confetti(30); }
  else { tSay('Toll gemacht! 🌟'); confetti(8); }
}
var tLast = null;
function tShowPhone(a) { $('tGauge').hidden = false; sMarker('tMarker', a.score); }
function tRated(v) {
  $('tRate').hidden = true;
  if (tLast) { // the parent rated without seeing the phone's guess; now show it and learn from the rating
    sLearn(tLast, v); tShowPhone(tLast);
    $('tNote').textContent = sInfo(tLast, true) + '  ·  Eltern: ' + (v >= 10 ? '😀' : v >= 7 ? '🙂' : '😕');
    tLast = null;
  }
  if (v >= 10) tMarkDone();
  else { soundTry(); tSay(v >= 7 ? 'Fast! Noch einmal: ' + tRound[tIdx][0] + ' 🐍' : 'Nochmal! Zunge hinter die Zähne 🐍'); }
}
function tAskParent() { tSay('Mama oder Papa bewertet 👂'); $('tRate').hidden = false; }
$('tMic').onclick = function () {
  $('tRate').hidden = true; $('tGauge').hidden = true; tLast = null;
  sRecord($('tMic'), {
    start: function () { tSay('Ich höre zu... sag: ' + tRound[tIdx][0] + ' 👂'); $('tNote').textContent = ''; },
    result: function (a) {
      a.score = sScore(a);
      if (S.rateMode === 'parent') { tLast = a; $('tNote').textContent = sInfo(a, false); tAskParent(); return; }
      tShowPhone(a); $('tNote').textContent = sInfo(a, true);
      if (a.score >= 7) tMarkDone();
      else { soundTry(); tSay(a.sib ? feedback(a.score) : 'Ich habe kein klares S gehört 🐍 Zunge hinter die Zähne!'); }
    },
    error: function (c) { deErr(c, tSay, function (t) { $('tNote').textContent = t; }); },
    none: function () { tSay('Ich habe nichts gehört 🎤 Nochmal!'); }
  });
};

/* ----- game: 5 levels, each rated 0-10, more than 40 of 50 = star ----- */
var G = { qs: [], i: 0, q: null, tries: 0, cur: -1, scores: [] };
function gSay(t) { popBubble($('gBubble'), t); }
function gPips() {
  var p = $('gPips'); p.innerHTML = '';
  for (var i = 0; i < 5; i++) {
    var d = document.createElement('div');
    d.className = 'pip' + (i < G.scores.length ? ' on' : '');
    d.textContent = i < G.scores.length ? String(G.scores[i]) : (i === G.i ? '•' : '');
    p.appendChild(d);
  }
}
function gStartScreen() {
  $('gStart').hidden = false; $('gPlay').hidden = true;
  var L = S.lisp || { best: 0, rounds: 0 };
  $('gBest').textContent = L.rounds ? 'Bestes Ergebnis: ' + L.best + ' / 50' : 'Ich stelle dir 5 Fragen. Antworte schön klar!';
}
function gBegin() {
  G.qs = QBANK.map(function (lvl) { return lvl[Math.floor(Math.random() * lvl.length)]; });
  G.i = 0; G.scores = [];
  $('gStart').hidden = true; $('gPlay').hidden = false;
  gLoad();
}
function gLoad() {
  G.q = G.qs[G.i]; G.tries = 0; G.cur = -1;
  $('gNum').textContent = 'Frage ' + (G.i + 1) + ' von 5';
  $('gQ').textContent = G.q.q;
  $('gPic').textContent = G.q.show ? G.q.p : '';
  $('gScore').hidden = true; $('gRate').hidden = true; $('gRetry').hidden = true; $('gNext').hidden = true;
  $('gMic').disabled = false; $('gNote').textContent = '';
  gSay('Hör zu und antworte! 🎤');
  gPips();
  speakDe(G.q.q);
}
// an attempt was made: in "parent" mode the parent rates the S / Z sound, otherwise the S-detector's score counts
function gAttempt(a) {
  G.tries++; G.last = a;
  if (S.rateMode === 'parent') {
    $('gMic').disabled = true;
    $('gNote').textContent = sInfo(a, false);
    $('gRate').hidden = false;
    gSay('Mama oder Papa bewertet 👂');
  } else gScoreDone(a.score, false);
}
function gScoreDone(score, byParent) {
  G.cur = Math.max(G.cur, score);
  $('gRate').hidden = true;
  $('gScoreNum').textContent = score; $('gScore').hidden = false;
  $('gNote').textContent = sInfo(G.last, true) + (byParent ? '  ·  Bewertung der Eltern' : '') + (G.tries > 1 ? '  ·  Zählt: ' + G.cur + ' / 10' : '');
  gSay(feedback(score));
  if (score >= 7) soundGood(); else soundTry();
  if (score >= 9) confetti(10);
  var canRetry = G.tries < (S.lispTries || 2) && score < 9;
  $('gRetry').hidden = !canRetry;
  $('gMic').disabled = !canRetry;
  $('gNext').hidden = false;
  $('gNext').textContent = G.i === 4 ? 'Ergebnis ▶' : 'Weiter ➡️';
}
function gFinish() {
  var total = G.scores.reduce(function (a, b) { return a + b; }, 0);
  var star = total > 40;
  S.lisp = S.lisp || { best: 0, rounds: 0 };
  S.lisp.rounds++; S.lisp.best = Math.max(S.lisp.best, total);
  if (star) S.stars++;
  save(); renderHud();
  $('ldTotal').textContent = total;
  $('ldList').textContent = G.scores.join('  ·  ');
  $('ldEmoji').textContent = star ? '⭐' : '🐍';
  $('ldMsg').textContent = star ? 'Du hast einen Stern verdient! ⭐' : 'Fast geschafft! Für einen Stern brauchst du mehr als 40 Punkte. Übe noch ein bisschen 🐍';
  if (star) {
    soundStar(); confetti(40);
    var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  }
  $('lispDone').hidden = false;
}
$('gGo').onclick = gBegin;
$('gHear').onclick = function () { if (G.q) speakDe(G.q.q); };
$('gHint').onclick = function () { if (G.q) { $('gPic').textContent = G.q.p; } };
$('gRetry').onclick = function () {
  $('gScore').hidden = true; $('gRate').hidden = true; $('gRetry').hidden = true; $('gNext').hidden = true;
  $('gMic').disabled = false; $('gNote').textContent = '';
  gSay('Nochmal! Zunge hinter die Zähne 🐍');
};
$('gNext').onclick = function () {
  stopAll();
  G.scores.push(Math.max(0, G.cur));
  if (G.i === 4) { gPips(); gFinish(); } else { G.i++; gLoad(); }
};
$('gMic').onclick = function () {
  sRecord($('gMic'), {
    start: function () { gSay('Ich höre zu... 👂'); $('gNote').textContent = ''; },
    result: function (a) { a.score = sScore(a); gAttempt(a); },
    error: function (c) { deErr(c, gSay, function (t) { $('gNote').textContent = t; }); },
    none: function () { gSay('Ich habe nichts gehört 🎤 Nochmal!'); }
  });
};
$('ldAgain').onclick = function () { $('lispDone').hidden = true; gStartScreen(); };
$('ldTrain').onclick = function () { $('lispDone').hidden = true; setMode('train'); };

/* ----- rating buttons (hold for a moment so she can't tap them by accident) ----- */
function holdable(btn, ms, cb) {
  var t = null;
  function stop() { clearTimeout(t); t = null; btn.classList.remove('holding'); }
  btn.addEventListener('pointerdown', function (e) { e.preventDefault(); stop(); btn.classList.add('holding'); t = setTimeout(function () { stop(); cb(); }, ms); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb(); } });
}
function makeRate(box, cb) {
  var wrap = box.querySelector('.rateBtns');
  [['😀', 'klar', 10], ['🙂', 'fast', 7], ['😕', 'noch nicht', 3]].forEach(function (o) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'rateBtn';
    b.innerHTML = '<span class="fill"></span><span class="em">' + o[0] + '</span><span class="lb">' + o[1] + '</span>';
    holdable(b, 700, function () { cb(o[2]); });
    wrap.appendChild(b);
  });
}
makeRate($('tRate'), tRated);
makeRate($('gRate'), function (v) { sLearn(G.last, v); gScoreDone(v, true); });
