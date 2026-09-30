// نطق in two languages: the words, game questions and the snake's lines, in Arabic (default) and German.
// Each child has their own choice (S.speakLang). Parent-facing texts stay Arabic in both.
'use strict';

var SPK = {
  ar: {
    tts: 'ar-SA', dir: 'rtl',
    // [word, picture, needed words] — words with س, ز and ص at the start, middle and end
    pool: [
      ['سَمَكَة', '🐟', []], ['أَسَد', '🦁', []], ['سَيَّارَة', '🚗', []], ['سَاعَة', '⌚', []],
      ['سُكَّر', '🍬', []], ['فَرَس', '🐴', []], ['كُرْسِي', '🪑', []], ['جَرَس', '🔔', []],
      ['سَرِير', '🛏️', []], ['سَلَّة', '🧺', []], ['سَحَابَة', '☁️', []], ['مَدْرَسَة', '🏫', []],
      ['فُسْتَان', '👗', []], ['بِسْكَوِيت', '🍪', []], ['سَلَطَة', '🥗', []], ['سُلَّم', '🪜', []],
      ['زَرَافَة', '🦒', []], ['زَهْرَة', '🌸', []], ['مَوْز', '🍌', []], ['أَرُزّ', '🍚', []],
      ['صَابُون', '🧼', []], ['عَصِير', '🧃', []], ['قَمِيص', '👕', []], ['مِقَصّ', '✂️', []],
      ['سَبْعَة', '7️⃣', []], ['سِتَّة', '6️⃣', []], ['خَمْسَة', '5️⃣', []],
      ['سَمَكَةٌ فِي البَحْرِ', '🐟 🌊', []],
      ['سَبْعُ سَمَكَاتٍ', '7️⃣ 🐟', []],
      ['أَسَدٌ وَفَرَسٌ', '🦁 🐴', []],
      ['سَاعَةٌ وَجَرَسٌ', '⌚ 🔔', []],
      ['عَصِيرُ مَوْزٍ', '🧃 🍌', []],
      ['زَهْرَةٌ فِي السَّلَّةِ', '🌸 🧺', []],
      ['السَّيَّارَةُ سَرِيعَةٌ', '🚗 💨', []],
      ['سُكَّرٌ وَبِسْكَوِيتٌ', '🍬 🍪', []]
    ],
    qbank: [
      [{ q: 'مَاذَا يَسْبَحُ فِي البَحْرِ؟', p: '🐟' }, { q: 'مَنْ مَلِكُ الغَابَةِ؟', p: '🦁' },
       { q: 'بِمَاذَا نَعْرِفُ الوَقْتَ؟', p: '⌚' }, { q: 'مَاذَا نَرْكَبُ لِنَذْهَبَ إِلَى السُّوقِ؟', p: '🚗' }],
      [{ q: 'أَيُّ حَيَوَانٍ لَهُ رَقَبَةٌ طَوِيلَةٌ جِدًّا؟', p: '🦒' }, { q: 'بِمَاذَا نَغْسِلُ أَيْدِيَنَا؟', p: '🧼' },
       { q: 'عَلَى مَاذَا نَجْلِسُ؟', p: '🪑' }, { q: 'مَا الفَاكِهَةُ الصَّفْرَاءُ الطَّوِيلَةُ؟', p: '🍌' }],
      [{ q: 'أَيْنَ نَنَامُ فِي اللَّيْلِ؟', p: '🛏️' }, { q: 'مَاذَا نَضَعُ فِي الشَّايِ لِيَصِيرَ حُلْوًا؟', p: '🍬' },
       { q: 'أَيْنَ نَتَعَلَّمُ القِرَاءَةَ وَالكِتَابَةَ؟', p: '🏫' }, { q: 'مَاذَا نَشْرَبُ مِنَ البُرْتُقَالِ؟', p: '🧃' }],
      [{ q: 'مَاذَا تَرَيْنَ؟ قُولِي الكَلِمَتَيْنِ!', p: '🦁 🐴', show: true }, { q: 'مَاذَا تَرَيْنَ؟ قُولِي الكَلِمَتَيْنِ!', p: '⌚ 🔔', show: true },
       { q: 'مَاذَا تَرَيْنَ؟ قُولِي الكَلِمَتَيْنِ!', p: '🐟 ☁️', show: true }, { q: 'مَاذَا تَرَيْنَ؟ قُولِي الكَلِمَتَيْنِ!', p: '🧼 🧃', show: true }],
      [{ q: 'عُدِّي مِنْ خَمْسَةٍ إِلَى سَبْعَةٍ.', p: '5️⃣ 6️⃣ 7️⃣' }, { q: 'قُولِي: سَبْعُ سَمَكَاتٍ تَسْبَحُ.', p: '7️⃣ 🐟 🌊' },
       { q: 'قُولِي: السَّيَّارَةُ سَرِيعَةٌ.', p: '🚗 💨' }, { q: 'قُولِي: الأَسَدُ يَجْلِسُ عَلَى الكُرْسِيِّ.', p: '🦁 🪑' }]
    ],
    fb: ['قَرِيب! أَسْنَانُكِ مَعًا، وَلِسَانُكِ خَلْفَ الأَسْنَانِ 🐍', 'جَيِّد! مَرَّةً أُخْرَى بِلِسَانِ الثُّعْبَانِ 🐍', 'أَحْسَنْتِ! 👏', 'رَائِع، السِّينُ وَاضِحَةٌ جِدًّا! 🌟'],
    tipKid: 'الأَسْنَانُ مَعًا، وَاللِّسَانُ خَلْفَ الأَسْنَانِ: سسسس 🐍',
    tipParent: 'الأسنان شبه مقفولة، وطرف اللسان ورا الأسنان (مش بينها). السين = صفير رفيع ومستمر؛ الزاي نفس الصفير بس بصوت؛ الصاد أتقل شوية.',
    sayAfter: function (w) { return 'اِسْتَمِعِي وَقُولِي: ' + w + ' 🎤'; },
    listenFor: function (w) { return 'أَسْمَعُكِ... قُولِي: ' + w + ' 👂'; },
    listening: 'أَسْمَعُكِ... 👂',
    noS: 'لَمْ أَسْمَعْ سِينًا وَاضِحَةً 🐍 لِسَانُكِ خَلْفَ الأَسْنَانِ!',
    nothing: 'لَمْ أَسْمَعْ شَيْئًا 🎤 مَرَّةً أُخْرَى!',
    allDone: 'أَنْهَيْتِ كُلَّ الكَلِمَاتِ! 🎉 اِضْغَطِي ⬅️ لِكَلِمَاتٍ جَدِيدَةٍ.',
    wellDone: 'أَحْسَنْتِ! 🌟',
    almost: function (w) { return 'قَرِيب! مَرَّةً أُخْرَى: ' + w + ' 🐍'; },
    again: 'مَرَّةً أُخْرَى! لِسَانُكِ خَلْفَ الأَسْنَانِ 🐍',
    parentRates: 'مَامَا أَوْ بَابَا يُقَيِّمُ 👂',
    best: function (n) { return 'أَفْضَلُ نَتِيجَةٍ: ' + mNumAr(n) + ' مِنْ ٥٠'; },
    intro: 'سَأَسْأَلُكِ ٥ أَسْئِلَةٍ. أَجِيبِي بِوُضُوحٍ!',
    qNum: function (i) { return 'السُّؤَالُ ' + mNumAr(i) + ' مِنْ ٥'; },
    listenAnswer: 'اِسْتَمِعِي وَأَجِيبِي! 🎤',
    resultBtn: 'النَّتِيجَة ◀', nextBtn: 'التَّالِي ◀',
    star: 'حَصَلْتِ عَلَى نَجْمَةٍ! ⭐',
    noStar: 'قَرِيب! لِلنَّجْمَةِ تَحْتَاجِينَ أَكْثَرَ مِنْ ٤٠ نُقْطَةً. تَدَرَّبِي قَلِيلًا 🐍',
    micOff: 'المَيْكْرُوفُون مُغْلَق 🔇', micNone: 'المَيْكْرُوفُون لَا يَعْمَلُ هُنَا 🔇', tryAgain: 'حَاوِلِي مَرَّةً أُخْرَى 🎤',
    modeTrain: '🏋️ تَدْرِيب', modeGame: '🎮 لُعْبَة', go: 'هَيَّا نَبْدَأُ! ◀', retryBtn: '🔁 مَرَّةً أُخْرَى',
    ldTitle: 'النَّتِيجَة', ldAgain: 'اِلْعَبِي مَرَّةً أُخْرَى 🔁', ldTrain: '🏋️ إِلَى التَّدْرِيبِ',
    warmWord: 'سِي – سَا – سُو', warmTts: 'سِيييي. سَاااا. سُوووو.',
    warmKid: 'تَسْخِين! قُولِي ٣ مَرَّاتٍ: 🐍',
    warmTap: 'اِضْغَطِي 🎤 وَقُولِي: سِي – سَا – سُو 🐍',
    warmDone: 'رَائِع! ٣ مَرَّاتٍ صَحِيحَة 🎉 هَيَّا نَبْدَأُ!',
    warmRight: function (n) { return 'صَحِيح! 🌟 بَاقِي ' + mNumAr(n) + ': سِي – سَا – سُو'; },
    warmBad: 'مَرَّةً أُخْرَى! أَسْنَانُكِ مَعًا، وَلِسَانُكِ خَلْفَ الأَسْنَانِ: سِي – سَا – سُو 🐍',
    warmNoS: 'لَمْ أَسْمَعْ سِينًا وَاضِحَةً 🐍 مَرَّةً أُخْرَى: سِي – سَا – سُو',
    warmRuns: 'قُولِي الثَّلَاثَةَ: سِي – سَا – سُو 🐍',
    warmAlmost: 'قَرِيب! مَرَّةً أُخْرَى: سِي – سَا – سُو 🐍'
  },
  de: {
    tts: 'de-DE', dir: 'ltr',
    pool: [
      ['Sonne','☀️',[['sonne']]], ['Sand','🏖️',[['sand']]], ['Suppe','🍲',[['suppe']]], ['Seife','🧼',[['seife']]],
      ['Sofa','🛋️',[['sofa']]], ['Salat','🥗',[['salat']]], ['Socke','🧦',[['socke']]], ['Wasser','💧',[['wasser']]],
      ['Tasse','☕',[['tasse']]], ['Haus','🏠',[['haus']]], ['Maus','🐭',[['maus']]], ['Eis','🍦',[['eis']]],
      ['Bus','🚌',[['bus']]], ['Glas','🥛',[['glas']]], ['Nase','👃',[['nase']]], ['Hase','🐰',[['hase']]],
      ['Zahn','🦷',[['zahn','zahne']]], ['Zebra','🦓',[['zebra']]], ['Zug','🚂',[['zug']]], ['Zitrone','🍋',[['zitrone']]],
      ['Zelt','⛺',[['zelt']]], ['Zucker','🍬',[['zucker']]], ['Katze','🐱',[['katze']]], ['Kerze','🕯️',[['kerze']]],
      ['Herz','❤️',[['herz']]], ['Pilz','🍄',[['pilz']]], ['Zirkus','🎪',[['zirkus','circus']]], ['Cent','🪙',[['cent','zent','sent']]],
      ['Ziege','🐐',[['ziege']]], ['Zwiebel','🧅',[['zwiebel']]], ['Blitz','⚡',[['blitz']]], ['Salz','🧂',[['salz']]],
      ['Sonne und Sand','☀️ 🏖️',[['sonne'],['sand']]],
      ['Zwei Zebras','2️⃣ 🦓',[['zwei','2'],['zebras','zebra']]],
      ['Sieben Zitronen','7️⃣ 🍋',[['sieben','7'],['zitronen','zitrone']]],
      ['Zucker und Salz','🍬 🧂',[['zucker'],['salz']]],
      ['Die Maus im Haus','🐭 🏠',[['maus'],['haus']]],
      ['Eis im Sand','🍦 🏖️',[['eis'],['sand']]],
      ['Zehn Zähne','🔟 🦷',[['zehn','10'],['zahne','zahn']]],
      ['Der Zug fährt zum Zoo','🚂',[['zug'],['zoo']]],
      ['Die Katze sitzt auf dem Sofa','🐱 🛋️',[['katze'],['sitzt'],['sofa']]],
      ['Wasser und Seife','💧 🧼',[['wasser'],['seife']]]
    ],
    qbank: [
      [ {q:'Was strahlt am Himmel und macht warm?', needs:[['sonne']], p:'☀️'},
        {q:'Welches Tier hat schwarze und weiße Streifen?', needs:[['zebra']], p:'🦓'},
        {q:'Woraus baut man am Strand eine Burg?', needs:[['sand']], p:'🏖️'},
        {q:'Was hast du im Mund und putzt du jeden Abend?', needs:[['zahn','zahne']], p:'🦷'} ],
      [ {q:'Was ist nass und man kann darin schwimmen?', needs:[['wasser']], p:'💧'},
        {q:'Welches kleine Tier frisst gern Käse?', needs:[['maus']], p:'🐭'},
        {q:'Womit fährt man mit vielen Leuten in die Stadt?', needs:[['bus']], p:'🚌'},
        {q:'Was ist kalt und süß und schmeckt im Sommer?', needs:[['eis']], p:'🍦'} ],
      [ {q:'Welches Tier sagt miau?', needs:[['katze','kater']], p:'🐱'},
        {q:'Was ist gelb und schmeckt sauer?', needs:[['zitrone']], p:'🍋'},
        {q:'Was fährt auf Schienen und macht tuut tuut?', needs:[['zug']], p:'🚂'},
        {q:'Was brennt auf dem Geburtstagskuchen?', needs:[['kerze']], p:'🕯️'} ],
      [ {q:'Was ist weiß und süß und kommt in den Tee?', needs:[['zucker']], p:'🍬'},
        {q:'Was streut man auf die Pommes? Es ist weiß und salzig.', needs:[['salz']], p:'🧂'},
        {q:'Was siehst du? Sag beide Wörter!', needs:[['sonne'],['sand']], p:'☀️ 🏖️', show:true},
        {q:'Was siehst du? Sag beide Wörter!', needs:[['maus'],['haus']], p:'🐭 🏠', show:true},
        {q:'Was siehst du? Sag beide Wörter!', needs:[['zitrone'],['zucker']], p:'🍋 🍬', show:true} ],
      [ {q:'Zähle von sechs bis acht.', needs:[['sechs','6'],['sieben','7']], p:'6️⃣ 7️⃣ 8️⃣'},
        {q:'Zähle von eins bis drei.', needs:[['eins','1'],['zwei','2']], p:'1️⃣ 2️⃣ 3️⃣'},
        {q:'Sag nach: Sieben Zebras sitzen im Sand.', needs:[['sieben','7'],['zebras','zebra'],['sitzen','sitzt'],['sand']], p:'7️⃣ 🦓 🏖️'},
        {q:'Sag nach: Zwei Katzen sitzen auf dem Sofa.', needs:[['zwei','2'],['katzen','katze'],['sitzen','sitzt'],['sofa']], p:'2️⃣ 🐱 🛋️'} ]
    ],
    fb: ['Fast! Zähne zusammen, Zunge hinter die Zähne 🐍', 'Gut! Noch einmal mit der Schlangen-Zunge 🐍', 'Sehr gut! 👏', 'Super, ganz klar gesprochen! 🌟'],
    tipKid: 'Zähne fast zusammen, Zunge hinter die Zähne: ssss 🐍  ·  bei Z: tssss 🦓',
    tipParent: 'الأسنان شبه مقفولة، وطرف اللسان يفضل ورا الأسنان (مش بينها). S = صفير رفيع ومستمر. Z = «ت» سريعة وبعدها الصفير.',
    sayAfter: function (w) { return 'Hör zu und sag nach: ' + w + ' 🎤'; },
    listenFor: function (w) { return 'Ich höre zu... sag: ' + w + ' 👂'; },
    listening: 'Ich höre zu... 👂',
    noS: 'Ich habe kein klares S gehört 🐍 Zunge hinter die Zähne!',
    nothing: 'Ich habe nichts gehört 🎤 Nochmal!',
    allDone: 'Alle Wörter geschafft! 🎉 Tippe auf ➡️ für neue Wörter.',
    wellDone: 'Toll gemacht! 🌟',
    almost: function (w) { return 'Fast! Noch einmal: ' + w + ' 🐍'; },
    again: 'Nochmal! Zunge hinter die Zähne 🐍',
    parentRates: 'Mama oder Papa bewertet 👂',
    best: function (n) { return 'Bestes Ergebnis: ' + n + ' / 50'; },
    intro: 'Ich stelle dir 5 Fragen. Antworte schön klar!',
    qNum: function (i) { return 'Frage ' + i + ' von 5'; },
    listenAnswer: 'Hör zu und antworte! 🎤',
    resultBtn: 'Ergebnis ▶', nextBtn: 'Weiter ➡️',
    star: 'Du hast einen Stern verdient! ⭐',
    noStar: 'Fast geschafft! Für einen Stern brauchst du mehr als 40 Punkte. Übe noch ein bisschen 🐍',
    micOff: 'Das Mikrofon ist aus 🔇', micNone: 'Hier geht das Mikrofon nicht 🔇', tryAgain: 'Nochmal versuchen 🎤',
    modeTrain: '🏋️ Training', modeGame: '🎮 Spiel', go: "Los geht's! ▶", retryBtn: '🔁 Nochmal',
    ldTitle: 'Ergebnis', ldAgain: 'Nochmal spielen 🔁', ldTrain: '🏋️ Zum Training',
    warmWord: 'Siii – Saaa – Sooo', warmTts: 'Siii. Saaa. Sooo.',
    warmKid: 'Aufwärmen! Sag 3-mal schön: 🐍',
    warmTap: 'Tippe auf 🎤 und sag: Siii – Saaa – Sooo 🐍',
    warmDone: 'Super! 3-mal richtig 🎉 Jetzt geht es los!',
    warmRight: function (n) { return 'Richtig! 🌟 Noch ' + n + '-mal: Siii – Saaa – Sooo'; },
    warmBad: 'Nochmal! Zähne zusammen, Zunge hinter die Zähne: Siii – Saaa – Sooo 🐍',
    warmNoS: 'Ich habe kein klares S gehört 🐍 Nochmal: Siii – Saaa – Sooo',
    warmRuns: 'Sag alle drei: Siii – Saaa – Sooo 🐍',
    warmAlmost: 'Fast! Noch einmal: Siii – Saaa – Sooo 🐍'
  }
};
function spL() { return SPK[S.speakLang === 'de' ? 'de' : 'ar']; }
// one text in the child's practice language; functions take their argument (a word, a number)
function sp(key, arg) { var v = spL()[key]; return typeof v === 'function' ? v(arg) : v; }

