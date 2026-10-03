// حساب: math for the first school year.
'use strict';

/* ================= Rechnen: math for the first school year, in Arabic ================= */
var MQ = 10; // correct answers needed per level
var MLEVELS = [
  { k: 'count', max: 10, t: function () { return 'العَدُّ حَتَّى ' + mNum(10); } },
  { k: 'seq', max: 10, t: function () { return 'مَا العَدَدُ النَّاقِصُ؟'; } },
  { k: 'cmp', max: 10, t: function () { return 'أَكْبَرُ أَمْ أَصْغَرُ؟'; } },
  { k: 'add', max: 5, pics: 'always', t: function () { return 'الجَمْعُ حَتَّى ' + mNum(5); } },
  { k: 'add', max: 10, pics: 'hint', t: function () { return 'الجَمْعُ حَتَّى ' + mNum(10); } },
  { k: 'sub', max: 10, pics: 'hint', t: function () { return 'الطَّرْحُ حَتَّى ' + mNum(10); } },
  { k: 'count', min: 11, max: 20, t: function () { return 'العَدُّ حَتَّى ' + mNum(20); } },
  { k: 'seq', min: 8, max: 20, t: function () { return 'الأَعْدَادُ حَتَّى ' + mNum(20); } },
  { k: 'add', max: 20, pics: 'hint', t: function () { return 'الجَمْعُ حَتَّى ' + mNum(20); } },
  { k: 'sub', max: 20, pics: 'hint', t: function () { return 'الطَّرْحُ حَتَّى ' + mNum(20); } },
  { k: 'story', max: 10, pics: 'hint', t: function () { return 'مَسَائِلُ مُصَوَّرَةٌ'; } }
];
var NUMW = ['صِفْر', 'وَاحِد', 'اِثْنَان', 'ثَلَاثَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة', 'ثَمَانِيَة', 'تِسْعَة', 'عَشَرَة',
  'أَحَدَ عَشَرَ', 'اِثْنَا عَشَرَ', 'ثَلَاثَةَ عَشَرَ', 'أَرْبَعَةَ عَشَرَ', 'خَمْسَةَ عَشَرَ', 'سِتَّةَ عَشَرَ', 'سَبْعَةَ عَشَرَ', 'ثَمَانِيَةَ عَشَرَ', 'تِسْعَةَ عَشَرَ', 'عِشْرُون'];
var MPIC = ['🍎', '⭐', '🐟', '🌸', '🐤', '🍓', '🎈', '🐞', '🦋', '🍪'];
var M = { q: null, locked: false, fails: 0, hint: false, timer: 0, started: false };

function mRand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function mSay(t) { popBubble($('mBubble'), t); }
function mLevel() { return MLEVELS[S.mLevel - 1]; }
// pictures in rows of 5 (up to 10) or 10 (above 10) so she can see fives and tens; the last `gone` are crossed out (taken away)
function mPics(n, emo, gone, small, per) {
  var wrap = mEl('div', 'mPics' + (small ? ' mini' : '')), row = null;
  per = per || (n > 10 ? 10 : 5);
  for (var i = 0; i < n; i++) {
    if (i % per === 0) { row = mEl('div', 'mPicRow'); wrap.appendChild(row); }
    row.appendChild(mEl('span', i >= n - (gone || 0) ? 'gone' : '', emo));
  }
  return wrap;
}
function mNear(ans, lo, hi) {
  var c = [ans], d = shuffle([-1, 1, -2, 2, 3, -3]);
  for (var i = 0; i < d.length && c.length < 3; i++) { var v = ans + d[i]; if (v >= lo && v <= hi && c.indexOf(v) < 0) c.push(v); }
  return shuffle(c);
}

