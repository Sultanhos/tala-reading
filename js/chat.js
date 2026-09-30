// 🦜 Koko, the talking buddy: short spoken conversations in simple Arabic about animals, colours, food, family and
// the child's day. Without AI Koko follows a script; if the parents switch it on, Claude answers on the AI helper
// server (POST /chat), which gets the conversation as text — never the child's name.
'use strict';

var C_TOPICS = [
  { id: 'animals', icon: '🐾', t: 'الحَيَوَانَات', a: 'عَنِ الحَيَوَانَاتِ', q: [
    ['مَا حَيَوَانُكِ المُفَضَّلُ؟', ['أُحِبُّ القِطَّةَ', 'أُحِبُّ الأَسَدَ']],
    ['مَاذَا يَأْكُلُ الأَرْنَبُ؟', ['يَأْكُلُ الجَزَرَ']],
    ['أَيُّ حَيَوَانٍ يَقُولُ: مُووو؟', ['البَقَرَةُ']],
    ['أَيْنَ يَعِيشُ السَّمَكُ؟', ['فِي المَاءِ', 'فِي البَحْرِ']],
    ['هَلْ عِنْدَكِ حَيَوَانٌ فِي البَيْتِ؟', ['نَعَمْ، عِنْدِي قِطَّةٌ', 'لَا، لَيْسَ عِنْدِي']]] },
  { id: 'colors', icon: '🎨', t: 'الأَلْوَان', a: 'عَنِ الأَلْوَانِ', q: [
    ['مَا لَوْنُكِ المُفَضَّلُ؟', ['الأَحْمَرُ', 'الأَزْرَقُ']],
    ['مَا لَوْنُ السَّمَاءِ؟', ['السَّمَاءُ زَرْقَاءُ']],
    ['مَا لَوْنُ المَوْزِ؟', ['المَوْزُ أَصْفَرُ']],
    ['مَا لَوْنُ العُشْبِ؟', ['العُشْبُ أَخْضَرُ']],
    ['مَا لَوْنُ مَلَابِسِكِ اليَوْمَ؟', ['مَلَابِسِي وَرْدِيَّةٌ', 'مَلَابِسِي بَيْضَاءُ']]] },
  { id: 'food', icon: '🍎', t: 'الأَكْل', a: 'عَنِ الأَكْلِ', q: [
    ['مَا أَكْلُكِ المُفَضَّلُ؟', ['أُحِبُّ الأَرُزَّ', 'أُحِبُّ المَكَرُونَةَ']],
    ['مَاذَا أَكَلْتِ اليَوْمَ؟', ['أَكَلْتُ خُبْزًا وَجُبْنًا']],
    ['هَلْ تُحِبِّينَ الفَاكِهَةَ؟', ['نَعَمْ، أُحِبُّ التُّفَّاحَ']],
    ['مَاذَا تَشْرَبِينَ فِي الصَّبَاحِ؟', ['أَشْرَبُ الحَلِيبَ']],
    ['هَلْ تُحِبِّينَ الحَلْوَى؟', ['نَعَمْ، كَثِيرًا']]] },
  { id: 'family', icon: '👨‍👩‍👧', t: 'عَائِلَتِي', a: 'عَنْ عَائِلَتِكِ', q: [
    ['كَمْ أَخًا وَأُخْتًا عِنْدَكِ؟', ['عِنْدِي أَخٌ وَاحِدٌ', 'عِنْدِي أُخْتٌ']],
    ['مَاذَا تَلْعَبِينَ مَعَ عَائِلَتِكِ؟', ['نَلْعَبُ بِالكُرَةِ']],
    ['مَنْ يَطْبُخُ فِي بَيْتِكُمْ؟', ['مَامَا تَطْبُخُ']],
    ['مَاذَا تُحِبِّينَ أَنْ تَفْعَلِي مَعَ بَابَا؟', ['أُحِبُّ أَنْ أَلْعَبَ مَعَ بَابَا']],
    ['مَنْ يَقْرَأُ لَكِ القِصَصَ؟', ['مَامَا تَقْرَأُ لِي']]] },
  { id: 'day', icon: '☀️', t: 'يَوْمِي', a: 'عَنْ يَوْمِكِ', q: [
    ['كَيْفَ حَالُكِ اليَوْمَ؟', ['أَنَا بِخَيْرٍ، الحَمْدُ لِلَّهِ']],
    ['مَاذَا فَعَلْتِ اليَوْمَ؟', ['ذَهَبْتُ إِلَى المَدْرَسَةِ', 'لَعِبْتُ فِي البَيْتِ']],
    ['مَا لُعْبَتُكِ المُفَضَّلَةُ؟', ['أُحِبُّ الدُّمْيَةَ', 'أُحِبُّ السَّيَّارَاتِ']],
    ['مَاذَا تُحِبِّينَ أَنْ تَرْسُمِي؟', ['أُحِبُّ أَنْ أَرْسُمَ الشَّمْسَ']],
    ['مَتَى تَنَامِينَ؟', ['أَنَامُ فِي اللَّيْلِ']]] }
];
var C_REACT = ['جَمِيلٌ جِدًّا! 🌟', 'رَائِعٌ! 👏', 'أَحْسَنْتِ الكَلَامَ! 😊', 'مُمْتَازٌ! 🦜', 'مَا شَاءَ اللَّهُ! ✨'];
var C = { topic: null, qi: 0, turns: 0, history: [], hints: [], rec: null, listening: false, busy: false, last: '' };

