// قراءة: reading game, microphone, level up, parent panel.
'use strict';

/* ---------- game state ---------- */
var queue = [], qi = 0, cur = null, locked = false, listening = false, fails = 0;
var rec = null, gotResult = false, hadError = false, advanceTimer = null;
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var micUnavailable = !SR;

var wrapped = false;
var view = 'read';
var REWARDS = ['🌟', '🎉', '🦄', '🐣', '🌈', '🍭', '🎈', '🐬'];
var PRAISE = ['أَحْسَنْتِ', 'مُمْتَاز', 'رَائِع', 'بَرَافُو', 'مَا شَاءَ اللَّه'];

function say(text) {
  var b = $('bubble'); b.textContent = gx(text);
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}
function renderHud() {
  $('levelBadge').textContent = view === 'speak' ? 'نطق' : view === 'write' ? 'كتابة ' + mNumAr(S.wLevel) : view === 'math' ? 'حساب ' + mNumAr(S.mLevel) : view === 'story' ? 'حكايات' : view === 'quran' ? 'جزء عم' : view === 'chat' ? 'كوكو 🦜' : lessonName(S.level);
  $('starCount').textContent = S.stars;
  var p = $('pips'); p.innerHTML = '';
  for (var i = 0; i < wordsFor(S.level).length; i++) {
    var d = document.createElement('div');
    d.className = 'pip' + (i < S.doneList.length ? ' on' : '');
    d.textContent = i < S.doneList.length ? '⭐' : '';
    p.appendChild(d);
  }
  rsSync(); // 📖 stories from lesson 4C on (js/read-story.js)
}
function buildQueue() {
  queue = shuffle(wordsFor(S.level).filter(function (pair) { return S.doneList.indexOf(pair[0]) < 0; }));
  qi = 0;
}
function showOk() { $('parentOk').hidden = !(S.alwaysOk || micUnavailable); }

function nextWord() {
  clearTimeout(advanceTimer);
  if (qi >= queue.length) buildQueue();
  cur = queue[qi++];
  locked = false; fails = 0;
  var letters = norm(cur[0]).length;
  $('word').textContent = cur[0];
  $('word').style.setProperty('--fs', Math.max(44, 140 - (letters - 3) * 14 - Math.max(0, letters - 6) * 6));
  $('pic').textContent = '';
  $('pic').classList.remove('show');
  $('card').className = 'card';
  $('hearBtn').classList.remove('callout');
  $('micBtn').disabled = false;
  $('note').textContent = micUnavailable ? 'التعرف على الصوت غير متاح في هذا المتصفح. استخدموا زر ✔ ولي الأمر.' : '';
  showOk();
  say('اِقْرَئِي الكَلِمَة 🎤');
  renderHud();
}

/* ---------- checking ---------- */
function matches(alts) {
  var t = norm(cur[0]);
  var base = t.length <= 3 ? 1 : (t.length <= 5 ? 1.5 : (t.length <= 7 ? 2 : 3));
  var tol = Math.max(0.5, base + ((S.lenient == null ? 1 : S.lenient) - 1) * 0.5);
  for (var i = 0; i < alts.length; i++) {
    var cands = [norm(alts[i])].concat(String(alts[i]).split(/\s+/).map(norm)).filter(Boolean);
    for (var j = 0; j < cands.length; j++) {
      var c = cands[j];
      if (wlev(c, t) <= tol) return true;
      if (c.indexOf('\u0627\u0644') === 0 && wlev(c.slice(2), t) <= tol) return true;
    }
  }
  return false;
}

function success() {
  if (locked) return;
  locked = true;
  $('micBtn').disabled = true;
  $('card').className = 'card good';
  $('pic').textContent = REWARDS[Math.floor(Math.random() * REWARDS.length)];
  $('pic').classList.add('show');
  $('note').textContent = '';
  say(PRAISE[Math.floor(Math.random() * PRAISE.length)] + ' يَا ' + S.name + '! 🎉');
  soundGood(); confetti(14);
  track('read', cur[0], true);
  if (S.doneList.indexOf(cur[0]) < 0) S.doneList.push(cur[0]);
  if (S.doneList.length >= wordsFor(S.level).length) {
    var finished = S.level;
    S.stars++; S.doneList = []; trackStar('read');
    wrapped = finished >= LEVELS.length;
    S.level = wrapped ? 1 : finished + 1;
    save();
    advanceTimer = setTimeout(function () { showLevelUp(finished); }, 1500);
  } else {
    save();
    advanceTimer = setTimeout(nextWord, 2300);
  }
  renderHud();
}

