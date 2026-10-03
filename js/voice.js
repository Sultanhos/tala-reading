// A better Arabic voice for the whole app. Every Arabic line the app speaks (speechSynthesis.speak) comes here:
//  1. recorded audio made with VoiceStudio (tools/make-voice.mjs -> audio/voice/*.mp3, list in js/voice-manifest.js),
//     sentence by sentence, so long lines and math questions are put together from recorded pieces;
//  2. otherwise the phone's best Arabic voice (natural / online voices first) instead of the default robot voice.
// The child's name cannot be recorded in advance: lines with the name are played without it.
'use strict';

var VOICE = { files: window.VOICE_FILES || {}, base: 'audio/voice/', player: null, token: 0, best: null };

// the same key the recording tool uses: no emojis, tidy spaces and punctuation. "يَا + name" (calling her) is left out;
// a sentence with her name inside keeps {name} and is spoken by the phone (it cannot be recorded in advance)
function voiceKey(t) {
  var s = String(t);
  if (typeof S === 'object' && S.name) s = s.split('يَا ' + S.name).join('').split(S.name).join('{name}');
  s = s.split('يَا {name}').join('');
  return s.replace(/[\u{1F000}-\u{1FAFF}☀-➿⬀-⯿️‍⃣]/gu, '')
    .replace(/\s+([!؟?.،,:])/g, '$1').replace(/([!؟?.،,])\1+/g, '$1').replace(/\s+/g, ' ').trim();
}
// sentences, each with its end mark (the pieces that were recorded)
function voiceParts(t) {
  var key = voiceKey(t), m = key.match(/[^!؟?.،,:]+[!؟?.،,:]*/g) || [];
  return m.map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^[!؟?.،,:]+$/.test(x); });
}
function voiceFile(part) {
  if (part.indexOf('{name}') > -1) return null;
  // «كَمْ؟،» inside a row of numbers: first with its own end mark, then without any
  var f = VOICE.files[part] || VOICE.files[part.replace(/([!؟?.،,:])[!؟?.،,:]+$/, '$1')] || VOICE.files[part.replace(/[!؟?.،,:]+$/, '')];
  return f ? VOICE.base + f : null;
}
// the best Arabic voice the phone or computer has
function voiceBest() {
  if (VOICE.best !== null) return VOICE.best;
  var list = [];
  try { list = (window.speechSynthesis && window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : []) || []; } catch (e) {}
  var ar = list.filter(function (v) { return /^ar/i.test(v.lang); });
  if (!ar.length) return null; // voices may not be loaded yet: ask again next time
  function score(v) {
    var n = v.name + ' ' + v.voiceURI, s = 0;
    if (/natural|neural|online|premium|enhanced|wavenet|studio/i.test(n)) s += 10;
    if (/google/i.test(n)) s += 6;
    if (/microsoft/i.test(n) && !/natural|online/i.test(n)) s -= 2;
    if (/ar-(SA|EG|AE|JO|XA)/i.test(v.lang)) s += 2;
    if (v.localService === false) s += 1;
    return s;
  }
  VOICE.best = ar.sort(function (a, b) { return score(b) - score(a); })[0];
  return VOICE.best;
}

// every Arabic line the app can say, as the pieces that get recorded (girl and boy forms).
// Used by the recording tool: in the browser console, copy(JSON.stringify(voiceTexts())) -> tools/voice-texts.json
function voiceTexts() {
  var out = {}, boy = function (t) { var s = String(t); BOY_WORDS.forEach(function (p) { s = s.split(p[0]).join(p[1]); }); return s; };
  function add(t) { [t, boy(t)].forEach(function (x) { voiceParts(x).forEach(function (p) { if (p.indexOf('{name}') < 0) out[p] = 1; }); }); }
  LESSONS.forEach(function (L) { L[1].forEach(add); });                                    // reading: 🔊 the word
  WALL.forEach(function (c) {                                                               // writing: letter name, its word, its forms
    var i = WINFO[c]; add(i[0]); add(i[1]);
    wForms(c).forEach(function (f) { add(i[0] + ' ' + WFORM_NAME[f]); });
  });
  Object.keys(WWORD).forEach(function (w) { add(WWORD[w][0]); });
  NUMW.forEach(add);                                                                        // math
  ['زَائِد', 'نَاقِص', 'يُسَاوِي كَمْ؟', 'كَمْ؟', 'كَمْ عَدَدُهَا؟', 'أَيُّهُمَا أَكْبَرُ؟', 'أَيُّهُمَا أَصْغَرُ؟', 'أَمْ'].forEach(add);
  for (var t = 0; t < 4; t++) for (var a = 1; a <= 10; a++) for (var b = 1; b <= 9; b++) add(mStorySay(t, a, b)); // picture stories
  var A = SPK.ar;                                                                           // pronunciation (Arabic)
  A.pool.forEach(function (w) { add(w[0]); });
  A.qbank.forEach(function (lv) { lv.forEach(function (q) { add(q.q); }); });
  add(A.warmTts);
  RS_LOCAL.forEach(function (st) { add(st.t); st.s.forEach(add); });                         // stories to read
  (window.TALA_STORIES || []).forEach(function (st) {                                        // حكايات: the quiz (the story parts are whole files in audio/<story>/)
    st.q.forEach(function (q) { add(stClean(q.q)); add(stClean('الإِجَابَةُ: ' + q.a)); });
  });
  Object.keys(window.TALA_UI || {}).forEach(function (k) { add(stClean(window.TALA_UI[k])); });
  return Object.keys(out);
}