function cSpeak(t) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(gx(t).replace(/[\u{1F300}-\u{1FAFF}☀-➿️‍]/gu, '').split('{name}').join(S.name));
    u.lang = 'ar-SA'; u.rate = 0.8; u.pitch = 1.3; // a bright parrot voice
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function cFill(t) { return gx(t).split('{name}').join(S.name); }
function cLog(who, text) {
  var row = mEl('div', 'cRow ' + (who === 'kid' ? 'cKid' : 'cKoko')), log = $('cLog');
  if (who === 'koko') row.appendChild(mEl('span', 'cAv', '🦜'));
  row.appendChild(mEl('div', 'cMsg', who === 'koko' ? cFill(text) : text));
  if (who === 'kid') row.appendChild(mEl('span', 'cAv', pCur().avatar));
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}
function cKoko(text, hints) {
  C.last = text; C.hints = hints || [];
  C.history.push({ who: 'koko', text: text });
  cLog('koko', text); cSpeak(text); cHints();
}
function cHints() {
  var box = $('cHints');
  box.textContent = '';
  if (!C.hints.length) return;
  box.appendChild(mEl('span', 'cHintT', gx('💡 يُمْكِنُكِ أَنْ تَقُولِي:')));
  C.hints.forEach(function (h) {
    var b = mEl('button', 'cHint', cFill(h));
    b.onclick = function () { cSpeak(h); }; // hear it, then say it
    box.appendChild(b);
  });
}
function cTopics() {
  var box = $('cTopics');
  box.textContent = '';
  C_TOPICS.forEach(function (tp) {
    var b = mEl('button', 'cTopic' + (C.topic === tp ? ' on' : ''), tp.icon + ' ' + tp.t);
    b.onclick = function () { cStart(tp); };
    box.appendChild(b);
  });
}
function cEnter() {
  cTopics();
  if (!C.topic && !$('cLog').children.length) {
    C.history = [];
    cKoko('مَرْحَبًا يَا {name}! أَنَا كُوكُو 🦜 هَيَّا نَتَكَلَّمُ! اِخْتَارِي مَوْضُوعًا.', []);
  }
}
function cStart(tp) {
  cStop();
  C.topic = tp; C.qi = 0; C.turns = 0; C.history = [];
  $('cLog').textContent = '';
  cTopics();
  var q = tp.q[0];
  cKoko('هَيَّا نَتَكَلَّمُ ' + tp.a + '! ' + q[0], q[1]);
}

