// Children on this device: name, age, boy/girl, avatar, and each child's own saved progress. Loaded first.
'use strict';

var PKEY = 'tala-profiles-v1';
var AVATARS = ['🐰', '🦊', '🐱', '🐼', '🦁', '🐸', '🐧', '🦄', '🐻', '🐯', '🐨', '🐬'];
var P = { list: [], cur: '' };
try {
  var pSaved = JSON.parse(localStorage.getItem(PKEY) || 'null');
  if (pSaved && Array.isArray(pSaved.list) && pSaved.list.length) P = pSaved;
} catch (e) {}
function pSave() { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }
function childKey(id) { return 'tala-child-' + id; }
function pNewId() { return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
function pFind(id) { for (var i = 0; i < P.list.length; i++) if (P.list[i].id === id) return P.list[i]; return null; }
function pCur() { return pFind(P.cur) || P.list[0]; }

if (!P.list.length) {
  // first start on this device, or the game from before profiles: her progress becomes the first child
  var first = { id: pNewId(), name: '', age: 6, gender: 'girl', avatar: AVATARS[0], setup: true };
  try {
    var oldRaw = localStorage.getItem('arabic-reading-stars-v2');
    if (!oldRaw) { // stars from the very first version of the game
      var v1 = JSON.parse(localStorage.getItem('arabic-reading-stars-v1') || '{}');
      if (v1.stars) oldRaw = JSON.stringify({ stars: v1.stars });
    }
    if (oldRaw) {
      var old = JSON.parse(oldRaw) || {};
      first.name = old.name || 'تالا';
      first.setup = false;
      if (!old.speakLang) old.speakLang = 'de'; // she practised the German S so far; new children start in Arabic
      localStorage.setItem(childKey(first.id), JSON.stringify(old)); // the old key stays as a backup
    }
  } catch (e) {}
  P = { list: [first], cur: first.id };
  pSave();
}
P.cur = pCur().id;