function tryAgain(msg) {
  fails++;
  track('read', cur[0], false);
  soundTry();
  if (fails >= 3) {
    say('اِسْتَمِعِي أَوَّلاً 🔊');
    $('hearBtn').classList.add('callout');
  } else {
    say(msg || 'حَاوِلِي مَرَّةً أُخْرَى 💪');
  }
}

/* ---------- microphone ---------- */
function setListening(on) {
  listening = on;
  $('micBtn').classList.toggle('on', on);
  $('card').classList.toggle('listening', on);
}
function startListening() {
  if (locked) return;
  if (!SR) { micUnavailable = true; showOk(); $('note').textContent = 'التعرف على الصوت غير متاح في هذا المتصفح. استخدموا زر ✔ ولي الأمر.'; return; }
  if (listening) { try { rec.stop(); } catch (e) {} return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  rec = new SR();
  rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
  gotResult = false; hadError = false;
  rec.onstart = function () { setListening(true); say('أَسْمَعُكِ... 👂'); $('note').textContent = ''; };
  rec.onresult = function (e) {
    gotResult = true;
    var alts = [];
    for (var i = 0; i < e.results.length; i++) for (var j = 0; j < e.results[i].length; j++) alts.push(e.results[i][j].transcript);
    $('note').textContent = 'سمعت: ' + (alts[0] || '—');
    if (matches(alts)) success(); else tryAgain();
  };
  rec.onerror = function (e) {
    hadError = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      micUnavailable = true; showOk();
      say('المَيْكْرُوفُون مُغْلَق 🔇');
      $('note').textContent = 'الميكروفون مغلق. افتحوا اللعبة من عنوانها مباشرة (لا من داخل تطبيق آخر)، واسمحوا بالميكروفون، وعلى الآيفون فعّلوا: الإعدادات > عام > لوحة المفاتيح > تفعيل الإملاء. أو استخدموا زر ✔ ولي الأمر.';
    } else if (e.error === 'no-speech') {
      say('لَمْ أَسْمَعْ شَيْئاً 🎤 حَاوِلِي مَرَّةً أُخْرَى');
    } else if (e.error === 'network') {
      $('note').textContent = 'التعرف على الصوت يحتاج إلى اتصال بالإنترنت.';
      say('حَاوِلِي مَرَّةً أُخْرَى');
    } else if (e.error !== 'aborted') {
      say('حَاوِلِي مَرَّةً أُخْرَى');
    }
  };
  rec.onend = function () {
    setListening(false);
    if (!gotResult && !hadError && !locked) say('لَمْ أَسْمَعْ شَيْئاً 🎤 حَاوِلِي مَرَّةً أُخْرَى');
  };
  try { rec.start(); } catch (e) { setListening(false); }
}

function hearWord() {
  if (!window.speechSynthesis || locked) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(cur[0]);
    u.lang = 'ar-SA'; u.rate = 0.6;
    window.speechSynthesis.speak(u);
    $('hearBtn').classList.remove('callout');
  } catch (e) {}
}

/* ---------- level up ---------- */
var luMode = 'read';
function showLevelUp(finished) {
  luMode = 'read';
  soundStar(); confetti(40);
  $('luTitle').textContent = gx('أَحْسَنْتِ! أَنْهَيْتِ ' + lessonName(finished));
  $('luLonger').hidden = !wrapped;
  $('luLonger').textContent = gx('أَنْهَيْتِ الكِتَابَ كُلَّهُ! سَنَبْدَأُ مِنْ جَدِيدٍ مِنَ الدَّرْسِ الأَوَّلِ.');
  $('luGo').textContent = lessonName(S.level) + ' ◀';
  $('levelUp').hidden = false;
  var pill = $('starsPill');
  pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  renderHud();
  $('luGo').focus();
}
$('luGo').onclick = function () {
  $('levelUp').hidden = true;
  if (luMode === 'write') { wBuild(); wNext(); } else if (luMode === 'math') { mNext(); } else { buildQueue(); nextWord(); }
};

