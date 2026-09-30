// Shared: lesson words, saved progress (S), helpers and sounds.
'use strict';

/* ---------- words: one level per lesson of the book ---------- */
var LESSONS = [
  ['3A', ['كَتَبَ','ذَهَبَ','رَكَعَ','قَرَأَ','دَرَسَ','ذَكَرَ','هَدَأَ','شَكَرَ','أَكَلَ','صَدَقَ','حَفَرَ','نَصَرَ']],
  ['3B', ['شَرِبَ','سَمِعَ','عَمِلَ','لَعِبَ','فَرِحَ','عَلِمَ','فَهِمَ','حَسِبَ','ضَحِكَ','رَغِبَ','خَسِرَ','شَهِدَ']],
  ['3C', ['كَثُرَ','صَلُحَ','عَظُمَ','كَرُمَ','بَعُدَ','حَسُنَ','خَبُثَ','قَبُحَ','حُفِظَ','دُرِسَ','ضُرِبَ','لُعِنَ']],
  ['3D', ['نَزَلَ','قَطَعَ','جُرِحَ','زُرِعَ','حَجَزَ','قَدِمَ','قُصِدَ','قُضِيَ','عَرَضَ','صَعُبَ','رَكَضَ','نُقِدَ']],
  ['4A', ['بَلَدًا','حَطَبًا','غَدَقًا','رَشَدًا','صَعَدًا','عَدَدًا','أَمَدًا','لُبَدًا','طَبَقًا','شُهُبًا','هَرَبًا','شَطَطًا']],
  ['4B', ['لَهَبٍ','مَسَدٍ','عَمَدٍ','طَبَقٍ','نُصُبٍ','أَجَلٍ','ذَكَرٍ','مَثَلٍ','غَضَبٍ','جُرُفٍ','سَفَرٍ','مَطَرٍ']],
  ['4C', ['وَلَدٌ','كُتُبٌ','سُرُرٌ','نَفَرٌ','أَحَدٌ','بَشَرٌ','خُشُبٌ','نَصَبٌ','مَرَضٌ','لَعِبٌ','مَلَكٌ','قَتَرٌ']],
  ['4D', ['رُسُلٌ','حَسَدًا','مَثَلًا','رَجُلٌ','سَفَرٍ','أَخٌ','حَكَمًا','جَبَلٍ','حَرَجٌ','عَمَلٍ','بَشَرًا','أُكُلٍ']],
  ['5A', ['جَهْدَ','نَحْنُ','يَعْلَمُ','عَنْهُ','سَبْعٌ','أَكْثَرُ','نَفْسٍ','يُوَسْوِسُ','حَبْلٌ','يَحْذَرُ','قَبْلُ','وَجْهُهُ']],
  ['5B', ['مِنْهُ','مِثْلُ','رِجْسٌ','تِلْكَ','فِتْنَةٌ','رِزْقٍ','رِحْلَةَ','نِسْوَةٌ','كِبْرٌ','شِرْبٍ','بِنِعْمَةِ','تُطْعِمُهُ']],
  ['5C', ['بُكْمٌ','يُفْعَلُ','يُذْهِبْ','عُصْبَةٌ','قُلْنَ','عُمْيٌ','خُضْرٌ','يُرْجَعُ','يُثْخِنَ','يُرْسِلَ','بُعْثِرَ','يُخْزِهِمْ']],
  ['5D', ['وِزْرَكَ','نَشْرَحْ','أَغْنَتْ','صَدْرَكَ','ذِكْرٍ','أَمْهِلْهُمْ','فَيُصْلَبُ','عَزْمٍ','فَرَغْتَ','سَمِعَتْ','مُلْكُ','عَسْعَسَ']],
  ['5E', ['يَقْضِ','يَسْرِقْ','أُقْسِمُ','أَطْهَرُ','بِقِطْعٍ','نُطْعِمُ','أَبْصِرْ','حَسِبْتَ','يُبْعَثُ','أَجْرٌ','حِجْرٌ','يَخْرُجُ','عَدْلٍ','سِدْرٍ','يُدْخِلُ']],
  ['6A', ['كَانَ','ذَاتَ','مَالًا','عَابِدٌ','غَاسِقٍ','طَعَامُ','حَاسِدٍ','نَارًا','خَالِدًا','نَاجٍ','يُغَاثُ','هَاوِيَةٌ']],
  ['6B', ['شَهِيدٌ','رِيحٍ','خَبِيرٌ','كَبِيرًا','يُعِيدُ','حَدِيثُ','سَعِيرًا','مَجِيدٌ','يَسِيرًا','أَلِيمٍ','جِيدِهَا','نَعِيمٍ']],
  ['6C', ['دُونِ','أَعُوذُ','صُدُورِ','رَسُولٌ','وُجُوهٌ','بُطُونِ','قُعُودٌ','ثُبُورًا','يَقُومُ','عُيُونٍ','جُوعٍ','يَطُوفُ']],
  ['8A', ['نَزَّلَ','حَرَّمَ','قَدَّرَ','فَكَّرَ','صَدَّقَ','كَذَّبَ','عَلَّمَ','هَمَّتْ','تَبَّتْ','حَقٌّ','تَطَّلِعُ','جَنَّاتٍ']],
  ['8B', ['مِنِّي','ظِلٍّ','فِضَّةٍ','سِجِّينٍ','فَسَبِّحْ','جِثِيًّا','إِيَّاكَ','يُتِمَّ','قَوِيًّا','فَتَزِلَّ','يُصِرُّونَ','تَسْتَخِفُّونَهَا']],
  ['8C', ['بُسَّتِ','رُجَّتِ','حُقَّتْ','دُكَّتْ','مُدَّتْ','حُصِّلَ','ثُمَّ','خُشَّعًا','لِحُبِّ','أُجِّلَتْ','كُلٌّ','كُوِّرَتْ']]
];
var LESSON_IDS = LESSONS.map(function (l) { return l[0]; });
var LEVELS = LESSONS.map(function (l) { return l[1].map(function (w) { return [w, '']; }); });
function wordsFor(level) { return LEVELS[level - 1]; }
// "الدرس 3A": the Latin lesson code kept together, so it shows correctly in right-to-left Arabic text
function lessonName(level) { return 'الدرس ⁦' + LESSON_IDS[level - 1] + '⁩'; }

