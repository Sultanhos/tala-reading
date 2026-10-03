// 🕌 Juz 'Amma memorization: listen to Sheikh al-Husary (the teaching recitation), read along, recite with words
// hidden, then from memory; each recitation is checked with the speech recognizer.
// Text: Tanzil (js/quran-juz-amma.js, unchanged). Audio: everyayah.com, Husary Muallim.
'use strict';

var Q_AUDIO = 'https://everyayah.com/data/Husary_Muallim_128kbps/';
var Q_STEPS = [['👂', 'اِسْمَعْ'], ['📖', 'اِقْرَأْ'], ['🙈', 'نِصْفٌ مَخْفِيٌّ'], ['🧠', 'مِنَ الحِفْظِ']];
var Q_SAY = [
  'اِسْتَمِعِي إِلَى الشَّيْخِ 👂',
  'اِسْتَمِعِي، ثُمَّ اِقْرَئِي الآيَةَ 🎤',
  'اِقْرَئِي الآيَةَ، وَبَعْضُ الكَلِمَاتِ مَخْفِيَّةٌ 🙈',
  'سَمِّعِي الآيَةَ مِنَ الحِفْظِ 🧠'
];
var Q = { surah: null, step: 0, i: 0, fails: 0, locked: false, audio: null, rec: null, listening: false, got: {}, shift: 0, token: 0 };

function qSurah(n) { for (var i = 0; i < JUZ_AMMA.length; i++) if (JUZ_AMMA[i].n === n) return JUZ_AMMA[i]; return null; }
function qProg(n) { var p = (S.quran || {})[n]; return p && typeof p.step === 'number' ? p.step : 0; } // steps finished (0-4)
function qName(s) { return s.name.replace(/^سُورَةُ\s*/, ''); }
function qSay(t) { popBubble($('qBubble'), t); }
function qNum(n) { return ('00' + n).slice(-3); }

/* ----- the list of surahs, shortest first ----- */
function qList() {
  var box = $('qSurahs');
  box.textContent = '';
  JUZ_AMMA.slice().reverse().forEach(function (s) {
    var done = qProg(s.n), b = mEl('button', 'qSurah' + (done >= 4 ? ' done' : done ? ' started' : ''));
    b.appendChild(mEl('span', 'qN', mNumAr(s.n)));
    b.appendChild(mEl('span', 'qT', qName(s)));
    var dots = mEl('span', 'qDots');
    for (var k = 0; k < 4; k++) dots.appendChild(mEl('i', k < done ? 'on' : ''));
    b.appendChild(dots);
    b.onclick = function () { qOpen(s.n); };
    box.appendChild(b);
  });
  $('qList').hidden = false; $('qPlay').hidden = true;
}
function qEnter() { qStop(); if (Q.surah && !$('qPlay').hidden) qShow(); else qList(); }

/* ----- one surah ----- */
function qOpen(n) {
  qStop();
  Q.surah = qSurah(n); Q.step = Math.min(3, qProg(n)); Q.i = 0;
  $('qName').textContent = qName(Q.surah);
  $('qList').hidden = true; $('qPlay').hidden = false;
  qShow();
  if (Q.step === 0) qPlay(true);
}
function qSteps() {
  var box = $('qSteps'), done = qProg(Q.surah.n);
  box.textContent = '';
  Q_STEPS.forEach(function (st, k) {
    var b = mEl('button', 'qStep' + (k === Q.step ? ' on' : '') + (k < done ? ' done' : ''), st[0] + ' ' + st[1]);
    b.disabled = k > done; // a step opens when the one before is finished
    b.onclick = function () { qStop(); Q.step = k; Q.i = 0; qShow(); if (k === 0) qPlay(true); };
    box.appendChild(b);
  });
}
function qShow() {
  var s = Q.surah;
  Q.fails = 0; Q.locked = false; Q.got = {}; Q.miss = {};
  qSteps();
  var p = $('qPips'); p.innerHTML = '';
  s.ayat.forEach(function (a, i) { p.appendChild(mEl('div', 'pip' + (i < Q.i ? ' on' : ''), i < Q.i ? '⭐' : (i === Q.i ? '•' : ''))); });
  $('qBasmala').hidden = !(Q.i === 0 && s.n !== 9);
  $('qMic').hidden = Q.step === 0;
  $('qOk').hidden = Q.step === 0 || !(S.alwaysOk || micUnavailable);
  $('qNote').textContent = '';
  $('qHear').classList.remove('callout');
  qAyah();
  qSay(Q_SAY[Q.step]);
}
// the ayah, word by word; in step 3 every other word is hidden, in step 4 all but the first; read words turn green
function qAyah(reveal) {
  var box = $('qAyah'), words = Q.surah.ayat[Q.i].split(/\s+/);
  box.textContent = '';
  words.forEach(function (w, k) {
    var miss = Q.miss && Q.miss[k];
    var hide = !reveal && !Q.got[k] && !miss && (Q.step === 3 ? k > 0 : Q.step === 2 ? (k + Q.shift) % 2 === 1 : false);
    var sp = mEl('span', 'qW' + (Q.got[k] ? ' ok' : '') + (miss ? ' miss' : '') + (hide ? ' hid' : ''), w);
    box.appendChild(sp);
    box.appendChild(document.createTextNode(' '));
  });
  box.appendChild(mEl('span', 'qEnd', '﴿' + mNumAr(Q.i + 1) + '﴾'));
}

