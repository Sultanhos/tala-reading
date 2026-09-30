// Children: "who is playing?", adding / editing a child, and the parents-only gate.
'use strict';

var KF = { kid: null, gender: 'girl', avatar: AVATARS[0], opts: {} };
var gateUntil = 0, gateAnswer = 0, gateNext = null;

function kidAge(n) { return mNumAr(n) + (n <= 10 ? ' سنين' : ' سنة'); }
function kidSwitch(id) {
  try { sessionStorage.setItem('tala-picked', '1'); } catch (e) {}
  if (id === P.cur) { $('kidsOv').hidden = true; return; }
  P.cur = id; pSave();
  location.reload(); // every part of the game loads the new child's progress from the start
}

/* ----- who is playing? ----- */
function kidsShow() {
  var box = $('kidsList');
  box.textContent = '';
  P.list.forEach(function (k) {
    var b = mEl('button', 'kidCard' + (k.id === P.cur ? ' on' : ''));
    b.appendChild(mEl('span', 'av', k.avatar));
    b.appendChild(mEl('span', '', k.name));
    b.onclick = function () { kidSwitch(k.id); };
    box.appendChild(b);
  });
  $('kidsOv').hidden = false;
}
$('kidBtn').onclick = kidsShow;
$('kidsAdd').onclick = function () { parentGate(function () { kidForm(null, { switchTo: true }); }); };
$('kidsOv').onclick = function (e) { if (e.target === this && !pCur().setup) this.hidden = true; };

/* ----- add / edit a child ----- */
for (var ka = 3; ka <= 12; ka++) { var kao = mEl('option', '', kidAge(ka)); kao.value = ka; $('kfAge').appendChild(kao); }
AVATARS.forEach(function (a) {
  var b = mEl('button', '', a);
  b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', a);
  b.onclick = function () { KF.avatar = a; kfMark(); };
  $('kfAv').appendChild(b);
});
Array.prototype.forEach.call($('kfGender').children, function (b) {
  b.onclick = function () { KF.gender = b.getAttribute('data-g'); kfMark(); };
});
function kfMark() {
  Array.prototype.forEach.call($('kfGender').children, function (b) { b.classList.toggle('on', b.getAttribute('data-g') === KF.gender); });
  Array.prototype.forEach.call($('kfAv').children, function (b) {
    var on = b.textContent === KF.avatar;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}
function kidForm(kid, opts) {
  KF.kid = kid; KF.opts = opts || {};
  var setup = !!KF.opts.setup;
  $('kfTitle').textContent = setup ? 'أهلًا! مين هيلعب؟' : kid ? 'تعديل بيانات ' + kid.name : 'طفل جديد';
  $('kfHello').hidden = !setup;
  $('kfName').value = kid ? kid.name : '';
  $('kfAge').value = String(kid ? kid.age : 6);
  KF.gender = kid ? kid.gender : 'girl';
  KF.avatar = kid ? kid.avatar : AVATARS[P.list.length % AVATARS.length];
  kfMark();
  $('kfErr').textContent = '';
  $('kfCancel').hidden = setup;
  $('kfDelRow').hidden = setup || !kid || P.list.length < 2;
  $('kidsOv').hidden = true;
  $('kidFormOv').hidden = false;
  if (!setup) $('kfName').focus();
}
function kfClose() {
  $('kidFormOv').hidden = true;
  if (KF.opts.fromPanel) kidsPanelRefresh();
}
$('kfCancel').onclick = kfClose;
$('kfSave').onclick = function () {
  var name = $('kfName').value.trim();
  if (!name) { $('kfErr').textContent = 'اكتبوا اسم الطفل.'; $('kfName').focus(); return; }
  var k = KF.kid;
  if (!k) { k = { id: pNewId() }; P.list.push(k); }
  k.name = name; k.age = parseInt($('kfAge').value, 10) || 6; k.gender = KF.gender; k.avatar = KF.avatar;
  delete k.setup;
  pSave();
  if (!KF.kid && KF.opts.switchTo) { kidSwitch(k.id); return; }
  if (k.id === P.cur) { S.name = k.name; save(); kidsHud(); }
  kfClose();
};
$('kfName').onkeydown = function (e) { if (e.key === 'Enter') $('kfSave').click(); };
armed($('kfDel'), 'حذف', function () {
  var k = KF.kid;
  if (!k || P.list.length < 2) return;
  P.list = P.list.filter(function (x) { return x.id !== k.id; });
  try { localStorage.removeItem(childKey(k.id)); } catch (e) {}
  if (k.id === P.cur) { P.cur = P.list[0].id; pSave(); location.reload(); return; }
  pSave();
  kfClose();
});

/* ----- children in the parent panel ----- */
function kidsPanelRefresh() {
  var box = $('ppKids');
  box.textContent = '';
  P.list.forEach(function (k) {
    var r = mEl('div', 'kidRow' + (k.id === P.cur ? ' on' : ''));
    r.appendChild(mEl('span', 'av', k.avatar));
    var nm = mEl('span', 'nm', k.name + ' ');
    nm.appendChild(mEl('span', 'ag', kidAge(k.age)));
    r.appendChild(nm);
    var e = mEl('button', 'small', 'تعديل');
    e.onclick = function () { kidForm(k, { fromPanel: true }); };
    r.appendChild(e);
    box.appendChild(r);
  });
  var c = pCur();
  $('ppFor').textContent = P.list.length > 1 ? 'الإعدادات اللي تحت خاصة بـ ' + c.avatar + ' ' + c.name + '. عشان تغيّروا الطفل اضغطوا على صورته فوق.' : '';
}
$('ppKidAdd').onclick = function () { kidForm(null, { fromPanel: true }); };

/* ----- parents only ----- */
function parentGate(fn) {
  if (Date.now() < gateUntil) { fn(); return; }
  gateNext = fn;
  var a = 3 + Math.floor(Math.random() * 7), b = 4 + Math.floor(Math.random() * 6);
  gateAnswer = a * b;
  $('gateQ').textContent = mNum(a) + ' × ' + mNum(b) + ' = ؟';
  $('gateIn').value = '';
  $('gateErr').textContent = '';
  $('gateOv').hidden = false;
  $('gateIn').focus();
}
$('gateGo').onclick = function () {
  var v = $('gateIn').value.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; })
    .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; }).replace(/\D/g, '');
  if (parseInt(v, 10) === gateAnswer) {
    gateUntil = Date.now() + 2 * 60 * 1000;
    $('gateOv').hidden = true;
    var fn = gateNext; gateNext = null;
    if (fn) fn();
  } else {
    var fnKeep = gateNext;
    parentGate(fnKeep);
    $('gateErr').textContent = 'مش صح، جربوا تاني.';
  }
};
$('gateIn').onkeydown = function (e) { if (e.key === 'Enter') $('gateGo').click(); };
$('gateCancel').onclick = function () { $('gateOv').hidden = true; gateNext = null; };

/* ----- start ----- */
function kidsHud() { var c = pCur(); $('kidBtn').textContent = c.avatar; $('kidBtn').setAttribute('aria-label', 'مين بيلعب؟ دلوقتي: ' + c.name); }
function kidsStart() {
  kidsHud(); gxPage();
  var picked = false;
  try { picked = !!sessionStorage.getItem('tala-picked'); } catch (e) {}
  if (pCur().setup) kidForm(pCur(), { setup: true });
  else if (P.list.length > 1 && !picked) kidsShow();
}
