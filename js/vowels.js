// تدقيق الحركات: after the word itself was recognized, a small model on this device listens to the same recording
// and tells whether the vowel marks were read as written (كَتَبَ, not كُتِبَ). Parents switch it on in ⚙️ › القراءة;
// the model (about 165 MB) is downloaded once and kept by the browser. Nothing is sent anywhere.
'use strict';

var VW = { worker: null, state: 'idle', device: '', pct: 0, error: '', seq: 0, waiting: {}, stream: null, recorder: null, chunks: [], fails: 0, busy: false };
var VW_MARK = /[ً-ْٰ]/, VW_SHORT = ['َ', 'ِ', 'ُ', 'ْ']; // fatha, kasra, damma, sukun
var VW_MARGIN = 2.5; // how much better a wrong-vowel reading must fit before the child is asked again (test clips: real mistakes 4+, a false alarm 1.6)

function vwSupported() { return !!(window.Worker && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext)) && !(typeof IS_APP !== 'undefined' && IS_APP); }
function vwOn() { return S.vowelCheck === true && vwSupported(); }
function vwReady() { return vwOn() && VW.state === 'ready'; }

/* ----- the model ----- */
function vwLoad() {
  if (VW.state === 'loading' || VW.state === 'ready') return;
  VW.state = 'loading'; VW.pct = 0; VW.error = '';
  try {
    VW.worker = VW.worker || new Worker('js/vowel-worker.js', { type: 'module' });
  } catch (e) { VW.state = 'error'; VW.error = String(e && e.message || e); vwInfo(); return; }
  VW.worker.onmessage = function (e) {
    var m = e.data;
    if (m.type === 'progress') { VW.pct = Math.round(m.got / m.all * 100); vwInfo(); }
    if (m.type === 'ready') { VW.state = 'ready'; VW.device = m.device; vwInfo(); }
    if (m.type === 'result' && VW.waiting[m.id]) { VW.waiting[m.id].ok(m); delete VW.waiting[m.id]; }
    if (m.type === 'error') {
      if (m.id && VW.waiting[m.id]) { VW.waiting[m.id].no(new Error(m.message)); delete VW.waiting[m.id]; }
      else { VW.state = 'error'; VW.error = m.message; vwInfo(); }
    }
  };
  VW.worker.onerror = function (e) { VW.state = 'error'; VW.error = String(e && e.message || 'worker'); vwInfo(); };
  VW.worker.postMessage({ type: 'load' });
  vwInfo();
}
function vwInfo() { // the line under the switch in the parent area
  var el = $('vowelInfo');
  if (!el) return;
  el.textContent = !vwSupported() ? 'غير متاح على هذا الجهاز أو في تطبيق الهاتف حاليًا.'
    : S.vowelCheck !== true ? ''
    : VW.state === 'loading' ? 'جارٍ تجهيز النموذج… ' + (VW.pct ? mNumAr(VW.pct) + '٪' : '')
    : VW.state === 'ready' ? 'جاهز ✔' + (VW.device === 'webgpu' ? '' : ' (هذا الجهاز بطيء في التدقيق)')
    : VW.state === 'error' ? 'تعذّر تجهيز النموذج. تحقّقوا من الإنترنت ثم أعيدوا التشغيل.' : '';
}

/* ----- the word and its wrong-vowel readings ----- */
function vwUnits(word) { // letters, each with its marks
  var u = [];
  Array.from(String(word).normalize('NFC')).forEach(function (ch) { if (VW_MARK.test(ch) && u.length) u[u.length - 1].m += ch; else u.push({ l: ch, m: '' }); });
  return u;
}
// the word itself first, then every reading with ONE short vowel changed (the last letter is free: one may stop on it)
function vwCandidates(word) {
  var u = vwUnits(word), out = [{ c: u.map(function (x) { return x.l + x.m; }).join(''), at: -1 }];
  u.forEach(function (x, i) {
    if (i === u.length - 1 || !/[ء-ي]/.test(x.l)) return;
    var cur = VW_SHORT.filter(function (v) { return x.m.indexOf(v) > -1; })[0];
    if (!cur || /[ً-ٍ]/.test(x.m)) return; // only plain short vowels are swapped
    VW_SHORT.forEach(function (v) {
      if (v === cur) return;
      if (v === 'ْ' && (i === 0 || x.m.indexOf('ّ') > -1)) return; // no sukun on the first letter or under a shadda
      var c = u.map(function (y, k) { return k === i ? y.l + y.m.replace(cur, v) : y.l + y.m; }).join('');
      out.push({ c: c, at: i, v: v });
    });
  });
  return out;
}

