// نطق warm-up: "سِي – سَا – سُو" (or German "Siii – Saaa – Sooo") x3 before training and game.
'use strict';

/* ----- warm-up checkpoint: "Siii – Saaa – Sooo" said right 3 times before training and game ----- */
var WARM = { need: 3, got: 0, fails: 0, last: null, done: false };
function warmSay(t) { popBubble($('warmBubble'), t); }
function warmPips() {
  var p = $('warmPips'); p.innerHTML = '';
  for (var i = 0; i < WARM.need; i++) {
    var d = document.createElement('div');
    d.className = 'pip' + (i < WARM.got ? ' on' : '');
    d.textContent = i < WARM.got ? '⭐' : '';
    p.appendChild(d);
  }
}
function warmStart() {
  WARM.got = 0; WARM.fails = 0; WARM.last = null; WARM.done = false;
  $('speakModes').hidden = true;
  $('trainCard').hidden = true; $('gameCard').hidden = true;
  $('warmCard').hidden = false;
  $('warmRate').hidden = true; $('warmGauge').hidden = true; $('warmOk').hidden = !S.alwaysOk;
  $('warmNote').textContent = '';
  warmPips();
  warmSay(sp('warmTap'));
}
function warmUnlock() {
  WARM.done = true;
  $('warmCard').hidden = true;
  $('speakModes').hidden = false;
  setMode(curMode);
}
function warmGood() {
  WARM.got++; WARM.fails = 0; warmPips();
  $('warmOk').hidden = !S.alwaysOk;
  if (WARM.got >= WARM.need) {
    soundStar(); confetti(30);
    warmSay(sp('warmDone'));
    setTimeout(warmUnlock, 2200);
  } else {
    soundGood(); confetti(8);
    warmSay(sp('warmRight', WARM.need - WARM.got));
  }
}
function warmBad(msg) {
  WARM.fails++; soundTry();
  warmSay(msg || sp('warmBad'));
  if (WARM.fails >= 2) $('warmOk').hidden = false;
}
$('warmHear').onclick = function () { speakPractice(sp('warmTts'), 0.55); };
$('warmOk').onclick = function () { if (!WARM.done && WARM.got < WARM.need) { $('warmRate').hidden = true; warmGood(); } };
$('warmMic').onclick = function () {
  if (WARM.done) return;
  $('warmRate').hidden = true; $('warmGauge').hidden = true; WARM.last = null;
  sRecord($('warmMic'), {
    start: function () { warmSay(sp('listening')); $('warmNote').textContent = ''; },
    result: function (a) {
      a.score = sScore(a);
      if (S.rateMode === 'parent') { // the parent decides; the rating also teaches the S-detector
        WARM.last = a; $('warmNote').textContent = sInfo(a, false);
        warmSay(sp('parentRates')); $('warmRate').hidden = false; return;
      }
      $('warmGauge').hidden = false; sMarker('warmMarker', a.score);
      $('warmNote').textContent = sInfo(a, true) + (a.sib ? '  ·  ' + a.runs + ' ×' : '');
      if (!a.sib) warmBad(sp('warmNoS'));
      else if (a.runs < 2) warmBad(sp('warmRuns'));
      else if (a.score >= 6) warmGood();
      else warmBad(feedback(a.score));
    },
    error: function (c) { deErr(c, warmSay, function (t) { $('warmNote').textContent = t; }); $('warmOk').hidden = false; },
    none: function () { warmSay(sp('nothing')); }
  });
};
makeRate($('warmRate'), function (v) {
  $('warmRate').hidden = true;
  if (WARM.last) {
    sLearn(WARM.last, v);
    $('warmGauge').hidden = false; sMarker('warmMarker', WARM.last.score);
    $('warmNote').textContent = sInfo(WARM.last, true) + '  ·  الأهل: ' + (v >= 10 ? '😀' : v >= 7 ? '🙂' : '😕');
    WARM.last = null;
  }
  if (v >= 10) warmGood(); else warmBad(v >= 7 ? sp('warmAlmost') : null);
});
