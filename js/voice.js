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
  var f = VOICE.files[part] || VOICE.files[part.replace(/[!؟?.،,:]+$/, '')];
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
  var A = SPK.ar;                                                                           // pronunciation (Arabic)
  A.pool.forEach(function (w) { add(w[0]); });
  A.qbank.forEach(function (lv) { lv.forEach(function (q) { add(q.q); }); });
  add(A.warmTts);
  RS_LOCAL.forEach(function (st) { add(st.t); st.s.forEach(add); });                         // stories to read
  return Object.keys(out);
}

// sends the list to the recording tool (node tools/make-voice.mjs --collect)
function voiceExport() {
  return fetch('http://localhost:3911/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(voiceTexts()) })
    .then(function (r) { return r.text(); });
}

(function () {
  var syn = window.speechSynthesis;
  if (!syn || !syn.speak) return;
  var rawSpeak = syn.speak.bind(syn), rawCancel = syn.cancel.bind(syn);
  function stopAudio() { VOICE.token++; if (VOICE.player) { try { VOICE.player.onended = VOICE.player.onerror = null; VOICE.player.pause(); } catch (e) {} } }
  syn.cancel = function () { stopAudio(); rawCancel(); };
  syn.speak = function (u) {
    var arabic = !u.lang || /^ar/i.test(u.lang);
    if (!arabic) { rawSpeak(u); return; }
    stopAudio();
    var urls = u.noRecording ? [] : voiceParts(u.text).map(voiceFile);
    if (urls.length && urls.every(Boolean)) { // all pieces recorded: play them one after another
      var tok = VOICE.token, k = 0;
      if (!VOICE.player) VOICE.player = new Audio();
      var a = VOICE.player;
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