/* ----- the sheikh's recitation ----- */
function qStopAudio() { Q.token++; if (Q.audio) { try { Q.audio.onended = Q.audio.onerror = null; Q.audio.pause(); } catch (e) {} } }
function qPlayUrls(urls, done) {
  var tok = ++Q.token, k = 0;
  if (!Q.audio) Q.audio = new Audio();
  var a = Q.audio;
  function next() {
    if (tok !== Q.token) return;
    if (k >= urls.length) { if (done) done(); return; }
    a.onended = next;
    a.onerror = function () { if (tok !== Q.token) return; $('qNote').textContent = 'التلاوة تحتاج إلى اتصال بالإنترنت.'; };
    a.src = urls[k++];
    var p = a.play(); if (p && p.catch) p.catch(function () {});
  }
  next();
}
// play the current ayah (with the basmala before the first one); in step 1 go on to the next ayah by itself
function qPlay(auto) {
  if (!Q.surah) return;
  if (Q.listening) qStopRec();
  var s = Q.surah, urls = [];
  if (Q.i === 0 && s.n !== 9 && (Q.step === 0 || auto)) urls.push(Q_AUDIO + '001001.mp3');
  urls.push(Q_AUDIO + qNum(s.n) + qNum(Q.i + 1) + '.mp3');
  $('qHear').classList.remove('callout');
  qPlayUrls(urls, function () {
    if (Q.step !== 0) return;
    setTimeout(function () {
      if (Q.step !== 0 || $('qPlay').hidden) return;
      if (Q.i + 1 < s.ayat.length) { Q.i++; qShow(); qPlay(true); }
      else qStepDone();
    }, 900);
  });
}

