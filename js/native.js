// In the phone app (Capacitor), the web view has no speech recognition (and on Android no voice either).
// This puts the phone's own speech recognizer and voice behind the same browser interface the game uses,
// so the rest of the code works unchanged. In a normal browser it does nothing. Loaded first.
'use strict';

var IS_APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

function appPlugin(name) {
  var C = window.Capacitor;
  return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name));
}

if (IS_APP) (function () {
  /* ----- speech recognition: @capacitor-community/speech-recognition ----- */
  var REC = appPlugin('SpeechRecognition');
  function AppRecognition() {
    this.lang = 'ar-SA'; this.maxAlternatives = 5; this.interimResults = false; this.continuous = false;
    this.onstart = this.onresult = this.onerror = this.onend = null;
    this._aborted = false;
  }
  AppRecognition.prototype.start = function () {
    var self = this;
    function fire(name, ev) { if (typeof self[name] === 'function') self[name](ev || {}); }
    function errorCode(e) {
      var m = String((e && (e.message || e.code)) || e || '');
      if (/permission|denied|not.?allowed/i.test(m)) return 'not-allowed';
      if (/no.?match|no.?speech|timeout|didn'?t understand/i.test(m)) return 'no-speech';
      if (/network|server/i.test(m)) return 'network';
      if (self._aborted) return 'aborted';
      return 'no-speech';
    }
    REC.requestPermissions().then(function (st) {
      if (st && st.speechRecognition && st.speechRecognition !== 'granted') throw new Error('permission denied');
      fire('onstart');
      return REC.start({ language: self.lang, maxResults: self.maxAlternatives || 5, partialResults: false, popup: false });
    }).then(function (r) {
      if (self._aborted) return;
      var m = (r && r.matches) || [];
      if (!m.length) { fire('onerror', { error: 'no-speech' }); return; }
      fire('onresult', { results: [m.map(function (t) { return { transcript: t, confidence: 0 }; })] });
    }).catch(function (e) {
      fire('onerror', { error: errorCode(e) });
    }).then(function () { fire('onend'); });
  };
  AppRecognition.prototype.stop = function () { try { REC.stop(); } catch (e) {} };
  AppRecognition.prototype.abort = function () { this._aborted = true; try { REC.stop(); } catch (e) {} };
  window.SpeechRecognition = AppRecognition;
  window.webkitSpeechRecognition = AppRecognition;

  /* ----- voice: @capacitor-community/text-to-speech ----- */
  var TTS = appPlugin('TextToSpeech');
  function AppUtterance(text) {
    this.text = text == null ? '' : String(text);
    this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
    this.onstart = this.onend = this.onerror = null;
  }
  var queue = [], current = null;
  function next() {
    current = queue.shift() || null;
    synth.speaking = !!current; synth.pending = queue.length > 0;
    if (!current) return;
    var u = current;
    if (typeof u.onstart === 'function') u.onstart({});
    TTS.speak({ text: u.text, lang: u.lang || (u.voice && u.voice.lang) || 'ar-SA', rate: u.rate || 1, pitch: u.pitch || 1, volume: u.volume == null ? 1 : u.volume })
      .then(function () { if (u._cancelled) return; if (typeof u.onend === 'function') u.onend({}); })
      .catch(function () { if (u._cancelled) return; if (typeof u.onerror === 'function') u.onerror({ error: 'synthesis-failed' }); })
      .then(function () { if (current === u) next(); });
  }
  var synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak: function (u) { queue.push(u); if (!current) next(); else synth.pending = true; },
    cancel: function () {
      var all = (current ? [current] : []).concat(queue);
      queue = []; current = null; synth.speaking = false; synth.pending = false;
      all.forEach(function (u) { u._cancelled = true; if (typeof u.onerror === 'function') u.onerror({ error: 'canceled' }); });
      try { TTS.stop(); } catch (e) {}
    },
    getVoices: function () { return []; },
    pause: function () {}, resume: function () {},
    addEventListener: function () {}, removeEventListener: function () {}
  };
  try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true }); } catch (e) { window.speechSynthesis = synth; }
  window.SpeechSynthesisUtterance = AppUtterance;
})();
