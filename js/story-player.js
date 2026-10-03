// حكايات: story player and voice quiz (tab hidden for now).
'use strict';

/* ================= حكايات: true stories told in simple standard Arabic, then questions answered by voice ================= */
var STORIES = window.TALA_STORIES || [];
var ST_DEFAULT_JUDGE = 'https://tala-judge.onrender.com';
var ST_SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
var ST = { s: null, i: 0, playing: false, token: 0, after: 0, player: new Audio(), url: null, clips: {}, qi: 0, tries: 0, got: 0, res: [],
           rec: null, listening: false, aborted: false, busy: false, utts: [], files: {}, fileVoice: '' };
// the Quran verses are recited by Sheikh Mahmoud Khalil Al-Husary (teaching recitation), from the EveryAyah archive
var ST_RECITER = 'https://everyayah.com/data/Husary_Muallim_128kbps/';
var SURAH = { 11: 'هود', 17: 'الإسراء', 21: 'الأنبياء', 27: 'النمل', 28: 'القصص', 66: 'التحريم', 105: 'الفيل' };
// fixed sentences the owl says in the quiz (also made once as audio files)
var ST_UI = window.TALA_UI || {};
function stIsQuran(part) { return Array.isArray(part[1]); }
// a story is offered when every part of it has its recording (no story is told by the phone's own voice)
function stReady(s) { return s.p.every(function (p, i) { return stIsQuran(p) || !!ST.files[s.id + ':p' + i]; }); }
function stTile() {
  var n = STORIES.filter(stReady).length;
  $('hTileStory').hidden = !n;
  $('hSubStory').textContent = n ? mNumAr(n) + ' قصص' : '';
  if (view === 'home') homeRender(); // the go-on card may point to the stories
}
function stLoadFiles() {
  if (!window.fetch) return;
  fetch('audio/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (m && m.files) { ST.files = m.files; ST.fileVoice = m.voice || ''; stTile(); if (view === 'story' && !$('stList').hidden) stList(); }
  }, function () {});
}
// play a list of audio addresses one after another
function stPlayUrls(urls, tok, done, fail) {
  var k = 0;
  (function next() {
    if (tok !== ST.token) return;
    if (k >= urls.length) { if (done) done(); return; }
    ST.player.onended = next;
    ST.player.onerror = function () { if (tok === ST.token && fail) fail(); };
    ST.player.src = urls[k++];
    var pr = ST.player.play();
    if (pr && pr.catch) pr.catch(function () { if (tok === ST.token && fail) fail(); });
  })();
}

