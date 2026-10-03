// الصفحة الرئيسية: one picture button per activity and a "go on" card for the last one;
// and the pages of the parent area (children, tools, then one page of settings per subject).
'use strict';

var HOME = { read: ['📖', 'القِرَاءَةَ'], write: ['✍️', 'الكِتَابَةَ'], math: ['🔢', 'الحِسَابَ'], speak: ['🐍', 'النُّطْقَ'],
  quran: ['🕌', 'القُرْآنَ'], chat: ['🦜', 'الكَلَامَ مَعَ كُوكُو'], story: ['📚', 'الحِكَايَاتِ'] };
var HOME_VIEWS = ['read', 'write', 'math', 'speak', 'quran', 'chat'];

// the small line under each picture, and how far the child is there (0..1; null = nothing to measure)
function homeInfo(v) {
  if (v === 'read') return [lessonName(S.level), S.doneList.length / Math.max(1, wordsFor(S.level).length)];
  if (v === 'write') return ['المستوى ' + mNumAr(S.wLevel), (S.wLevel - 1) / WLEVELS.length];
  if (v === 'math') return ['المستوى ' + mNumAr(S.mLevel), (S.mLevel - 1) / MLEVELS.length];
  if (v === 'speak') return [S.speakLang === 'de' ? 'S · Z' : 'س · ز · ص', null];
  if (v === 'quran') {
    var q = S.quran || {}, n = Object.keys(q).filter(function (k) { return q[k].step >= 4; }).length;
    return ['جزء عمّ', n / JUZ_AMMA.length];
  }
  return [v === 'chat' ? 'محادثة' : '', null];
}
function homeRender() {
  HOME_VIEWS.forEach(function (v) { $('hSub' + v.charAt(0).toUpperCase() + v.slice(1)).textContent = homeInfo(v)[0]; });
  var last = HOME_VIEWS.indexOf(S.lastView) > -1 ? S.lastView : 'read', info = homeInfo(last);
  $('hCont').setAttribute('data-v', last);
  $('hContPic').textContent = HOME[last][0];
  $('hContT').textContent = gx('تَابِعِي ' + HOME[last][1]);
  $('hContS').textContent = info[0];
  $('hBar').hidden = info[1] == null;
  $('hBarIn').style.width = Math.round(Math.max(0.05, Math.min(1, info[1] || 0)) * 100) + '%';
  $('kidName').textContent = pCur().name;
}
[].forEach.call($('hGrid').querySelectorAll('.hTile'), function (b) { b.onclick = function () { showView(b.getAttribute('data-v')); }; });
$('hCont').onclick = function () { showView(this.getAttribute('data-v') || 'read'); };
$('homeBtn').onclick = function () { showView('home'); };

/* ----- parent area: the list of pages, and one page at a time ----- */
var PP = { general: ['⚙️', 'عام'], read: ['📖', 'القراءة'], write: ['✍️', 'الكتابة'], math: ['🔢', 'الحساب'], speak: ['🐍', 'النطق'],
  koko: ['🦜', 'كوكو والذكاء الاصطناعي'], info: ['💡', 'كيف يعمل التطبيق؟'] };
function ppSummary() {
  var soft = ['عادي', 'مرن', 'مرن جدًا'], help = { auto: 'تتبّع ثم كتابة', trace: 'تتبّع دائمًا', copy: 'نقل', memory: 'من الذاكرة' };
  $('ppSumGeneral').textContent = '⭐ ' + mNumAr(S.stars) + ' · الأصوات: ' + (S.sound ? 'تعمل' : 'متوقفة');
  $('ppSumRead').textContent = lessonName(S.level) + ' · الدقة: ' + soft[S.lenient == null ? 1 : S.lenient];
  $('ppSumWrite').textContent = 'المستوى ' + mNumAr(S.wLevel) + ' · ' + (help[S.wHelp || 'auto'] || '');
  $('ppSumMath').textContent = 'المستوى ' + mNumAr(S.mLevel);
  $('ppSumSpeak').textContent = (S.speakLang === 'de' ? 'ألماني' : 'عربي') + ' · التقييم: ' + (S.rateMode === 'phone' ? 'الهاتف' : 'الأهل');
  $('ppSumKoko').textContent = 'ردود الذكاء الاصطناعي: ' + (S.kokoAI !== false ? 'مفعّلة' : 'متوقفة');
}
function ppShow(g) {
  var page = PP[g] ? g : '';
  $('ppMain').hidden = !!page;
  [].forEach.call($('parentPanel').querySelectorAll('.ppGroup'), function (el) { el.hidden = el.getAttribute('data-g') !== page; });
  $('ppBack').hidden = !page;
  $('ppPic').hidden = !page;
  $('ppPic').textContent = page ? PP[page][0] : '';
  $('ppTitle').textContent = page ? PP[page][1] : 'منطقة الأهل';
  if (!page) ppSummary();
  $('parentPanel').scrollTop = 0;
}
[].forEach.call($('ppMenu').querySelectorAll('button'), function (b) { b.onclick = function () { ppShow(b.getAttribute('data-g')); }; });
$('ppBack').onclick = function () { ppShow(''); };
$('parentBtn').onclick = function () { parentGate(function () { refreshPanel(); ppShow(''); $('parentPanel').hidden = false; }); };
$('ppClose').onclick = function () { $('parentPanel').hidden = true; renderHud(); if (view === 'home') homeRender(); };