/* ---------- saved state ---------- */
var KEY = childKey(P.cur); // each child has their own progress (js/profiles.js)
var S = { stars: 0, level: 1, done: 0, name: 'تالا', sound: true, alwaysOk: false, picBefore: false, lenient: 1, doneList: [], lispTries: 2, lisp: { best: 0, rounds: 0 }, rateMode: 'parent', wLevel: 1, wDone: [], wHelp: 'auto', wLenient: 1, sEx: [], sHist: [], mLevel: 1, mDone: 0, mDigits: 'ar', stBest: {}, stJudge: 'https://tala-judge.onrender.com', warmOn: true, log: {}, weak: {}, speakLang: 'ar', aiReport: null, wOrder: 'hint', rsDone: [], quran: {} };
try {
  var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (var k in saved) if (k in S) S[k] = saved[k];
} catch (e) {}
S.name = pCur().name || S.name;
S.stars = Math.max(0, S.stars | 0);
S.level = Math.min(LEVELS.length, Math.max(1, S.level | 0));
if (!Array.isArray(S.doneList)) S.doneList = [];
S.doneList = S.doneList.filter(function (w) { return wordsFor(S.level).some(function (pair) { return pair[0] === w; }); });
if (S.doneList.length >= wordsFor(S.level).length) S.doneList = [];
S.wLevel = Math.max(1, S.wLevel | 0); // upper limit set in js/writing.js
if (!Array.isArray(S.wDone)) S.wDone = [];
if (!Array.isArray(S.sEx)) S.sEx = [];
if (!Array.isArray(S.sHist)) S.sHist = [];
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- helpers ---------- */
var $ = function (id) { return document.getElementById(id); };
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function norm(s) {
  return String(s).replace(/[\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627').replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647').replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A')
    .replace(/[^\u0621-\u064A]/g, '');
}

// Forgiving distance: letters that sound alike cost half, dropping/adding a long-vowel letter costs half
var SIMILAR = ['\u0633\u0635\u062B', '\u0632\u0630\u0638', '\u062A\u0637', '\u062F\u0636', '\u0636\u0638', '\u062D\u0647\u062E',
               '\u0639\u0627\u0621', '\u0642\u0643', '\u063A\u062E', '\u0634\u0633', '\u0648\u0627', '\u064A\u0627'];
var SOFT = '\u0627\u0648\u064A\u0647\u0621';
function subCost(x, y) {
  if (x === y) return 0;
  for (var i = 0; i < SIMILAR.length; i++) if (SIMILAR[i].indexOf(x) > -1 && SIMILAR[i].indexOf(y) > -1) return 0.5;
  return 1;
}
function gapCost(x) { return SOFT.indexOf(x) > -1 ? 0.5 : 1; }
function wlev(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  d[0] = [0];
  for (i = 1; i <= m; i++) d[i] = [d[i - 1][0] + gapCost(a[i - 1])];
  for (j = 1; j <= n; j++) d[0][j] = d[0][j - 1] + gapCost(b[j - 1]);
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + gapCost(a[i - 1]), d[i][j - 1] + gapCost(b[j - 1]), d[i - 1][j - 1] + subCost(a[i - 1], b[j - 1]));
  return d[m][n];
}

/* ---------- sound ---------- */
var ac;
function tone(f, dur, at, type, vol) {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + (at || 0);
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur);
  } catch (e) {}
}
function soundGood() { tone(660, .18, 0); tone(880, .18, .12); tone(1175, .3, .24); }
function soundTry() { tone(300, .25, 0, 'triangle', .1); }
function soundStar() { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, .25, i * .11); }); }