// sends the list to the recording tool (node tools/make-voice.mjs --collect)
function voiceExport() {
  return fetch('http://localhost:3911/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(voiceTexts()) })
    .then(function (r) { return r.text(); });
}

// the one audio player for every recorded line (iPhones allow sound without a tap only on a player a tap has woken)
function voicePlayer() {
  if (!VOICE.player) { VOICE.player = new Audio(); VOICE.player.preload = 'auto'; }
  return VOICE.player;
}
// a twentieth of a second of silence, made here so it is a real, playable sound
function voiceSilence() {
  if (VOICE.silence) return VOICE.silence;
  var n = 400, b = new DataView(new ArrayBuffer(44 + n * 2)), w = function (o, s) { for (var i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
  VOICE.silence = URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
  return VOICE.silence;
}
// On iPhones a sound may only start from a tap. The first tap anywhere wakes the player with a moment of silence,
// so that later lines (a new sum read out, Koko's answer) can start by themselves.
function voiceUnlock() {
  if (VOICE.unlocked) return;
  var a = voicePlayer();
  if (!a.paused) { VOICE.unlocked = true; return; } // a recorded line is already playing: the player is awake
  try {
    a.src = voiceSilence();
    var p = a.play();
    VOICE.unlocked = true;
    if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') VOICE.unlocked = false; }); // a real line took over: still awake
  } catch (e) {}
}
['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, voiceUnlock, true); });

(function () {
  var syn = window.speechSynthesis;
  if (!syn || !syn.speak) return;
  // Browsers keep speak() and cancel() on a shared prototype. They are changed there, because Safari can hand out a fresh
  // speechSynthesis object later, and a change made on the object itself would be gone (then the phone's voice speaks).
  var proto = Object.getPrototypeOf(syn), host = proto && proto !== Object.prototype && typeof proto.speak === 'function' ? proto : syn;
  var nativeSpeak = host.speak, nativeCancel = host.cancel;
  var rawSpeak = function (u) { return nativeSpeak.call(window.speechSynthesis, u); }, rawCancel = function () { return nativeCancel.call(window.speechSynthesis); };
  VOICE.syn = syn; // and the object itself is held on to
  function stopAudio() { VOICE.token++; if (VOICE.player) { try { VOICE.player.onended = VOICE.player.onerror = null; VOICE.player.pause(); } catch (e) {} } }
  host.cancel = function () { stopAudio(); rawCancel(); };
  host.speak = function (u) {
    var arabic = !u.lang || /^ar/i.test(u.lang);
    if (!arabic) { rawSpeak(u); return; }
    stopAudio();
    var urls = u.noRecording ? [] : voiceParts(u.text).map(voiceFile);
    if (urls.length && urls.every(Boolean)) { // all pieces recorded: play them one after another
      var tok = VOICE.token, k = 0;
      var a = voicePlayer();
      a.playbackRate = u.rate && u.rate < 0.8 ? 0.9 : 1; // "slowly" in the old voice: a little slower
      var next = function () {
        if (tok !== VOICE.token) return;
        if (k >= urls.length) { if (typeof u.onend === 'function') u.onend({}); return; }
        a.onended = next;
        a.onerror = function () { if (tok === VOICE.token) { stopAudio(); fallback(); } };
        a.src = urls[k++];
        var p = a.play(); if (p && p.catch) p.catch(function () { if (tok === VOICE.token) { stopAudio(); fallback(); } });
      };
      if (typeof u.onstart === 'function') u.onstart({});
      next();
      return;
    }
    fallback();
    function fallback() {
      var v = voiceBest();
      if (v && !u.voice) { u.voice = v; u.lang = v.lang; }
      rawSpeak(u);
    }
  };
  if ('onvoiceschanged' in syn) syn.addEventListener('voiceschanged', function () { VOICE.best = null; });
})();
