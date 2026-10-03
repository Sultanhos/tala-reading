// ✨ Weekly report for the parents, inside 📊 تقرير التقدم.
// Claude writes it on the AI helper server (judge/server.js, POST /report) from the week's numbers — never the child's name:
// the report says {name} and the name is filled in here. Without the server, a shorter report is written on the device.
'use strict';

var AI_BUSY = false;
function aiBase() { return String(S.stJudge == null ? ST_DEFAULT_JUDGE : S.stJudge).trim().replace(/\/+$/, ''); }

// what is sent: age, boy / girl, minutes, answers, levels and the hard items of the last 7 days
function aiPayload(k, d) {
  var week = dashDays(7), wk = dashSum(d.log, week), prev = dashSum(d.log, dashDays(7, 7)), areas = {}, hard = {};
  ['read', 'write', 'math', 'speak'].forEach(function (a) {
    var v = wk.area[a] || [0, 0, 0, 0];
    areas[a] = { minutes: Math.round(v[0] / 60), right: v[1], wrong: v[2], level: dashLevel(d, a) };
  });
  ['read', 'write', 'math'].forEach(function (a) {
    hard[a] = dashWeak(d, a).map(function (it) { return { item: aiItemLabel(a, it.k), right: it.ok, wrong: it.bad }; });
  });
  return {
    age: k.age, gender: k.gender === 'boy' ? 'boy' : 'girl', speakLang: d.speakLang === 'de' ? 'de' : 'ar',
    minutes: Math.round(wk.sec / 60), prevMinutes: Math.round(prev.sec / 60), days: wk.played, stars: wk.stars,
    daily: week.map(function (day) { return Math.round(dashSum(d.log, [day]).sec / 60); }),
    areas: areas, hard: hard
  };
}
function aiItemLabel(area, key) {
  if (area !== 'math') return key;
  var L = MLEVELS[(key | 0) - 1];
  return L ? L.t() : key;
}

/* ----- the report written on the device (no server): same shape as Claude's ----- */
function aiLocal(k, pl) {
  var girl = pl.gender !== 'boy', g = function (f, m) { return girl ? f : m; };
  var NAMES = { read: 'القراءة', write: 'الكتابة', math: 'الحساب', speak: 'النطق' };
  var r = { strengths: [], focus: [], activities: [] };
  if (!pl.minutes) {
    r.headline = 'لم ' + g('تلعب', 'يلعب') + ' {name} هذا الأسبوع بعد.';
    r.summary = 'لا مشكلة إطلاقًا. عشر دقائق كل يوم في الموعد نفسه تصنع فرقًا كبيرًا، مثلًا بعد الغداء أو قبل النوم.';
    r.activities.push({ title: 'موعد ثابت', how: 'اختاروا مع {name} موعدًا من عشر دقائق كل يوم، وعلّقوا ورقة على الثلاجة تُوضع عليها نجمة في كل يوم ' + g('تلعب', 'يلعب') + ' فيه.' });
  } else {
    r.headline = '{name} ' + g('لعبت', 'لعب') + ' ' + mNumAr(pl.minutes) + ' دقيقة في ' + mNumAr(pl.days) + ' أيام هذا الأسبوع' + (pl.stars ? ' و' + g('جمعت', 'جمع') + ' ' + mNumAr(pl.stars) + ' نجوم' : '') + '.';
    var diff = pl.minutes - pl.prevMinutes;
    r.summary = pl.prevMinutes ? (diff >= 0 ? 'هذا أكثر من الأسبوع الماضي بـ ' + mNumAr(diff) + ' دقيقة. ' : 'هذا أقل من الأسبوع الماضي بـ ' + mNumAr(-diff) + ' دقيقة. ') : '';
    var best = null;
    Object.keys(pl.areas).forEach(function (a) {
      var v = pl.areas[a], n = v.right + v.wrong;
      if (n >= 5) {
        var p = v.right / n;
        if (p >= 0.8) r.strengths.push(NAMES[a] + ': ' + mNumAr(Math.round(p * 100)) + '٪ إجابات صحيحة' + (v.level ? ' (' + v.level + ')' : '') + '.');
        if (!best || p > best.p) best = { a: a, p: p };
      }
    });
    if (best) r.summary += 'أفضل قسم هذا الأسبوع كان ' + NAMES[best.a] + '.';
    if (pl.days < 4) r.summary += ' وإذا صار اللعب قليلًا كل يوم فسيظهر التقدّم أسرع.';
  }
  var h = pl.hard;
  if (h.read.length) {
    var words = h.read.slice(0, 4).map(function (x) { return x.item; });
    r.focus.push('كلمات ما زالت صعبة: ' + words.join('، ') + '.');
    r.activities.push({ title: 'بطاقات الكلمات', how: 'اكتبوا ' + words.join('، ') + ' على ورق كبير. كل يوم ' + g('تقرأ', 'يقرأ') + ' {name} كل كلمة مرتين بصوت عالٍ، والكلمة التي ' + g('تقرؤها', 'يقرؤها') + ' صحيحةً تُلصق على الثلاجة.' });
  }
  if (h.write.length) {
    var letters = h.write.slice(0, 3).map(function (x) { return x.item; });
    r.focus.push('حروف تحتاج إلى تمرين: ' + letters.join('، ') + '.');
    r.activities.push({ title: 'حروف في الدقيق', how: 'ضعوا دقيقًا أو رملًا في صينية. ' + g('ترسم', 'يرسم') + ' {name} حرف ' + letters.join(' وحرف ') + ' ' +
      g('بإصبعها', 'بإصبعه') + ' ٣ مرات، ثم ' + g('تكتبه', 'يكتبه') + ' على ورقة.' });
  }
  if (h.math.length) {
    r.focus.push('حساب: ' + h.math[0].item + '.');
    r.activities.push({ title: 'العدّ بأشياء من البيت', how: 'استخدموا حبوب الفول أو المعكرونة أو سيارات اللعب لتمارين «' + h.math[0].item + '»: ضعوا، ارفعوا، وعدّوا معًا بصوت عالٍ.' });
  }
  if (!r.activities.length) r.activities.push({ title: 'القراءة معًا', how: 'اقرؤوا مع {name} قصة قصيرة عشر دقائق، و' + g('دعوها تقرأ', 'دعوه يقرأ') + ' كل كلمة فيها حرف من حروف الأسبوع.' });
  r.activities = r.activities.slice(0, 3);
  r.child_message = girl ? 'أحسنتِ يا {name}! أنتِ بطلة وتتعلّمين كل يوم ⭐' : 'أحسنتَ يا {name}! أنتَ بطل وتتعلّم كل يوم ⭐';
  return r;
}

