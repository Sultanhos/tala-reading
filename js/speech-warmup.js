// نطق warm-up: "Siii – Saaa – Sooo" x3 before training and game.
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
  warmSay('Tippe auf 🎤 und sag: Siii – Saaa – Sooo 🐍');
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
    warmSay('Super! 3-mal richtig 🎉 Jetzt geht es los!');
    setTimeout(warmUnlock, 2200);
  } else {
    soundGood(); confetti(8);
    warmSay('Richtig! 🌟 Noch ' + (WARM.need - WARM.got) + '-mal: Siii – Saaa – Sooo');
  }
}
function warmBad(msg) {
  WARM.fails++; soundTry();
  warmSay(msg || 'Nochmal! Zähne zusammen, Zunge hinter die Zähne: Siii – Saaa – Sooo 🐍');
  if (WARM.fails >= 2) $('warmOk').hidden = false;
}
$('warmHear').onclick = function () { speakDe('Siii. Saaa. Sooo.', 0.55); };
$('warmOk').onclick = function () { if (!WARM.done && WARM.got < WARM.need) { $('warmRate').hidden = true; warmGood(); } };
$('warmMic').onclick = function () {
  if (WARM.done) return;
  $('warmRate').hidden = true; $('warmGauge').hidden = true; WARM.last = null;
  sRecord($('warmMic'), {
    start: function () { warmSay('Ich höre zu... 👂'); $('warmNote').textContent = ''; },
    result: function (a) {
      a.score = sScore(a);
      if (S.rateMode === 'parent') { // the parent decides; the rating also teaches the S-detector
        WARM.last = a; $('warmNote').textContent = sInfo(a, false);
        warmSay('Mama oder Papa bewertet 👂'); $('warmRate').hidden = false; return;
      }
      $('warmGauge').hidden = false; sMarker('warmMarker', a.score);
      $('warmNote').textContent = sInfo(a, true) + (a.sib ? '  ·  ' + a.runs + ' S' : '');
      if (!a.sib) warmBad('Ich habe kein klares S gehört 🐍 Nochmal: Siii – Saaa – Sooo');
      else if (a.runs < 2) warmBad('Sag alle drei: Siii – Saaa – Sooo 🐍');
      else if (a.score >= 6) warmGood();
      else warmBad(feedback(a.score));
    },
    error: function (c) { deErr(c, warmSay, function (t) { $('warmNote').textContent = t; }); $('warmOk').hidden = false; },
    none: function () { warmSay('Ich habe nichts gehört 🎤 Nochmal!'); }
  });
};
makeRate($('warmRate'), function (v) {
  $('warmRate').hidden = true;
  if (WARM.last) {
    sLearn(WARM.last, v);
    $('warmGauge').hidden = false; sMarker('warmMarker', WARM.last.score);
    $('warmNote').textContent = sInfo(WARM.last, true) + '  ·  Eltern: ' + (v >= 10 ? '😀' : v >= 7 ? '🙂' : '😕');
    WARM.last = null;
  }
  if (v >= 10) warmGood(); else warmBad(v >= 7 ? 'Fast! Noch einmal: Siii – Saaa – Sooo 🐍' : null);
});