// picture stories talk to the child («مَعَكِ…»): her name cannot be recorded in advance, these pieces can
function mStorySay(t, a, b) {
  var x = NUMW[a], y = NUMW[b];
  return t === 0 ? 'مَعَكِ ' + x + '، وَأَعْطَتْكِ مَامَا ' + y + '. كَمْ مَعَكِ الآنَ؟'
    : t === 1 ? 'مَعَكِ ' + x + '، أَكَلْتِ ' + y + '. كَمْ بَقِيَ مَعَكِ؟'
    : t === 2 ? 'عَلَى الشَّجَرَةِ ' + x + '، وَجَاءَ ' + y + '. كَمْ عَلَى الشَّجَرَةِ الآنَ؟'
    : 'عَلَى الشَّجَرَةِ ' + x + '، طَارَ مِنْهَا ' + y + '. كَمْ بَقِيَ؟';
}
function mMake(L) {
  var q = { k: L.k, emo: MPIC[mRand(0, MPIC.length - 1)], max: L.max, pics: L.pics }, a, b, i;
  if (L.k === 'count') {
    q.ans = mRand(L.min || 1, L.max);
    q.bubble = 'كَمْ عَدَدُهَا؟ 🤔'; q.say = 'كَمْ عَدَدُهَا؟'; q.hintSay = 'عُدِّي بِإِصْبَعِكِ 👆';
  } else if (L.k === 'seq') {
    var st = mRand(L.min || 0, L.max - 4);
    q.miss = mRand(0, 4); q.seq = []; for (i = 0; i < 5; i++) q.seq.push(st + i);
    q.ans = st + q.miss;
    q.bubble = 'مَا العَدَدُ النَّاقِصُ؟ 🤔';
    q.say = q.seq.map(function (v, j) { return j === q.miss ? 'كَمْ؟' : NUMW[v]; }).join('، ');
    q.hintSay = 'عُدِّي بِالتَّرْتِيبِ 👆';
  } else if (L.k === 'cmp') {
    a = mRand(1, L.max); do { b = mRand(1, L.max); } while (b === a);
    var big = Math.random() < 0.5;
    q.opts = [a, b]; q.ans = big ? Math.max(a, b) : Math.min(a, b);
    q.bubble = big ? 'أَيُّهُمَا أَكْبَرُ؟ 🐘' : 'أَيُّهُمَا أَصْغَرُ؟ 🐭';
    q.say = (big ? 'أَيُّهُمَا أَكْبَرُ؟ ' : 'أَيُّهُمَا أَصْغَرُ؟ ') + NUMW[a] + '، أَمْ، ' + NUMW[b] + '؟';
    q.hintSay = 'قَارِنِي الصُّوَرَ 👀';
  } else if (L.k === 'add') {
    var sum = mRand(L.max > 10 ? 11 : 2, L.max);
    b = L.max > 10 ? mRand(2, Math.min(9, sum - 1)) : mRand(1, sum - 1); a = sum - b;
    q.toks = [{ n: a, p: [a, 0] }, { op: '+' }, { n: b, p: [b, 0] }, { op: '=' }, { q: 1 }];
    q.ans = sum; q.bubble = 'اِحْسُبِي 🤔'; q.say = NUMW[a] + '، زَائِد، ' + NUMW[b] + '، يُسَاوِي كَمْ؟';
  } else if (L.k === 'sub') {
    a = mRand(L.max > 10 ? 11 : 2, L.max); b = mRand(1, L.max > 10 ? Math.min(9, a) : a);
    q.toks = [{ n: a, p: [a, b] }, { op: '−' }, { n: b }, { op: '=' }, { q: 1 }];
    q.ans = a - b; q.bubble = 'اِحْسُبِي 🤔'; q.say = NUMW[a] + '، نَاقِص، ' + NUMW[b] + '، يُسَاوِي كَمْ؟';
  } else { // picture stories
    var t = mRand(0, 3), add = t % 2 === 0, food = t < 2;
    q.emo = food ? ['🍎', '🍓', '🍬', '🍪', '🍌'][mRand(0, 4)] : ['🐦', '🐤', '🦋', '🐞'][mRand(0, 3)];
    if (add) { a = mRand(1, 8); b = mRand(1, 10 - a); q.ans = a + b; q.sp = [[a, 0], [b, 0]]; }
    else { a = mRand(3, 10); b = mRand(1, a - 1); q.ans = a - b; q.sp = [[a, b]]; }
    var A = mNum(a), B = mNum(b), E = q.emo;
    q.story = t === 0 ? 'مَعَكِ ' + A + ' ' + E + '، وَأَعْطَتْكِ مَامَا ' + B + ' ' + E + '. كَمْ ' + E + ' مَعَكِ الآنَ؟'
      : t === 1 ? 'مَعَكِ ' + A + ' ' + E + '، أَكَلْتِ ' + B + '. كَمْ ' + E + ' بَقِيَ مَعَكِ؟'
      : t === 2 ? 'عَلَى الشَّجَرَةِ ' + A + ' ' + E + '، وَجَاءَ ' + B + ' ' + E + '. كَمْ ' + E + ' عَلَى الشَّجَرَةِ الآنَ؟'
      : 'عَلَى الشَّجَرَةِ ' + A + ' ' + E + '، طَارَ مِنْهَا ' + B + '. كَمْ ' + E + ' بَقِيَ؟';
    q.say = mStorySay(t, a, b);
    q.bubble = 'اِسْتَمِعِي وَاحْسُبِي 🤔';
  }
  q.say = gx(q.say); q.story = gx(q.story);
  q.hasPics = !!(q.toks || q.sp) && L.pics !== 'always';
  return q;
}

