// 📖 Short stories to read aloud, made only of what the child can already read at their lesson (decodable text).
// Claude writes a new one on the AI helper server (POST /story); every word is checked here too, and
// without the server there are hand-written ones. The child reads sentence by sentence into the microphone.
'use strict';

/* ----- what can be read at a lesson ----- */
// lesson index (0 = 3A) from which each vowel mark / long vowel is known
var DEC_FROM = { 'َ': 0, 'ِ': 1, 'ُ': 2, 'ً': 4, 'ٍ': 5, 'ٌ': 6, 'ْ': 8, longA: 13, longI: 14, longU: 15, 'ّ': 16 };
var STORY_FROM = 6; // 4C: nouns with tanween, so sentences are possible
function decKnows(k, lvl) { return DEC_FROM[k] != null && DEC_FROM[k] <= lvl - 1; }
// -> null if the word can be read at this lesson, otherwise the reason
function decWord(word, lvl) {
  var w = String(word).replace(/[.,،؛:!?؟«»"()\-–]/g, '').replace(/ـ/g, '');
  if (!w || w === '{name}') return null;
  var u = [];
  for (var i = 0; i < w.length; i++) {
    var c = w[i];
    if (/[ً-ْ]/.test(c)) { if (!u.length) return 'mark'; u[u.length - 1].m += c; }
    else if (/[ء-ي]/.test(c)) u.push({ l: c, m: '' });
    else return 'char';
  }
  for (var j = 0; j < u.length; j++) {
    var x = u[j], prev = u[j - 1], next = u[j + 1];
    if (x.m) {
      for (var k = 0; k < x.m.length; k++) if (!decKnows(x.m[k], lvl)) return 'mark ' + x.m[k];
      if (x.m === 'ّ') return 'shadda alone';
      continue;
    }
    // letters without a mark
    if (x.l === 'ا' && next && next.l === 'ل' && (j === 0 || (prev && prev.m && j <= 2))) { // الْ (also after بِ / وَ / فَ / لِ)
      if (!decKnows('longA', lvl)) return 'al';
      if (!next.m && !(u[j + 2] && u[j + 2].m.indexOf('ّ') > -1 && decKnows('ّ', lvl))) return 'sun letter';
      continue;
    }
    if (x.l === 'ل' && prev && prev.l === 'ا' && !x.m) continue; // the lam of a sun-letter ال (checked above)
    if (x.l === 'ا' && prev && prev.m.indexOf('ً') > -1) continue; // the alif after tanween -ًا
    if ((x.l === 'ا' || x.l === 'ى') && prev && prev.m.indexOf('َ') > -1) { if (decKnows('longA', lvl)) continue; return 'long a'; }
    if (x.l === 'ي' && prev && prev.m.indexOf('ِ') > -1) { if (decKnows('longI', lvl)) continue; return 'long i'; }
    if (x.l === 'و' && prev && prev.m.indexOf('ُ') > -1) { if (decKnows('longU', lvl)) continue; return 'long u'; }
    if (x.l === 'و' && prev && prev.l === 'ا' && j === u.length - 1) continue; // -وا at the end of a plural verb
    if (x.l === 'ا' && prev && prev.l === 'و' && j === u.length - 1) continue;
    return 'no mark on ' + x.l;
  }
  return null;
}
function decText(t, lvl) {
  var bad = [];
  String(t).split(/\s+/).forEach(function (w) { if (w && decWord(w, lvl)) bad.push(w); });
  return bad;
}

/* ----- hand-written stories (first person, the same for boys and girls), easiest first ----- */
var RS_LOCAL = [
  { from: 6, t: 'مَطَرٌ', s: ['نَزَلَ مَطَرٌ.', 'فَرِحَ وَلَدٌ.', 'لَعِبَ وَلَدٌ مَعَ أَخٍ.', 'رَكَضَ وَلَدٌ، وَرَكَضَ أَخٌ.', 'ضَحِكَ وَلَدٌ وَأَخٌ.'] },
  { from: 6, t: 'رَجُلٌ وَسَمَكٌ', s: ['جَلَسَ رَجُلٌ.', 'أَكَلَ رَجُلٌ سَمَكًا.', 'شَرِبَ رَجُلٌ لَبَنًا.', 'شَبِعَ رَجُلٌ.', 'حَمِدَ رَجُلٌ.'] },
  { from: 8, t: 'كَلْبٌ أَسْوَدُ', s: ['عِنْدَ {name} كَلْبٌ أَسْوَدُ.', 'لَعِبْتُ مَعَ كَلْبٍ.', 'رَكَضَ كَلْبٌ، وَرَكَضْتُ.', 'أَكَلَ كَلْبٌ لَحْمًا.', 'شَرِبَ كَلْبٌ لَبَنًا، وَرَقَدَ.'] },
  { from: 15, t: 'فِي الْحَدِيقَةِ', s: ['أَنَا {name}.', 'ذَهَبْنَا إِلَى الْحَدِيقَةِ.', 'رَأَيْنَا طُيُورًا.', 'لَعِبْتُ بِالْكُرَةِ.', 'جَلَسْنَا عَلَى الْعُشْبِ، وَأَكَلْنَا خُبْزًا وَجُبْنًا.', 'رَجَعْنَا فَرِحِينَ.'] },
  { from: 16, t: 'صَبَاحٌ جَمِيلٌ', s: ['أَنَا {name}.', 'طَلَعَتِ الشَّمْسُ.', 'قُمْتُ مِنَ النَّوْمِ.', 'غَسَلْتُ وَجْهِي، وَصَلَّيْتُ.', 'شَرِبْتُ الْحَلِيبَ، وَأَكَلْتُ التَّمْرَ.', 'الْحَمْدُ لِلَّهِ.'] }
];

/* ----- reading a story ----- */
var RS = { mode: 'words', story: null, i: 0, fails: 0, locked: false, loading: false, rec: null, listening: false, got: {} };
function rsAvailable() { return S.level >= STORY_FROM + 1; }
function rsSync() { // the 🔤 / 📖 switch shows from lesson 4C on
  var ok = rsAvailable();
  $('readModes').hidden = !ok;
  if (!ok && RS.mode === 'story') rsMode('words');
}
function rsMode(m) {
  RS.mode = m;
  $('rmWords').classList.toggle('on', m === 'words');
  $('rmStory').classList.toggle('on', m === 'story');
  $('card').hidden = m === 'story'; $('pips').hidden = m === 'story'; $('rsCard').hidden = m !== 'story';
  rsStop();
  if (m === 'story' && !RS.story) rsNew(); else if (m === 'story') rsShow();
}
function rsSay(t) { popBubble($('rsBubble'), t); }
function rsFill(t) { return String(t).split('{name}').join(S.name); }
function rsWords(line) { return line.split(/\s+/).filter(Boolean); }
function rsKey(w) { return norm(w.replace(/[.,،؛:!?؟«»"]/g, '')); }

// a story for her lesson: a new one from Claude when the AI helper answers, otherwise a hand-written one
function rsLocal() {
  var can = RS_LOCAL.filter(function (s) { return s.from <= S.level - 1; }), done = S.rsDone || [];
  var fresh = can.filter(function (s) { return done.indexOf(s.t) < 0; });
  var list = fresh.length ? fresh : can;
  return list[Math.floor(Math.random() * list.length)];
}
function rsNew() {
  if (RS.loading) return;
  rsStop();
  RS.loading = true; RS.story = null;
  $('rsTitle').textContent = ''; $('rsLine').textContent = '⏳'; $('rsPips').innerHTML = '';
  rsSay('لَحْظَة… ⏳');
  var base = aiBase(), done = false;
  function use(st) { if (done) return; done = true; RS.loading = false; RS.story = st; RS.i = 0; rsShow(); }
  if (!base) { use(rsLocal()); return; }
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); use(rsLocal()); }, 25000);
  fetch(base + '/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ level: S.level - 1, lesson: LESSON_IDS[S.level - 1], gender: pCur().gender === 'boy' ? 'boy' : 'girl',
      words: [].concat.apply([], LESSONS.slice(0, S.level).map(function (L) { return L[1]; })).slice(-60) }) })
    .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
    .then(function (r) {
      // every sentence is checked here too: only what she can read at her lesson stays
      var lines = (r.sentences || []).filter(function (l) { return l && !decText(l, S.level).length; });
      if (lines.length < 3 || !r.title || decText(r.title, S.level).length) throw new Error('not readable');
      clearTimeout(timer);
      use({ t: r.title, s: lines.slice(0, 6), ai: true });
    })
    .catch(function () { clearTimeout(timer); use(rsLocal()); });
}
function rsShow() {
  var st = RS.story;
  if (!st) return;
  RS.fails = 0; RS.locked = false; RS.got = {};
  $('rsTitle').textContent = st.t;
  $('rsOk').hidden = !(S.alwaysOk || micUnavailable);
  $('rsNote').textContent = st.ai ? '✨ قصة جديدة' : '';
  var p = $('rsPips'); p.innerHTML = '';
  st.s.forEach(function (x, i) { p.appendChild(mEl('div', 'pip' + (i < RS.i ? ' on' : ''), i < RS.i ? '⭐' : (i === RS.i ? '•' : ''))); });
  if (RS.i >= st.s.length) { $('rsLine').textContent = '⭐'; RS.locked = true; return; }
  rsLine();
  rsSay(RS.i === 0 ? 'اِقْرَئِي القِصَّةَ جُمْلَةً جُمْلَةً 🎤' : 'الجُمْلَةُ التَّالِيَةُ 🎤');
}
function rsLine() { // the sentence word by word; words she has read turn green
  var box = $('rsLine');
  box.textContent = '';
  rsWords(rsFill(RS.story.s[RS.i])).forEach(function (w, i) {
    box.appendChild(mEl('span', 'rsW' + (RS.got[i] ? ' ok' : ''), w));
    box.appendChild(document.createTextNode(' '));
  });
}
function rsHear() {
  if (!window.speechSynthesis || !RS.story || RS.i >= RS.story.s.length) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(rsFill(RS.story.s[RS.i]));
    u.lang = 'ar-SA'; u.rate = 0.7;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function rsStop() {
  if (RS.listening && RS.rec) { try { RS.rec.abort(); } catch (e) {} }
  RS.listening = false; $('rsMic').classList.remove('on'); $('rsCard').classList.remove('listening');
}
// which words of the sentence were heard, as a share (her name always counts as read)
function rsMatch(alts) {
  var want = rsWords(RS.story.s[RS.i]), heard = [], tol = S.lenient == null ? 1 : S.lenient, n = 0;
  alts.forEach(function (a) {
    String(a).split(/\s+/).forEach(function (h) { var k = norm(h); if (k) { heard.push(k); if (k.indexOf('ال') === 0) heard.push(k.slice(2)); } });
  });
  want.forEach(function (w, i) {
    if (w.indexOf('{name}') > -1) { RS.got[i] = true; return; }
    var k = rsKey(w);
    if (k.indexOf('ال') === 0 && k.length > 3) k = k.slice(2);
    var t = Math.max(0.5, (k.length <= 3 ? 1 : k.length <= 5 ? 1.5 : 2) + (tol - 1) * 0.5);
    if (heard.some(function (h) { return wlev(h, k) <= t; })) RS.got[i] = true;
  });
  want.forEach(function (w, i) { if (RS.got[i]) n++; });
  return n / want.length;
}
function rsListen() {
  if (!RS.story || RS.locked) return;
  if (!SR) { micUnavailable = true; $('rsOk').hidden = false; $('rsNote').textContent = 'التعرف على الصوت غير متاح في هذا المتصفح. استخدموا زر ✔ ولي الأمر.'; return; }
  if (RS.listening) { try { RS.rec.stop(); } catch (e) {} return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  var rec = new SR(), got = false;
  rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
  RS.rec = rec;
  rec.onstart = function () { RS.listening = true; $('rsMic').classList.add('on'); $('rsCard').classList.add('listening'); rsSay('أَسْمَعُكِ... 👂'); };
  rec.onresult = function (e) {
    got = true;
    var alts = [];
    for (var i = 0; i < e.results.length; i++) for (var j = 0; j < e.results[i].length; j++) alts.push(e.results[i][j].transcript);
    $('rsNote').textContent = 'سمعت: ' + (alts[0] || '—');
    var share = rsMatch(alts);
    rsLine();
    if (share >= 0.7) rsGood(); else rsTry();
  };
  rec.onerror = function (e) {
    got = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { micUnavailable = true; $('rsOk').hidden = false; rsSay('المَيْكْرُوفُون مُغْلَق 🔇'); }
    else if (e.error !== 'aborted') rsSay('لَمْ أَسْمَعْ جَيِّدًا 🎤 حَاوِلِي مَرَّةً أُخْرَى');
  };
  rec.onend = function () { rsStop(); if (!got && !RS.locked) rsSay('لَمْ أَسْمَعْ شَيْئاً 🎤 حَاوِلِي مَرَّةً أُخْرَى'); };
  try { rec.start(); } catch (e) { rsStop(); }
}
function rsTry() {
  RS.fails++; soundTry(); track('read', null, false);
  rsSay(RS.fails >= 2 ? 'اِسْتَمِعِي أَوَّلاً 🔊 ثُمَّ اِقْرَئِي' : 'اِقْرَئِي الكَلِمَاتِ البَاقِيَةَ 💪');
  if (RS.fails >= 2) { $('rsHear').classList.add('callout'); $('rsOk').hidden = false; }
}
function rsGood() {
  if (RS.locked || !RS.story) return;
  RS.locked = true; track('read', null, true);
  rsWords(RS.story.s[RS.i]).forEach(function (w, i) { RS.got[i] = true; });
  rsLine();
  $('rsHear').classList.remove('callout');
  if (RS.i + 1 < RS.story.s.length) {
    soundGood(); confetti(8);
    rsSay(PRAISE[Math.floor(Math.random() * PRAISE.length)] + '! 🌟');
    setTimeout(function () { RS.i++; rsShow(); }, 1600);
    return;
  }
  // the whole story read: a star
  S.stars++; trackStar('read');
  S.rsDone = (S.rsDone || []).filter(function (t) { return t !== RS.story.t; }).concat([RS.story.t]).slice(-12);
  save(); renderHud();
  soundStar(); confetti(40);
  var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  RS.i = RS.story.s.length; rsShow();
  rsSay('قَرَأْتِ القِصَّةَ كُلَّهَا يَا ' + S.name + '! ⭐ اِضْغَطِي ✨ لِقِصَّةٍ جَدِيدَةٍ');
}
$('rmWords').onclick = function () { rsMode('words'); };
$('rmStory').onclick = function () { rsMode('story'); };
$('rsMic').onclick = rsListen;
$('rsHear').onclick = function () { $('rsHear').classList.remove('callout'); rsHear(); };
$('rsSkip').onclick = function () { if (!RS.story || RS.locked) return; rsStop(); if (RS.i + 1 < RS.story.s.length) { RS.i++; rsShow(); } };
$('rsOk').onclick = rsGood;
$('rsNew').onclick = rsNew;
