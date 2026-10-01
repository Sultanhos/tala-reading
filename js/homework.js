// 📷 Homework helper (in the parent area): a photo of the homework page goes to the AI helper server (POST /homework),
// which reads the tasks and the child's handwriting and says for each exercise: right, wrong, unclear, with a tip.
// Two ways: check finished answers, or explain the tasks before she starts. The photo is not stored anywhere.
'use strict';

var HW = { mode: 'check', image: null, busy: false };
var HW_MARK = { right: ['✔', 'صح', 'ok'], wrong: ['✘', 'غلط', 'bad'], empty: ['○', 'من غير إجابة', 'bad'], unclear: ['❓', 'مش واضح', 'unk'],
  open: ['✎', 'من غير إجابة واحدة', 'unk'], explain: ['💡', 'المطلوب', 'unk'] };

function hwDir(t) { return /[؀-ۿ]/.test(t) ? 'rtl' : 'ltr'; } // sums and Latin text read left to right
function hwOpen() {
  HW.image = null; HW.busy = false;
  $('hwPreview').hidden = true; $('hwGo').disabled = true; $('hwResult').textContent = ''; $('hwNote').textContent = '';
  $('hwFile').value = '';
  hwModeSet(HW.mode);
  $('hwOv').hidden = false; $('hwOv').scrollTop = 0;
}
function hwModeSet(m) {
  HW.mode = m;
  $('hwCheck').classList.toggle('on', m === 'check');
  $('hwExplain').classList.toggle('on', m === 'explain');
}
// shrink the photo (long side 1600 px, JPEG) so it is quick to send and still easy to read
function hwLoad(file) {
  if (!file) return;
  var url = URL.createObjectURL(file), img = new Image();
  img.onload = function () {
    var k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    var data = cv.toDataURL('image/jpeg', 0.85);
    URL.revokeObjectURL(url);
    HW.image = data.replace(/^data:image\/jpeg;base64,/, '');
    $('hwPreview').src = data; $('hwPreview').hidden = false;
    $('hwGo').disabled = false; $('hwResult').textContent = ''; $('hwNote').textContent = '';
  };
  img.onerror = function () { URL.revokeObjectURL(url); $('hwNote').textContent = 'مقدرتش أفتح الصورة. جربوا صورة تانية.'; };
  img.src = url;
}
function hwSend() {
  if (HW.busy || !HW.image) return;
  var base = aiBase(), k = pCur();
  if (!base) { $('hwNote').textContent = 'خادم الذكاء الاصطناعي مش متظبط.'; return; }
  HW.busy = true; $('hwGo').disabled = true; $('hwResult').textContent = '';
  $('hwNote').textContent = 'بنقرا الصفحة… ⏳ (ممكن ياخد نص دقيقة)';
  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 90000);
  fetch(base + '/homework', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ image: HW.image, mime: 'image/jpeg', mode: HW.mode, age: k.age, gender: k.gender === 'boy' ? 'boy' : 'girl' }) })
    .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('status ' + r.status)); return j; }); })
    .then(function (r) { clearTimeout(timer); HW.busy = false; $('hwGo').disabled = false; $('hwNote').textContent = ''; hwShow(r); })
    .catch(function (e) {
      clearTimeout(timer); HW.busy = false; $('hwGo').disabled = false;
      var m = String(e && e.message || '');
      $('hwNote').textContent = /too many/.test(m) ? 'محاولات كتير. استنوا شوية وجربوا تاني.' : /bad image/.test(m) ? 'الصورة مش مناسبة. جربوا صورة تانية.'
        : 'مساعد الواجب محتاج خادم الذكاء الاصطناعي والإنترنت، ومش متاح دلوقتي.';
    });
}
function hwShow(r) {
  var box = $('hwResult');
  box.textContent = '';
  if (r.subject) box.appendChild(mEl('div', 'hwSubj', r.subject));
  if (r.summary) box.appendChild(mEl('p', 'hwSum', r.summary));
  if (r.readable === false || !r.items || !r.items.length) return;
  var right = r.items.filter(function (x) { return x.verdict === 'right'; }).length, judged = r.items.filter(function (x) { return x.verdict === 'right' || x.verdict === 'wrong' || x.verdict === 'empty'; }).length;
  if (judged) box.appendChild(mEl('div', 'hwScore', '✔ ' + mNumAr(right) + ' من ' + mNumAr(judged)));
  r.items.forEach(function (x) {
    var mk = HW_MARK[x.verdict] || HW_MARK.unclear, it = mEl('div', 'hwItem ' + mk[2]);
    var head = mEl('div', 'hwHead');
    head.appendChild(mEl('span', 'hwMark', mk[0]));
    var task = mEl('span', 'hwTask', x.task); task.dir = hwDir(x.task);
    head.appendChild(task);
    it.appendChild(head);
    if (x.child_answer) { var a = mEl('div', 'hwLine'); a.appendChild(mEl('b', '', 'المكتوب: ')); var av = mEl('span', '', x.child_answer); av.dir = hwDir(x.child_answer); a.appendChild(av); it.appendChild(a); }
    if (x.correct_answer) { var c = mEl('div', 'hwLine hwRight'); c.appendChild(mEl('b', '', 'الصح: ')); var cv = mEl('span', '', x.correct_answer); cv.dir = hwDir(x.correct_answer); c.appendChild(cv); it.appendChild(c); }
    if (x.tip) it.appendChild(mEl('div', 'hwTip', '💬 ' + x.tip));
    box.appendChild(it);
  });
  box.appendChild(mEl('p', 'hint', 'ده مساعد مش مدرّس: راجعوا النتيجة بنفسكم، خصوصًا لو الخط مش واضح. علامة ❓ معناها إنه مقدرش يقرا الإجابة.'));
}
$('ppHomework').onclick = hwOpen;
$('hwClose').onclick = function () { $('hwOv').hidden = true; HW.image = null; $('hwPreview').removeAttribute('src'); };
$('hwCheck').onclick = function () { hwModeSet('check'); };
$('hwExplain').onclick = function () { hwModeSet('explain'); };
$('hwFile').onchange = function () { hwLoad(this.files && this.files[0]); };
$('hwGo').onclick = hwSend;