function confetti(n) {
  var bits = ['⭐', '🌟', '🎉', '🎈', '💖', '✨'];
  for (var i = 0; i < n; i++) {
    var s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = bits[Math.floor(Math.random() * bits.length)];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.fontSize = 18 + Math.random() * 26 + 'px';
    s.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    s.style.animationDelay = Math.random() * .5 + 's';
    document.body.appendChild(s);
    setTimeout((function (el) { return function () { el.remove(); }; })(s), 4500);
  }
}

/* ---------- shared display helpers: numbers in Arabic digits, new elements, speech bubbles ---------- */
function mNumAr(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
function mNum(n) { return S.mDigits === 'en' ? String(n) : String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
function mEl(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function popBubble(el, text) { el.textContent = gx(text); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

/* ---------- talking to a boy or a girl: the texts are written for a girl; for a boy these words change ---------- */
var BOY_WORDS = [ // phrases first: before «ال» the boy's command ends in kasra (اِقْرَأِ الكَلِمَة)
  ['اِقْرَئِي الكَلِمَة', 'اِقْرَأِ الكَلِمَة'], ['اِقْرَئِي القِصَّةَ', 'اِقْرَأِ القِصَّةَ'], ['اِقْرَئِي الكَلِمَاتِ', 'اِقْرَأِ الكَلِمَاتِ'],
  ['قَرَأْتِ', 'قَرَأْتَ'], ['اِقْرَئِي الآيَةَ', 'اِقْرَأِ الآيَةَ'], ['سَمِّعِي', 'سَمِّعْ'], ['حَفِظْتِ', 'حَفِظْتَ'], ['اُكْتُبِي الحَرْفَ', 'اُكْتُبِ الحَرْفَ'], ['أَكْمِلِي الحَرْفَ', 'أَكْمِلِ الحَرْفَ'],
  ['قَارِنِي الصُّوَرَ', 'قَارِنِ الصُّوَرَ'], ['اُكْتُبِي الكَلِمَةَ', 'اُكْتُبِ الكَلِمَةَ'], ['أَكْمِلِي الكَلِمَةَ', 'أَكْمِلِ الكَلِمَةَ'], ['قُولِي الكَلِمَتَيْنِ', 'قُلِ الكَلِمَتَيْنِ'], ['قُولِي الثَّلَاثَةَ', 'قُلِ الثَّلَاثَةَ'],
  // نطق lines
  ['قُولِي', 'قُلْ'], ['أَسْنَانُكِ', 'أَسْنَانُكَ'], ['لِسَانُكِ', 'لِسَانُكَ'], ['أَنْهَيْتِ', 'أَنْهَيْتَ'], ['اِضْغَطِي', 'اِضْغَطْ'],
  ['سَأَسْأَلُكِ', 'سَأَسْأَلُكَ'], ['أَجِيبِي', 'أَجِبْ'], ['حَصَلْتِ', 'حَصَلْتَ'], ['تَحْتَاجِينَ', 'تَحْتَاجُ'], ['تَدَرَّبِي', 'تَدَرَّبْ'],
  ['اِلْعَبِي', 'اِلْعَبْ'], ['تَذَكَّرِي', 'تَذَكَّرْ'], ['تَرَيْنَ', 'تَرَى'],
  ['أَحْسَنْتِ', 'أَحْسَنْتَ'], ['اِقْرَئِي', 'اِقْرَأْ'], ['اِسْتَمِعِي', 'اِسْتَمِعْ'], ['حَاوِلِي', 'حَاوِلْ'], ['أَسْمَعُكِ', 'أَسْمَعُكَ'],
  ['وَاكْتُبِي', 'وَاكْتُبْ'], ['اُكْتُبِي', 'اُكْتُبْ'], ['عُدِّي', 'عُدَّ'], ['أَكْمِلِي', 'أَكْمِلْ'], ['بِإِصْبَعِكِ', 'بِإِصْبَعِكَ'],
  ['قَارِنِي', 'قَارِنْ'], ['وَاحْسُبِي', 'وَاحْسُبْ'], ['اِحْسُبِي', 'اِحْسُبْ'],
  ['وَأَعْطَتْهَا', 'وَأَعْطَتْهُ'], ['مَعَهَا', 'مَعَهُ'], ['أَكَلَتْ', 'أَكَلَ'], // math picture stories about the child
  ['خلصتي', 'خلصت'], ['بقيتي تكتبي', 'بقيت تكتب'], ['إنتي فاكرة', 'إنت فاكر'], ['قرأت صح', 'قرأ صح'], ['كتبت صح', 'كتب صح'], ['قالتها صح', 'قالها صح'], ['جمعتها', 'جمعها']
];
function gx(s) {
  if (s == null || pCur().gender !== 'boy') return s;
  s = String(s);
  for (var i = 0; i < BOY_WORDS.length; i++) s = s.split(BOY_WORDS[i][0]).join(BOY_WORDS[i][1]);
  return s;
}
function gxPage() { // the fixed texts in the page, once at start
  if (pCur().gender !== 'boy') return;
  var it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
  while ((n = it.nextNode())) { var t = gx(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
}