/* ----- asking the server ----- */
function aiFetch(pl) {
  var base = aiBase();
  if (!base) return Promise.reject(new Error('no server'));
  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 40000);
  return fetch(base + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl), signal: ctl ? ctl.signal : undefined })
    .then(function (res) { clearTimeout(timer); if (!res.ok) throw new Error('status ' + res.status); return res.json(); })
    .then(function (r) { if (!r || !r.headline) throw new Error('empty'); return r; });
}
function aiSave(k, d, rep) {
  if (k.id === P.cur) { S.aiReport = rep; save(); return; }
  d.aiReport = rep;
  try { localStorage.setItem(childKey(k.id), JSON.stringify(d)); } catch (e) {}
}
function aiMake(k, d) {
  if (AI_BUSY) return;
  AI_BUSY = true;
  var pl = aiPayload(k, d);
  dashRender(); // shows "writing…"
  aiFetch(pl).then(function (r) { return { ai: true, r: r }; }, function () { return { ai: false, r: aiLocal(k, pl) }; })
    .then(function (x) {
      AI_BUSY = false;
      aiSave(k, d, { at: Date.now(), ai: x.ai, r: x.r });
      if (!$('dashOv').hidden) dashRender();
    });
}

/* ----- showing it ----- */
function aiSection(body, k, d) {
  var box = mEl('div', 'aiBox'), rep = d.aiReport, fresh = rep && rep.r && Date.now() - rep.at < 7 * 864e5;
  var fill = function (t) { return String(t || '').split('{name}').join(k.name); };
  box.appendChild(mEl('h3', '', '✨ تقرير الأسبوع'));
  if (AI_BUSY) {
    box.appendChild(mEl('p', 'aiWait', 'جارٍ كتابة التقرير… ⏳'));
  } else if (fresh) {
    var r = rep.r;
    box.appendChild(mEl('p', 'aiHead', fill(r.headline)));
    if (r.summary) box.appendChild(mEl('p', '', fill(r.summary)));
    [['👍 نقاط القوة', r.strengths], ['🎯 نركّز على', r.focus]].forEach(function (p) {
      if (!p[1] || !p[1].length) return;
      box.appendChild(mEl('b', 'aiT', p[0]));
      var ul = mEl('ul');
      p[1].forEach(function (t) { ul.appendChild(mEl('li', '', fill(t))); });
      box.appendChild(ul);
    });
    if (r.activities && r.activities.length) {
      box.appendChild(mEl('b', 'aiT', '🏠 نشاط في البيت (١٠ دقائق)'));
      r.activities.forEach(function (a) {
        var act = mEl('div', 'aiAct');
        act.appendChild(mEl('b', '', fill(a.title)));
        act.appendChild(mEl('p', '', fill(a.how)));
        box.appendChild(act);
      });
    }
    if (r.child_message) box.appendChild(mEl('p', 'aiKid', '💬 اقرؤوها لـ' + k.name + ': «' + fill(r.child_message) + '»'));
    var when = new Date(rep.at);
    box.appendChild(mEl('small', 'aiFoot', (rep.ai ? 'كتبه الذكاء الاصطناعي من أرقام الأسبوع' : 'تقرير سريع من الجهاز (خادم الذكاء الاصطناعي غير متاح الآن)') +
      ' · ' + mNumAr(when.getDate()) + '/' + mNumAr(when.getMonth() + 1)));
  } else {
    box.appendChild(mEl('p', '', 'ملخّص قصير للأسبوع، وأنشطة بسيطة في البيت مبنية على الكلمات والحروف التي ما زالت صعبة.'));
  }
  var btn = mEl('button', 'go mini', fresh ? '🔄 تقرير جديد' : '✨ اكتب تقرير الأسبوع');
  btn.disabled = AI_BUSY;
  btn.onclick = function () { aiMake(k, d); };
  var row = mEl('div', 'btnRow'); row.appendChild(btn); box.appendChild(row);
  box.appendChild(mEl('small', 'aiFoot', 'ما يُرسل إلى الذكاء الاصطناعي: العمر، ولد أم بنت، أرقام الأسبوع والكلمات الصعبة. الاسم لا يُرسل.'));
  body.appendChild(box);
}