/* ----- the child talks ----- */
function cStop() {
  if (C.listening && C.rec) { try { C.rec.abort(); } catch (e) {} }
  C.listening = false; $('cMic').classList.remove('on'); $('cCard').classList.remove('listening');
}
function cListen() {
  if (C.busy) return;
  if (!C.topic) { cKoko('اِخْتَارِي مَوْضُوعًا أَوَّلًا 👆', []); return; }
  if (!SR) { $('cNote').textContent = 'التعرف على الصوت غير متاح في هذا المتصفح.'; return; }
  if (C.listening) { try { C.rec.stop(); } catch (e) {} return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  var rec = new SR(), got = false;
  rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 3; rec.continuous = false;
  C.rec = rec;
  rec.onstart = function () { C.listening = true; $('cMic').classList.add('on'); $('cCard').classList.add('listening'); };
  rec.onresult = function (e) { got = true; var t = (e.results[0] && e.results[0][0] && e.results[0][0].transcript || '').trim(); if (t) cAnswer(t); };
  rec.onerror = function (e) {
    got = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') $('cNote').textContent = 'الميكروفون مقفول. اسمحوا بالميكروفون للعبة.';
    else if (e.error !== 'aborted') cKoko('لَمْ أَسْمَعْكِ جَيِّدًا 🦜 قُولِيهَا مَرَّةً أُخْرَى', C.hints);
  };
  rec.onend = function () { cStop(); if (!got) $('cNote').textContent = gx('اِضْغَطِي 🎤 وَتَكَلَّمِي'); };
  try { rec.start(); } catch (e) { cStop(); }
}
function cAnswer(text) {
  cLog('kid', text);
  C.history.push({ who: 'kid', text: text });
  C.turns++; track('chat', null, true);
  if (C.turns === 5) { S.stars++; trackStar('chat'); save(); renderHud(); soundStar(); confetti(30); var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
  else soundGood();
  if (S.chatAI && aiBase()) cAI(); else cScript();
}
// without AI: praise, then the next question of the topic
function cScript() {
  var tp = C.topic, react = C_REACT[Math.floor(Math.random() * C_REACT.length)];
  C.qi++;
  if (C.qi < tp.q.length) { var q = tp.q[C.qi]; cKoko(react + ' ' + q[0], q[1]); return; }
  C.topic = null; cTopics();
  cKoko(react + ' اِسْتَمْتَعْتُ بِالكَلَامِ مَعَكِ يَا {name}! اِخْتَارِي مَوْضُوعًا آخَرَ 🦜', []);
}
// with AI: Claude answers; if the server does not answer, the script goes on
function cAI() {
  C.busy = true; $('cMic').disabled = true; $('cNote').textContent = '🦜 …';
  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
  fetch(aiBase() + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ topic: C.topic.t, age: pCur().age, gender: pCur().gender === 'boy' ? 'boy' : 'girl', history: C.history.slice(-10) }) })
    .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
    .then(function (r) {
      if (!r || !r.reply) throw new Error('empty');
      clearTimeout(timer); C.busy = false; $('cMic').disabled = false; $('cNote').textContent = '';
      cKoko(r.reply, (r.hints || []).slice(0, 2));
      if (r.done) { C.topic = null; cTopics(); }
    })
    .catch(function () { clearTimeout(timer); C.busy = false; $('cMic').disabled = false; $('cNote').textContent = ''; cScript(); });
}
$('cMic').onclick = cListen;
$('cHear').onclick = function () { if (C.last) cSpeak(C.last); };
$('cNew').onclick = function () { cStop(); C.topic = null; C.history = []; $('cLog').textContent = ''; cTopics(); cKoko('اِخْتَارِي مَوْضُوعًا جَدِيدًا 👆', []); };