/* ----- recording next to the speech recognizer ----- */
function vwCaptureStart() {
  vwCaptureDrop();
  if (!vwReady()) return;
  navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true } }).then(function (stream) {
    VW.stream = stream; VW.chunks = [];
    try {
      VW.recorder = new MediaRecorder(stream);
      VW.recorder.ondataavailable = function (e) { if (e.data && e.data.size) VW.chunks.push(e.data); };
      VW.recorder.start();
    } catch (e) { vwCaptureDrop(); }
  }, function () {});
}
function vwCaptureDrop() {
  try { if (VW.recorder && VW.recorder.state !== 'inactive') { VW.recorder.onstop = null; VW.recorder.stop(); } } catch (e) {}
  if (VW.stream) VW.stream.getTracks().forEach(function (t) { t.stop(); });
  VW.recorder = null; VW.stream = null; VW.chunks = [];
}
// stop and hand back the recording as 16 kHz samples (null when there is none)
function vwCaptureTake() {
  return new Promise(function (ok) {
    var r = VW.recorder, stream = VW.stream;
    if (!r || r.state === 'inactive') { vwCaptureDrop(); ok(null); return; }
    r.onstop = function () {
      var blob = new Blob(VW.chunks, { type: r.mimeType || 'audio/webm' });
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      VW.recorder = null; VW.stream = null; VW.chunks = [];
      blob.arrayBuffer().then(vwDecode).then(ok, function () { ok(null); });
    };
    try { r.stop(); } catch (e) { vwCaptureDrop(); ok(null); }
  });
}
function vwDecode(buf) {
  var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC({ sampleRate: 16000 });
  return ctx.decodeAudioData(buf).then(function (ab) { try { ctx.close(); } catch (e) {} return ab.getChannelData(0); });
}

/* ----- the verdict ----- */
// -> { ok, at (which letter), want, said, margin, ms }
function vwScore(audio, word) {
  var cands = vwCandidates(word);
  if (cands.length < 2 || !audio || audio.length < 16000 * 0.25) return Promise.resolve({ ok: true, skipped: true });
  return new Promise(function (ok, no) {
    var id = ++VW.seq, timer = setTimeout(function () { delete VW.waiting[id]; no(new Error('slow')); }, 15000);
    VW.waiting[id] = { ok: function (m) { clearTimeout(timer); ok(m); }, no: function (e) { clearTimeout(timer); no(e); } };
    var copy = new Float32Array(audio);
    VW.worker.postMessage({ type: 'score', id: id, audio: copy, cands: cands.map(function (x) { return x.c; }) }, [copy.buffer]);
  }).then(function (m) {
    var right = m.res[0].lp, best = 0;
    m.res.forEach(function (x, i) { if (x.lp > m.res[best].lp) best = i; });
    var margin = m.res[best].lp - right, wrong = best !== 0 && margin >= VW_MARGIN, u = vwUnits(word);
    return { ok: !wrong, at: wrong ? cands[best].at : -1, want: wrong ? u[cands[best].at].l + u[cands[best].at].m : '',
      said: wrong ? u[cands[best].at].l + cands[best].v : '', margin: margin, ms: m.ms, best: cands[best].c };
  });
}

/* ----- in the reading game: called when the speech recognizer has accepted the word ----- */
function vwReset() { VW.fails = 0; VW.busy = false; vwCaptureDrop(); }
// true = the vowel check takes over (it calls success() or asks again); false = no check, go on as before
function vwJudge(word) {
  if (!vwReady() || !VW.recorder || VW.fails >= 2) { vwCaptureDrop(); return false; }
  VW.busy = true;
  $('micBtn').disabled = true;
  say('أَسْتَمِعُ إِلَى الحَرَكَاتِ… 🔎');
  vwCaptureTake().then(function (audio) { return vwScore(audio, word); }).then(function (r) {
    VW.busy = false; $('micBtn').disabled = false;
    if (!cur || cur[0] !== word) return; // the child moved on meanwhile
    if (r.ok) { success(); return; }
    VW.fails++;
    track('read', word, false);
    soundTry();
    vwMark(word, r.at);
    say('اِنْتَبِهِي لِلْحَرَكَةِ: «' + r.want + '» 👀 اِسْتَمِعِي ثُمَّ حَاوِلِي');
    setTimeout(function () { if (cur && cur[0] === word && !locked) hearWord(); }, 900);
  }, function () { // no verdict (too slow, no recording): the word was right, so it counts
    VW.busy = false; $('micBtn').disabled = false;
    if (cur && cur[0] === word) success();
  });
  return true;
}
// show the word with the misread letter in red
function vwMark(word, at) {
  var u = vwUnits(word), el = $('word');
  el.textContent = '';
  u.forEach(function (x, i) {
    if (i === at) { var s = document.createElement('span'); s.className = 'vwBad'; s.textContent = x.l + x.m; el.appendChild(s); }
    else el.appendChild(document.createTextNode(x.l + x.m));
  });
}

/* ----- the switch in the parent area ----- */
$('vowelCb').onchange = function () {
  S.vowelCheck = this.checked; save();
  if (S.vowelCheck && vwSupported()) vwLoad();
  vwInfo();
};