function mDraw() {
  var q = M.q, box = $('mBox'), pics = q.pics === 'always' || M.hint;
  box.innerHTML = '';
  if (q.k === 'count') box.appendChild(mPics(q.ans, q.emo, 0, q.ans > 10));
  else if (q.k === 'seq') {
    var s = mEl('div', 'mSeq');
    q.seq.forEach(function (v, j) { s.appendChild(mEl('div', 'mCell' + (j === q.miss ? ' q' : ''), j === q.miss ? '؟' : mNum(v))); });
    box.appendChild(s);
  } else if (q.k === 'cmp') {
    box.appendChild(mEl('div', 'mStory', q.bubble.replace(/ \S+$/, '')));
    box.appendChild(mEl('div', 'bigEmoji', '⚖️'));
  } else if (q.toks) {
    var row = mEl('div', 'mRow');
    q.toks.forEach(function (t) {
      var slot = mEl('div', 'mSlot');
      slot.appendChild(mEl('div', 'mTok' + (t.op ? ' op' : '') + (t.q ? ' q' : ''), t.op || (t.q ? '؟' : mNum(t.n))));
      if (pics && t.p) slot.appendChild(mPics(t.p[0], q.emo, t.p[1], q.max > 5, 5));
      row.appendChild(slot);
    });
    box.appendChild(row);
  } else {
    box.appendChild(mEl('div', 'mStory', q.story));
    if (pics) {
      var pr = mEl('div', 'mRow');
      q.sp.forEach(function (p, j) { if (j) pr.appendChild(mEl('div', 'mTok op', '+')); pr.appendChild(mPics(p[0], q.emo, p[1], true, 5)); });
      box.appendChild(pr);
    }
  }
}
function mChoices() {
  var q = M.q, wrap = $('mChoices');
  wrap.innerHTML = '';
  (q.opts || mNear(q.ans, 0, Math.max(10, q.max))).forEach(function (v) {
    var b = mEl('button', 'mChoice'); b.type = 'button';
    b.appendChild(mEl('span', '', mNum(v)));
    if (q.k === 'cmp') b.appendChild(mPics(v, q.emo, 0, true));
    b.onclick = function () { mPick(v, b); };
    wrap.appendChild(b);
  });
}
function mPips() {
  var p = $('mPips'); p.innerHTML = '';
  for (var i = 0; i < MQ; i++) {
    var d = mEl('div', 'pip' + (i < S.mDone ? ' on' : ''), i < S.mDone ? '⭐' : '');
    p.appendChild(d);
  }
}
function mSpeak() {
  if (!window.speechSynthesis || !M.q) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(M.q.say);
    u.lang = 'ar-SA'; u.rate = 0.75;
    window.speechSynthesis.speak(u);
    $('mHear').classList.remove('callout');
  } catch (e) {}
}
function mNext() {
  clearTimeout(M.timer);
  M.q = mMake(mLevel()); M.locked = false; M.fails = 0; M.hint = false;
  $('mCard').className = 'card';
  $('mTitle').textContent = mLevel().t();
  $('mHint').hidden = false;
  $('mHear').classList.remove('callout');
  mDraw(); mChoices(); mPips(); renderHud();
  mSay(M.q.bubble);
  mSpeak();
}
function mPick(v, btn) {
  if (M.locked) return;
  if (v === M.q.ans) { btn.classList.add('ok'); mSuccess(); return; }
  btn.classList.add('no'); btn.disabled = true;
  M.fails++; soundTry();
  track('math', String(S.mLevel), false);
  if (M.fails >= 1 && M.q.hasPics && !M.hint) { M.hint = true; mDraw(); mSay('عُدِّي الصُّوَرَ 👀'); }
  else mSay(M.fails >= 2 ? (M.q.hintSay || 'اِسْتَمِعِي مَرَّةً أُخْرَى 🔊') : 'حَاوِلِي مَرَّةً أُخْرَى 💪');
  if (M.fails >= 2) $('mHear').classList.add('callout');
}
function mSuccess() {
  M.locked = true;
  [].forEach.call($('mChoices').children, function (b) { b.disabled = true; });
  $('mBox').querySelectorAll('.q').forEach(function (el) { el.textContent = mNum(M.q.ans); el.classList.remove('q'); el.style.color = '#1fae6f'; });
  if (M.q.k === 'count') { var t = mEl('div', 'mTok', mNum(M.q.ans)); t.style.color = '#1fae6f'; $('mBox').appendChild(t); }
  $('mCard').className = 'card good';
  mSay(PRAISE[Math.floor(Math.random() * PRAISE.length)] + ' يَا ' + S.name + '! 🎉');
  soundGood(); confetti(10);
  track('math', String(S.mLevel), true);
  S.mDone++;
  if (S.mDone >= MQ) {
    var fin = S.mLevel, wrap = fin >= MLEVELS.length;
    S.stars++; S.mDone = 0; S.mLevel = wrap ? 1 : fin + 1; trackStar('math');
    save();
    mPips(); $('mPips').querySelectorAll('.pip').forEach(function (p) { p.className = 'pip on'; p.textContent = '⭐'; });
    M.timer = setTimeout(function () { mLevelUp(fin, wrap); }, 1500);
  } else {
    save(); mPips();
    M.timer = setTimeout(mNext, 1800);
  }
  renderHud();
}
function mLevelUp(fin, wrap) {
  luMode = 'math';
  soundStar(); confetti(40);
  $('luTitle').textContent = gx('برافو! خلصتي مستوى الحساب ' + mNumAr(fin));
  $('luLonger').hidden = !wrap;
  $('luLonger').textContent = gx('خلصتي كل مستويات الحساب! هنبدأ تاني من أول مستوى.');
  $('luGo').textContent = 'المستوى ' + mNumAr(S.mLevel) + ' ◀';
  $('levelUp').hidden = false;
  var pill = $('starsPill');
  pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  renderHud();
  $('luGo').focus();
}
function mEnter() {
  S.mLevel = Math.min(MLEVELS.length, Math.max(1, S.mLevel | 0));
  S.mDone = Math.min(MQ - 1, Math.max(0, S.mDone | 0));
  if (!M.started) { M.started = true; mNext(); } else { mPips(); }
}
$('mHear').onclick = mSpeak;
$('mSkip').onclick = function () { if (!M.locked) mNext(); };
$('mHint').onclick = function () {
  if (!M.q || M.locked) return;
  if (M.q.hasPics && !M.hint) { M.hint = true; mDraw(); mSay('عُدِّي الصُّوَرَ 👀'); }
  else mSay(M.q.hintSay || 'عُدِّي بِإِصْبَعِكِ 👆');
};
MLEVELS.forEach(function (L, i) {
  var o = document.createElement('option');
  o.value = i + 1; o.textContent = 'المستوى ' + mNumAr(i + 1);
  $('mLvlSel').appendChild(o);
});
function mRefreshLevelNames() { [].forEach.call($('mLvlSel').options, function (o, i) { o.textContent = 'المستوى ' + mNumAr(i + 1) + ': ' + MLEVELS[i].t(); }); }
$('mLvlSel').onchange = function () { S.mLevel = parseInt(this.value, 10); S.mDone = 0; save(); if (M.started) mNext(); renderHud(); };
$('mDigitSel').onchange = function () {
  S.mDigits = this.value; save(); mRefreshLevelNames();
  if (M.started && M.q) { $('mTitle').textContent = mLevel().t(); if (!M.locked) { M.q = mMake(mLevel()); M.hint = false; mDraw(); mChoices(); mSay(M.q.bubble); } }
};