/* ---------- parent panel ---------- */
function armed(btn, label, action) {
  var on = false, t;
  btn.onclick = function () {
    if (!on) {
      on = true; btn.textContent = 'اضغطوا مرة أخرى للتأكيد'; btn.classList.add('armed');
      t = setTimeout(function () { on = false; btn.textContent = label; btn.classList.remove('armed'); }, 3000);
    } else {
      clearTimeout(t); on = false; btn.textContent = label; btn.classList.remove('armed'); action();
    }
  };
}
function refreshPanel() {
  $('starIn').value = S.stars;
  $('ppLevel').textContent = '⁦' + LESSON_IDS[S.level - 1] + '⁩';
  $('lvlSel').value = String(S.level);
  kidsPanelRefresh();
  $('soundCb').checked = !!S.sound;
  $('okCb').checked = !!S.alwaysOk;
  $('triesSel').value = String(S.lispTries || 2);
  $('rateSel').value = S.rateMode || 'parent';
  $('speakLangSel').value = S.speakLang === 'de' ? 'de' : 'ar';
  $('chatAiCb').checked = S.kokoAI !== false;
  $('sDetInfo').textContent = sStatus();
  $('strictSel').value = String(S.lenient == null ? 1 : S.lenient);
  $('wLvlSel').value = String(S.wLevel);
  mRefreshLevelNames();
  $('mLvlSel').value = String(S.mLevel);
  $('mDigitSel').value = S.mDigits === 'en' ? 'en' : 'ar';
  $('warmCb').checked = S.warmOn !== false;
  $('stJudgeIn').value = S.stJudge == null ? ST_DEFAULT_JUDGE : S.stJudge;
  $('stJudgeStatus').textContent = '';
  $('stVoiceInfo').textContent = stVoiceText();
  $('wHelpSel').value = S.wHelp || 'auto';
  $('wStrictSel').value = String(S.wLenient == null ? 1 : S.wLenient);
  $('wOrderSel').value = S.wOrder || 'hint';
}
for (var l = 1; l <= LEVELS.length; l++) {
  var o = document.createElement('option');
  o.value = l; o.textContent = lessonName(l);
  $('lvlSel').appendChild(o);
}
$('parentBtn').onclick = function () { parentGate(function () { refreshPanel(); $('parentPanel').hidden = false; }); };
$('ppClose').onclick = function () { $('parentPanel').hidden = true; };
function setStars(n) { S.stars = Math.max(0, Math.min(9999, n | 0)); save(); renderHud(); refreshPanel(); }
$('starMinus').onclick = function () { setStars(S.stars - 1); };
$('starPlus').onclick = function () { setStars(S.stars + 1); };
$('starIn').onchange = function () { setStars(parseInt(this.value, 10) || 0); };
armed($('resetStars'), 'تصفير النجوم', function () { S.stars = 0; save(); renderHud(); refreshPanel(); });
armed($('resetLevel'), 'العودة إلى أول درس', function () { S.level = 1; S.doneList = []; save(); buildQueue(); nextWord(); refreshPanel(); });
$('lvlSel').onchange = function () { S.level = parseInt(this.value, 10); S.doneList = []; save(); buildQueue(); nextWord(); refreshPanel(); };
$('soundCb').onchange = function () { S.sound = this.checked; save(); };
$('strictSel').onchange = function () { S.lenient = parseInt(this.value, 10); save(); };
$('rateSel').onchange = function () { S.rateMode = this.value; save(); };
$('speakLangSel').onchange = function () { spSetLang(this.value); };
$('chatAiCb').onchange = function () { S.kokoAI = this.checked; save(); };
$('warmCb').onchange = function () { S.warmOn = this.checked; save(); };
armed($('sDetReset'), 'مسح ما تعلمه الكاشف', function () { S.sEx = []; S.sHist = []; save(); refreshPanel(); });
$('triesSel').onchange = function () { S.lispTries = parseInt(this.value, 10); save(); };
$('okCb').onchange = function () { S.alwaysOk = this.checked; save(); showOk(); };

/* ---------- wire up ---------- */
$('micBtn').onclick = startListening;
$('hearBtn').onclick = hearWord;
$('skipBtn').onclick = function () { if (!locked) { if (listening) { try { rec.abort(); } catch (e) {} } nextWord(); } };
$('parentOk').onclick = success;
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { $('parentPanel').hidden = true; }
});