// the phone's voice: an Egyptian Arabic one if the device has it, otherwise any Arabic voice
function stVoicePick() {
  if (!window.speechSynthesis) return null;
  var eg = null, egBest = null, ar = null;
  (window.speechSynthesis.getVoices() || []).forEach(function (v) {
    var l = String(v.lang || '').replace('_', '-').toLowerCase();
    if (l.indexOf('ar-eg') === 0) { if (!eg) eg = v; if (!egBest && /salma|natural|online/i.test(v.name)) egBest = v; }
    if (!ar && l.indexOf('ar') === 0) ar = v;
  });
  return (typeof voiceBest === 'function' && voiceBest()) || egBest || eg || ar; // the stories are in standard Arabic now
}
function stVoiceText() {
  var n = Object.keys(ST.files).length;
  if (n) return 'Storyteller: AI-generated voice (' + (ST.fileVoice || 'neural voice') + ')  ·  Quran: Sheikh Mahmoud Khalil Al-Husary';
  var v = stVoicePick();
  if (!v) return 'Story voice: no Arabic voice found on this device';
  return 'Story voice: ' + v.name + (/^ar[-_]eg/i.test(v.lang) ? ' (Egyptian)' : ' (' + v.lang + ', not Egyptian on this device)');
}
function stClean(t) {
  return String(t).replace(/[\u06D6-\u06ED«»]/g, '').replace(/[\u2600-\u27BF\uFE0F\u200D]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/\s+/g, ' ').trim();
}
// Safari only lets sound start from a tap: wake the voice and the audio player during taps
function stUnlock() {
  try { ST.player.src = ST_SILENT; var pr = ST.player.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  try { if (window.speechSynthesis && !window.speechSynthesis.speaking) window.speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) {}
}
function stHush() { // stop any voice (not the microphone)
  ST.token++;
  clearTimeout(ST.after);
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  try { ST.player.onended = ST.player.onerror = null; ST.player.pause(); } catch (e) {}
  if (ST.url) { URL.revokeObjectURL(ST.url); ST.url = null; }
}
function stTTS(text, tok, done) {
  var clean = stClean(text);
  if (!window.speechSynthesis || !clean) { ST.after = setTimeout(function () { if (tok === ST.token && done) done(); }, Math.min(15000, 600 + clean.length * 70)); return; }
  var parts = [], buf = '';
  (clean.match(/[^.!؟?،:]+[.!؟?،:]*/g) || [clean]).forEach(function (x) {
    if (buf && (buf + x).length > 160) { parts.push(buf); buf = ''; }
    buf += x;
  });
  if (buf.trim()) parts.push(buf);
  var v = stVoicePick(), k = 0;
  ST.utts = [];
  (function next() {
    if (tok !== ST.token) return;
    if (k >= parts.length) { if (done) done(); return; }
    var u = new SpeechSynthesisUtterance(parts[k++].trim());
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ar-EG';
    u.rate = 0.8;
    u.onend = next;
    u.onerror = function (e) { if (e.error !== 'interrupted' && e.error !== 'canceled') next(); };
    ST.utts.push(u); // keep a reference, or some browsers lose the "end" event
    window.speechSynthesis.speak(u);
  })();
}
// say something: the parent's recording if there is one, else the saved Egyptian audio file, else the phone's voice
function stSay(key, text, done) {
  stHush();
  var tok = ST.token;
  if (key && !ST.clips[key] && ST.files[key]) { stPlayUrls([ST.files[key]], tok, done, function () { stTTS(text, tok, done); }); return; }
  if (!key || !ST.clips[key]) { stTTS(text, tok, done); return; }
  recGet(key).then(function (blob) {
    if (tok !== ST.token) return;
    if (!blob) { stTTS(text, tok, done); return; }
    ST.url = URL.createObjectURL(blob);
    ST.player.onended = function () { if (tok === ST.token && done) done(); };
    ST.player.onerror = function () { if (tok === ST.token) stTTS(text, tok, done); };
    ST.player.src = ST.url;
    var pr = ST.player.play();
    if (pr && pr.catch) pr.catch(function () { if (tok === ST.token) stTTS(text, tok, done); });
  }, function () { if (tok === ST.token) stTTS(text, tok, done); });
}

/* ----- recordings in the parent's voice (kept on this device, in IndexedDB) ----- */
var recDbP = null;
function recDb() {
  if (!recDbP) recDbP = new Promise(function (ok, no) {
    if (!window.indexedDB) { no(new Error('no storage')); return; }
    var r = indexedDB.open('tala-voice', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('clips'); };
    r.onsuccess = function () { ok(r.result); };
    r.onerror = function () { no(r.error); };
  });
  return recDbP;
}
function recTx(mode, fn) {
  return recDb().then(function (db) {
    return new Promise(function (ok, no) {
      var q = fn(db.transaction('clips', mode).objectStore('clips'));
      q.onsuccess = function () { ok(q.result); };
      q.onerror = function () { no(q.error); };
    });
  });
}
function recGet(k) { return recTx('readonly', function (st) { return st.get(k); }); }
function recPut(k, b) { return recTx('readwrite', function (st) { return st.put(b, k); }); }
function recDelete(k) { return recTx('readwrite', function (st) { return st.delete(k); }); }
function recKeys() {
  return recTx('readonly', function (st) { return st.getAllKeys(); }).then(function (ks) {
    var m = {}; (ks || []).forEach(function (k) { m[k] = 1; }); ST.clips = m; return m;
  }, function () { ST.clips = {}; return {}; });
}

/* ----- story list and player ----- */
function stShowCard(which) {
  $('stList').hidden = which !== 'list'; $('stPlay').hidden = which !== 'play'; $('stQuiz').hidden = which !== 'quiz';
}
function stList() {
  stHush(); stMicStop();
  ST.s = null; ST.playing = false;
  stShowCard('list');
  var g = $('stGrid'); g.innerHTML = '';
  if (!STORIES.length) g.appendChild(mEl('p', 'note', 'The stories could not be loaded (stories.js is missing).'));
  STORIES.filter(stReady).forEach(function (s) {
    var b = mEl('button', 'stCard'), best = (S.stBest || {})[s.id];
    b.type = 'button';
    b.appendChild(mEl('span', 'em', s.e));
    b.appendChild(mEl('span', 'tt', s.t));
    b.appendChild(mEl('span', 'sc', best != null ? '⭐ ' + mNumAr(best) + ' / ' + mNumAr(s.q.length) : '✨ جَدِيدَة'));
    b.onclick = function () { stUnlock(); stOpen(s); };
    g.appendChild(b);
  });
  $('stVoice').textContent = stVoiceText();
}
function stShow() {
  var p = ST.s.p[ST.i], box = $('stText');
  $('stScene').textContent = p[0];
  box.classList.toggle('quran', stIsQuran(p));
  if (stIsQuran(p)) {
    box.textContent = p[1].map(function (a, j) { return a + ' ﴿' + mNumAr(p[2][1] + j) + '﴾'; }).join(' ');
    box.appendChild(mEl('span', 'ref', 'سورة ' + (SURAH[p[2][0]] || p[2][0]) + (p[1].length > 1 ? '' : '، الآية ' + mNumAr(p[2][1]))));
  } else box.textContent = p[1];
  $('stFill').style.width = Math.round((ST.i + 1) / ST.s.p.length * 100) + '%';
  $('stPlayBtn').textContent = ST.playing ? '⏸️' : '▶️';
}
function stOpen(s) {
  ST.s = s; ST.i = 0; ST.playing = true;
  stShowCard('play');
  $('stTitle').textContent = s.e + ' ' + s.t;
  $('stSrc').textContent = s.src;
  stShow();
  stWake();
  recKeys().then(function () { if (ST.s === s && ST.playing) stPlayFrom(0); });
}
function stPlayFrom(i) {
  var s = ST.s, part = s.p[i];
  ST.i = i; ST.playing = true; stShow();
  function after() {
    if (!ST.playing || ST.s !== s) return;
    var tok = ST.token;
    if (ST.i + 1 < s.p.length) ST.after = setTimeout(function () { if (tok === ST.token && ST.playing) stPlayFrom(ST.i + 1); }, 1100);
    else { ST.playing = false; stShow(); ST.after = setTimeout(function () { if (tok === ST.token) stQuizStart(); }, 900); }
  }
  if (stIsQuran(part)) { // a real reciter; without internet the verse stays on screen for a moment instead
    stHush();
    var tok = ST.token, urls = part[1].map(function (a, j) { var n = String(part[2][0]).padStart(3, '0') + String(part[2][1] + j).padStart(3, '0'); return ST_RECITER + n + '.mp3'; });
    stPlayUrls(urls, tok, after, function () { ST.after = setTimeout(function () { if (tok === ST.token) after(); }, 6000); });
    return;
  }
  stSay(s.id + ':p' + i, part[1], after);
}
function stPause() { ST.playing = false; stHush(); if (ST.s) stShow(); }
$('stPlayBtn').onclick = function () { stUnlock(); if (ST.playing) stPause(); else stPlayFrom(ST.i); };
$('stPrev').onclick = function () { stUnlock(); stPlayFrom(Math.max(0, ST.i - 1)); };
$('stNext').onclick = function () { stUnlock(); if (ST.i + 1 < ST.s.p.length) stPlayFrom(ST.i + 1); else { stPause(); stQuizStart(); } };
$('stBack').onclick = stList;
$('stBack2').onclick = stList;

/* ----- questions, answered by voice ----- */
function stPips() {
  var p = $('stPips'); p.innerHTML = '';
  ST.s.q.forEach(function (q, i) {
    var r = ST.res[i];
    p.appendChild(mEl('div', 'pip' + (r === 1 ? ' on' : ''), r === 1 ? '⭐' : r === 2 ? '–' : (i === ST.qi ? '•' : '')));
  });
}
function stQuizStart() {
  if (!ST.s) return;
  stHush();
  ST.qi = 0; ST.got = 0; ST.res = [];
  stShowCard('quiz');
  $('stTitle2').textContent = ST.s.e + ' ' + ST.s.t;
  stAsk(true);
}
function stAsk(first) {
  var s = ST.s, q = s.q[ST.qi];
  ST.tries = 0; ST.busy = false;
  $('stQ').textContent = q.q;
  $('stNote').textContent = '';
  $('stOk').hidden = true; $('stNo').hidden = true;
  $('stMic').disabled = false;
  stPips();
  popBubble($('stBubble'), first ? 'اِنْتَهَتِ الحِكَايَةُ! هَيَّا نَرَى مَاذَا تَتَذَكَّرِينَ 🤔' : 'اِسْتَمِعِي إِلَى السُّؤَالِ 👂');
  function ask() {
    stSay(s.id + ':q' + ST.qi, q.q, function () {
      popBubble($('stBubble'), 'اِضْغَطِي 🎤 وَأَجِيبِي');
      if (!SR) { $('stOk').hidden = false; $('stNo').hidden = false; $('stNote').textContent = 'This browser cannot listen: she answers aloud and you tap ✔ or ✘.'; }
    });
  }
  if (first) stSay('ui:start', ST_UI['ui:start'], ask); else ask();
}
function stMicStop() {
  if (ST.rec && ST.listening) { ST.aborted = true; try { ST.rec.abort(); } catch (e) {} }
  ST.listening = false;
  $('stMic').classList.remove('on');
}
$('stMic').onclick = function () {
  if (ST.busy || !ST.s) return;
  stUnlock();
  if (!SR) { popBubble($('stBubble'), 'قُولِي الإِجَابَةَ لِمَامَا أَوْ بَابَا 👂'); $('stOk').hidden = false; $('stNo').hidden = false; return; }
  if (ST.listening) { try { ST.rec.stop(); } catch (e) {} return; }
  stHush();
  var r = new SR(), got = false;
  ST.rec = r; ST.aborted = false;
  r.lang = 'ar-EG'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
  r.onstart = function () { ST.listening = true; $('stMic').classList.add('on'); popBubble($('stBubble'), 'أَسْمَعُكِ... 👂'); };
  r.onresult = function (e) {
    got = true;
    var alts = [];
    for (var i = 0; i < e.results.length; i++) for (var j = 0; j < e.results[i].length; j++) if (e.results[i][j].transcript) alts.push(e.results[i][j].transcript);
    if (alts.length) stJudge(alts);
  };
  r.onerror = function (e) {
    if (ST.aborted) return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      popBubble($('stBubble'), 'المِيكْرُوفُونُ مُغْلَقٌ 🔇');
      $('stNote').textContent = 'The microphone is blocked. Allow it for this site, or let her answer aloud and tap ✔ or ✘.';
      $('stOk').hidden = false; $('stNo').hidden = false;
    } else if (e.error === 'network') {
      $('stNote').textContent = 'Listening needs an internet connection.';
      popBubble($('stBubble'), 'حَاوِلِي مَرَّةً أُخْرَى 🎤');
    } else if (e.error !== 'aborted') popBubble($('stBubble'), 'لَمْ أَسْمَعْ شَيْئًا 🎤 حَاوِلِي مَرَّةً أُخْرَى');
  };
  r.onend = function () {
    ST.listening = false; $('stMic').classList.remove('on');
    if (!got && !ST.aborted && !ST.busy && $('stBubble').textContent.indexOf('👂') > -1) popBubble($('stBubble'), 'لَمْ أَسْمَعْ شَيْئًا 🎤 حَاوِلِي مَرَّةً أُخْرَى');
  };
  try { r.start(); } catch (e) {}
};

