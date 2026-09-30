// Page / mode switching and start-up. Loaded last.
'use strict';

/* ----- page / mode switching ----- */
var curMode = 'train';
function stopAll() {
  if (listening) { hadError = true; try { rec.abort(); } catch (e) {} }
  sRecStop(true);
  wStopDemo();
  rsStop();
  qStop();
  if (ST.playing) ST.playing = false;
  stHush(); stMicStop();
  if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) {} }
}
function setMode(m) {
  stopAll();
  curMode = m;
  $('modeTrain').classList.toggle('on', m === 'train');
  $('modeGame').classList.toggle('on', m === 'game');
  $('warmCard').hidden = true;
  $('trainCard').hidden = m !== 'train';
  $('gameCard').hidden = m !== 'game';
  if (m === 'train') tRender(); else gStartScreen();
}
function showView(v) {
  stopAll();
  view = v;
  $('viewRead').hidden = v !== 'read';
  $('viewWrite').hidden = v !== 'write';
  $('viewMath').hidden = v !== 'math';
  $('viewSpeak').hidden = v !== 'speak';
  $('viewStory').hidden = v !== 'story';
  $('viewQuran').hidden = v !== 'quran';
  $('tabRead').classList.toggle('on', v === 'read');
  $('tabWrite').classList.toggle('on', v === 'write');
  $('tabMath').classList.toggle('on', v === 'math');
  $('tabSpeak').classList.toggle('on', v === 'speak');
  $('tabStory').classList.toggle('on', v === 'story');
  $('tabQuran').classList.toggle('on', v === 'quran');
  renderHud();
  if (v === 'speak') { if (S.warmOn !== false) warmStart(); else setMode(curMode); }
  if (v === 'write') wEnter();
  if (v === 'math') mEnter();
  if (v === 'story') stEnter();
  if (v === 'quran') qEnter();
}
$('tabStory').onclick = function () { showView('story'); };
$('tabQuran').onclick = function () { showView('quran'); };
$('tabMath').onclick = function () { showView('math'); };
$('tabWrite').onclick = function () { showView('write'); };
$('tabRead').onclick = function () { showView('read'); };
$('tabSpeak').onclick = function () { showView('speak'); };
$('modeTrain').onclick = function () { setMode('train'); };
$('modeGame').onclick = function () { setMode('game'); };

spApply();
buildQueue();
nextWord();
kidsStart();