// the fixed texts of the نطق page, the result sheet and the parent's rating buttons
function spApply() {
  var L = spL(), view = $('viewSpeak');
  view.lang = S.speakLang === 'de' ? 'de' : 'ar'; // only the texts turn right-to-left (CSS .spAr), not the owl and buttons
  view.classList.toggle('spAr', L.dir === 'rtl');
  $('lispDone').querySelector('.sheet').dir = L.dir;
  [['warmTipKid', 'warmKid'], ['warmWord', 'warmWord'], ['modeTrain', 'modeTrain'], ['modeGame', 'modeGame'], ['gGo', 'go'],
   ['gRetry', 'retryBtn'], ['ldTitle', 'ldTitle'], ['ldAgain', 'ldAgain'], ['ldTrain', 'ldTrain']].forEach(function (p) {
    $(p[0]).textContent = gx(L[p[1]]);
  });
  $('tNext').textContent = L.dir === 'rtl' ? '⬅️' : '➡️';
  $('warmTipParent').textContent = 'تمرين البداية: «' + L.warmWord + '» صح ٣ مرات، وبعدها يتفتح التدريب واللعبة.';
}
function spSetLang(v) {
  S.speakLang = v === 'de' ? 'de' : 'ar'; save();
  tRound = []; // new words in the new language
  spApply();
  if (view === 'speak') showView('speak');
}