function stJudgeUrl() { return String(S.stJudge == null ? ST_DEFAULT_JUDGE : S.stJudge).trim().replace(/\/+$/, ''); }
function stWake() { var u = stJudgeUrl(); if (u && window.fetch) fetch(u + '/health').catch(function () {}); } // a sleeping server wakes up while she listens
function stRemote(q, alts) {
  var u = stJudgeUrl();
  if (!u || !window.fetch) return Promise.reject(new Error('no server'));
  var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
  return fetch(u + '/judge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ story: ST.s.t, question: q.q, expected: q.a, heard: alts.slice(0, 5), name: S.name })
  }).then(function (r) {
    clearTimeout(t);
    if (!r.ok) throw new Error('status ' + r.status);
    return r.json();
  }).then(function (j) {
    if (typeof j.correct !== 'boolean') throw new Error('bad reply');
    return { correct: j.correct, feedback: String(j.feedback || ''), ai: true };
  });
}
function stLocal(q, alts) { // offline check: one of the key words is in what she said
  var ok = alts.some(function (a) { var n = norm(a); return q.k.some(function (k) { var kk = norm(k); return kk && n.indexOf(kk) > -1; }); });
  return { correct: ok, feedback: '', ai: false };
}
function stJudge(alts) {
  if (!ST.s) return;
  var s = ST.s, qi = ST.qi, q = s.q[qi];
  ST.busy = true; $('stMic').disabled = true;
  $('stNote').textContent = 'سمعتُ: «' + alts[0] + '»';
  var b = $('stBubble'); b.textContent = 'أُفَكِّرُ... '; b.appendChild(mEl('span', 'stThink', '🤔'));
  stRemote(q, alts).catch(function () { return stLocal(q, alts); }).then(function (r) {
    if (ST.s !== s || ST.qi !== qi) return;
    ST.busy = false;
    $('stNote').textContent += r.ai ? '  ·  🤖 AI' : '  ·  offline check';
    if (r.correct) stRight(r.feedback); else stWrong(r.feedback);
  });
}
function stRight(fb) {
  ST.res[ST.qi] = 1; ST.got++;
  S.stars++; track('story', null, true); trackStar('story'); save(); renderHud();
  var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  soundGood(); confetti(12); stPips();
  $('stOk').hidden = true; $('stNo').hidden = true; $('stMic').disabled = true;
  var key = 'ui:right' + (1 + Math.floor(Math.random() * 4));
  popBubble($('stBubble'), (fb || ST_UI[key]) + ' 🌟');
  // spoken: the saved praise if there is one (natural voice), otherwise Claude's own words
  stSay(key, ST_UI[key], function () { var tok = ST.token; ST.after = setTimeout(function () { if (tok === ST.token) stNextQ(); }, 700); }); // spoken: the recorded praise; shown: the AI's own words
}
function stWrong(fb) {
  var q = ST.s.q[ST.qi];
  ST.tries++; soundTry(); track('story', null, false);
  $('stOk').hidden = false; $('stNo').hidden = true;
  if (ST.tries < 2) {
    var key = 'ui:try' + ST.tries;
    popBubble($('stBubble'), (fb || ST_UI[key]) + ' 💪');
    $('stMic').disabled = false;
    stSay(key, ST_UI[key]);
  } else {
    ST.res[ST.qi] = 2; stPips();
    $('stMic').disabled = true;
    var t2 = 'الإِجَابَةُ: ' + q.a;
    popBubble($('stBubble'), t2 + ' 💡');
    stSay(ST.s.id + ':a' + ST.qi, t2, function () { var tok = ST.token; ST.after = setTimeout(function () { if (tok === ST.token) stNextQ(); }, 1500); });
  }
}
function stNextQ() {
  stHush(); stMicStop();
  ST.qi++;
  if (ST.qi >= ST.s.q.length) stFinish(); else stAsk(false);
}
function stFinish() {
  var s = ST.s, n = s.q.length;
  S.stBest = S.stBest || {};
  S.stBest[s.id] = Math.max(S.stBest[s.id] || 0, ST.got);
  save();
  var endKey = ST.got === n ? 'ui:endAll' : ST.got >= 3 ? 'ui:endGood' : 'ui:endTry', msg = ST_UI[endKey];
  $('sdTitle').textContent = s.e + ' ' + s.t;
  $('sdGot').textContent = ST.got;
  $('sdEmoji').textContent = ST.got === n ? '🏆' : ST.got >= 3 ? '⭐' : '💛';
  $('sdMsg').textContent = msg;
  $('stDone').hidden = false;
  if (ST.got >= 3) { soundStar(); confetti(40); }
  stSay(endKey, msg);
  $('sdBack').focus();
}
$('sdBack').onclick = function () { $('stDone').hidden = true; stList(); };
$('stQHear').onclick = function () { if (!ST.s || ST.busy) return; stUnlock(); stSay(ST.s.id + ':q' + ST.qi, ST.s.q[ST.qi].q); };
$('stQSkip').onclick = function () { if (!ST.s || ST.busy) return; if (!ST.res[ST.qi]) ST.res[ST.qi] = 2; stNextQ(); };
$('stOk').onclick = function () { if (!ST.s || ST.res[ST.qi] === 1) return; stMicStop(); ST.busy = false; stRight(''); };
$('stNo').onclick = function () { if (!ST.s || ST.busy) return; stWrong(''); };
function stEnter() {
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  stLoadFiles();
  if (!ST.s) stList();
  else if (!$('stPlay').hidden) stShow();
}
if (window.speechSynthesis && 'onvoiceschanged' in window.speechSynthesis) {
  window.speechSynthesis.addEventListener('voiceschanged', function () { $('stVoice').textContent = stVoiceText(); });
}