/* ----- her recitation ----- */
function qStopRec() {
  if (Q.listening && Q.rec) { try { Q.rec.abort(); } catch (e) {} }
  Q.listening = false; $('qMic').classList.remove('on'); $('qPlay').classList.remove('listening');
}
function qStop() { qStopAudio(); qStopRec(); }
// The Quran is recited exactly: EVERY word of the ayah must be heard, in order, in this one recitation.
// Each transcript of the recognizer is checked on its own; the best one counts. Short words must match closely.
function qWordOk(h, k) {
  var t = k.length <= 3 ? 0.5 : k.length <= 5 ? 1 : 1.5;
  return wlev(h, k) <= t;
}
function qMatch(alts) {
  var want = Q.surah.ayat[Q.i].split(/\s+/).map(function (w) { return norm(w); }), best = null;
  alts.forEach(function (a) {
    var heard = String(a).split(/\s+/).map(function (h) { return norm(h); }).filter(Boolean), got = {}, p = 0, n = 0;
    for (var i = 0; i < want.length; i++) {
      if (!want[i]) { got[i] = true; n++; continue; } // a pause sign (ۖ ۚ) or the sajda sign ۩ is not a word
      for (var j = p; j < Math.min(heard.length, p + 3); j++) { // she may repeat a word or add a sound: look a little ahead
        if (qWordOk(heard[j], want[i])) { got[i] = true; n++; p = j + 1; break; }
        // the recognizer sometimes writes two words as one, or one word as two
        // (only when all the letters of both words are really there: a short word must not slip through this way)
        if (i + 1 < want.length && want[i + 1] && heard[j].length >= want[i].length + want[i + 1].length && wlev(heard[j], want[i] + want[i + 1]) <= 0.5) { got[i] = got[i + 1] = true; n += 2; i++; p = j + 1; break; }
        if (j + 1 < heard.length && heard[j].length + heard[j + 1].length <= want[i].length && wlev(heard[j] + heard[j + 1], want[i]) <= 0.5) { got[i] = true; n++; p = j + 2; break; }
      }
    }
    if (!best || n > best.n) best = { got: got, n: n };
  });
  Q.got = best ? best.got : {};
  Q.miss = {};
  want.forEach(function (w, i) { if (!Q.got[i]) Q.miss[i] = true; });
  return (best ? best.n : 0) / want.length;
}
function qListen() {
  if (!Q.surah || Q.locked || Q.step === 0) return;
  if (!SR) { micUnavailable = true; $('qOk').hidden = false; $('qNote').textContent = 'التعرف على الصوت غير متاح في هذا المتصفح. استخدموا زر ✔ ولي الأمر.'; return; }
  if (Q.listening) { try { Q.rec.stop(); } catch (e) {} return; }
  qStopAudio();
  var rec = new SR(), got = false;
  rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
  Q.rec = rec;
  rec.onstart = function () { Q.listening = true; $('qMic').classList.add('on'); $('qPlay').classList.add('listening'); qSay('أَسْمَعُكِ... 👂'); Q.got = {}; Q.miss = {}; qAyah(); };
  rec.onresult = function (e) {
    got = true;
    var alts = [];
    for (var i = 0; i < e.results.length; i++) for (var j = 0; j < e.results[i].length; j++) alts.push(e.results[i][j].transcript);
    $('qNote').textContent = 'سمعت: ' + (alts[0] || '—');
    var share = qMatch(alts);
    qAyah();
    if (share >= 1) qGood(); else qTry();
  };
  rec.onerror = function (e) {
    got = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { micUnavailable = true; $('qOk').hidden = false; qSay('المَيْكْرُوفُون مُغْلَق 🔇'); }
    else if (e.error !== 'aborted') qSay('لَمْ أَسْمَعْ جَيِّدًا 🎤 حَاوِلِي مَرَّةً أُخْرَى');
  };
  rec.onend = function () { qStopRec(); if (!got && !Q.locked) qSay('لَمْ أَسْمَعْ شَيْئاً 🎤 حَاوِلِي مَرَّةً أُخْرَى'); };
  try { rec.start(); } catch (e) { qStopRec(); }
}
function qTry() {
  Q.fails++; soundTry(); track('quran', String(Q.surah.n), false);
  var nMiss = Object.keys(Q.miss || {}).length, all = Q.surah.ayat[Q.i].split(/\s+/).length;
  var what = nMiss >= all ? 'حَاوِلِي مَرَّةً أُخْرَى 💪' : nMiss === 1 ? 'كَلِمَةٌ نَاقِصَةٌ! اُنْظُرِي الكَلِمَةَ الحَمْرَاءَ وَأَعِيدِي الآيَةَ 💪' : 'كَلِمَاتٌ نَاقِصَةٌ! اُنْظُرِي الكَلِمَاتِ الحَمْرَاءَ وَأَعِيدِي الآيَةَ 💪';
  if (Q.fails >= 2) { qSay(what + ' 🔊'); $('qHear').classList.add('callout'); $('qOk').hidden = false; }
  else qSay(what);
}
function qGood() {
  if (Q.locked || !Q.surah) return;
  Q.locked = true; track('quran', String(Q.surah.n), true);
  Q.miss = {};
  qAyah(true);
  $('qAyah').querySelectorAll('.qW').forEach(function (w) { w.classList.add('ok'); });
  if (Q.i + 1 < Q.surah.ayat.length) {
    soundGood(); confetti(8);
    qSay(PRAISE[Math.floor(Math.random() * PRAISE.length)] + '! 🌟');
    setTimeout(function () { Q.i++; Q.shift = 0; qShow(); if (Q.step === 1) qPlay(); }, 1700);
    return;
  }
  qStepDone();
}
// a step of the surah finished: open the next step; from step 2 on a star the first time
function qStepDone() {
  var n = Q.surah.n, before = qProg(n);
  S.quran = S.quran || {};
  if (Q.step + 1 > before) {
    S.quran[n] = { step: Q.step + 1, at: Date.now() };
    if (Q.step >= 1) { S.stars++; trackStar('quran'); var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
  }
  save(); renderHud();
  soundStar(); confetti(Q.step === 3 ? 60 : 30);
  Q.locked = true; Q.i = Q.surah.ayat.length;
  qSteps();
  qSay(Q.step === 3 ? 'مَا شَاءَ اللَّهُ! حَفِظْتِ ' + qName(Q.surah) + ' 🎉' : 'أَحْسَنْتِ! اِضْغَطِي ' + Q_STEPS[Q.step + 1][0] + ' لِلْخُطْوَةِ التَّالِيَةِ ⭐');
}
$('qBack').onclick = function () { qStop(); qList(); };
$('qHear').onclick = function () { qPlay(false); };
$('qMic').onclick = qListen;
$('qNext').onclick = function () {
  if (!Q.surah || Q.i >= Q.surah.ayat.length) return;
  qStop();
  if (Q.i + 1 < Q.surah.ayat.length) { Q.i++; Q.shift = 0; qShow(); if (Q.step <= 1) qPlay(); }
};
$('qOk').onclick = qGood;