/* ----- parent: record the stories in their own voice ----- */
var RC = { s: null, i: 0, mr: null, discard: false };
function recItems(s) {
  return s.p.map(function (p, i) { return { key: s.id + ':p' + i, text: p[1], label: 'Part ' + (i + 1) + ' of ' + s.p.length, quran: stIsQuran(p) }; })
    .filter(function (x) { return !x.quran; })
    .concat(s.q.map(function (q, i) { return { key: s.id + ':q' + i, text: q.q, label: 'Question ' + (i + 1) + ' of ' + s.q.length }; }));
}
function recShow() {
  var items = recItems(RC.s), it = items[RC.i], done = items.filter(function (x) { return ST.clips[x.key]; }).length, has = !!ST.clips[it.key];
  $('recPos').textContent = it.label + '  ·  ' + done + ' of ' + items.length + ' parts recorded';
  $('recText').textContent = it.text;
  $('recPlay').disabled = !has; $('recDel').disabled = !has;
  $('recPrev').disabled = RC.i === 0; $('recNext').disabled = RC.i === items.length - 1;
  $('recStatus').textContent = has ? '✅ Recorded in your voice' : 'Not recorded yet: the phone reads this part';
}
function recStop(discard) { if (RC.mr) { RC.discard = !!discard; try { RC.mr.stop(); } catch (e) {} } }
function recStart() {
  if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('recStatus').textContent = 'This browser cannot record audio.'; return; }
  stHush();
  var key = recItems(RC.s)[RC.i].key;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    var type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
    var mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream), chunks = [];
    RC.mr = mr; RC.discard = false;
    mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      RC.mr = null;
      $('recBtn').textContent = '⏺ Record'; $('recBtn').classList.remove('recOn');
      var blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
      if (RC.discard || !blob.size) { recShow(); return; }
      recPut(key, blob).then(function () { ST.clips[key] = 1; recShow(); $('recStatus').textContent = '✅ Saved. Listen to check it, or go to the next part ▶▶'; },
        function () { $('recStatus').textContent = 'Could not save the recording on this device.'; });
    };
    mr.start();
    $('recBtn').textContent = '⏹ Stop'; $('recBtn').classList.add('recOn');
    $('recStatus').textContent = '🔴 Recording… read the text aloud, then tap Stop';
  }, function () { $('recStatus').textContent = 'The microphone is blocked. Allow it for this site.'; });
}
$('recOpen').onclick = function () {
  if (!STORIES.length) return;
  stopAll();
  if (!$('recStory').options.length) STORIES.forEach(function (st, i) { var o = document.createElement('option'); o.value = i; o.textContent = st.e + ' ' + st.t; $('recStory').appendChild(o); });
  RC.s = STORIES[$('recStory').selectedIndex > 0 ? $('recStory').selectedIndex : 0]; RC.i = 0;
  $('parentPanel').hidden = true; $('recOv').hidden = false;
  recKeys().then(recShow);
};
$('recStory').onchange = function () { recStop(true); RC.s = STORIES[this.selectedIndex]; RC.i = 0; recShow(); };
$('recPrev').onclick = function () { recStop(false); if (RC.i > 0) { RC.i--; recShow(); } };
$('recNext').onclick = function () { recStop(false); if (RC.i < recItems(RC.s).length - 1) { RC.i++; recShow(); } };
$('recBtn').onclick = function () { if (RC.mr) recStop(false); else recStart(); };
$('recPlay').onclick = function () { stUnlock(); stSay(recItems(RC.s)[RC.i].key, recItems(RC.s)[RC.i].text); };
$('recDel').onclick = function () {
  var key = recItems(RC.s)[RC.i].key;
  recDelete(key).then(function () { delete ST.clips[key]; recShow(); });
};
$('recClose').onclick = function () { recStop(false); stHush(); $('recOv').hidden = true; };
$('stJudgeIn').onchange = function () { S.stJudge = this.value.trim(); save(); };
$('stJudgeTest').onclick = function () {
  var u = stJudgeUrl(), st = $('stJudgeStatus');
  if (!u) { st.textContent = 'No address: the game uses the offline check.'; return; }
  st.textContent = '⏳ Testing… a sleeping server can take up to a minute';
  var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 90000);
  // one real sample question, so this proves the server, the API key and Claude all work
  fetch(u + '/judge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ story: 'سيدنا يونس والحوت', question: 'مين اللي بلع سيدنا يونس؟', expected: 'الحوت', heard: ['الحوت هو اللي بلعه'], name: S.name })
  }).then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); }).then(function (x) {
    clearTimeout(t);
    if (x.status === 200 && x.j.correct === true) st.textContent = '✅ Works! Claude answered: ' + x.j.feedback;
    else if (x.j && x.j.error === 'server key') st.textContent = '❌ The server runs, but its ANTHROPIC_API_KEY is wrong or missing';
    else if (x.j && x.j.error === 'origin not allowed') st.textContent = '❌ The server does not allow this web address (ALLOWED_ORIGINS)';
    else st.textContent = '❌ The server answered with an error (' + x.status + (x.j && x.j.error ? ': ' + x.j.error : '') + '). See the Render logs.';
  }, function () { clearTimeout(t); st.textContent = '❌ Not reachable: the game uses the offline check'; });
};
