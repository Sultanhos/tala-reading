// 🦜 Koko, the talking buddy: short spoken conversations in simple Arabic about animals, colours, food, family and
// the child's day. Without AI Koko follows a small script that listens: it picks up what the child said (the lion ->
// what does the lion eat?), says when an answer is right, corrects kindly, and asks again when it did not understand.
// If the parents switch it on, Claude answers freely on the AI helper server (POST /chat): text only, never the name.
'use strict';

/* ----- what Koko knows ----- */
// k: words to listen for (without vowel marks, ا for أ/إ/آ, ه for ة); n: the name; f: feminine
var C_ANIMALS = [
  { k: ['اسد'], n: 'الأَسَدُ', a: 'الأَسَدَ', c: 'الأَسَدُ قَوِيٌّ وَشُجَاعٌ، وَهُوَ مَلِكُ الغَابَةِ!', food: [['لحم'], 'اللَّحْمَ'], home: [['غاب', 'حديق'], 'فِي الغَابَةِ'] },
  { k: ['قط', 'بس'], n: 'القِطَّةُ', a: 'القِطَّةَ', f: 1, c: 'القِطَّةُ لَطِيفَةٌ وَنَاعِمَةٌ!', food: [['سمك', 'لبن', 'حليب', 'لحم'], 'السَّمَكَ وَالحَلِيبَ'], home: [['بيت', 'منزل', 'شارع'], 'فِي البَيْتِ'] },
  { k: ['كلب'], n: 'الكَلْبُ', a: 'الكَلْبَ', c: 'الكَلْبُ وَفِيٌّ وَيُحِبُّ اللَّعِبَ!', food: [['لحم', 'عظم'], 'اللَّحْمَ وَالعَظْمَ'], home: [['بيت', 'منزل', 'شارع'], 'فِي البَيْتِ'] },
  { k: ['ارنب'], n: 'الأَرْنَبُ', a: 'الأَرْنَبَ', c: 'الأَرْنَبُ سَرِيعٌ وَلَهُ أُذُنَانِ طَوِيلَتَانِ!', food: [['جزر', 'خس', 'عشب', 'برسيم'], 'الجَزَرَ وَالخَسَّ'], home: [['حقل', 'مزرع', 'بيت', 'جحر', 'غاب'], 'فِي الحَقْلِ'] },
  { k: ['حصان', 'خيل'], n: 'الحِصَانُ', a: 'الحِصَانَ', c: 'الحِصَانُ سَرِيعٌ وَجَمِيلٌ!', food: [['عشب', 'شعير', 'جزر', 'تبن', 'برسيم'], 'العُشْبَ وَالشَّعِيرَ'], home: [['مزرع', 'اسطبل', 'حقل'], 'فِي المَزْرَعَةِ'] },
  { k: ['فيل'], n: 'الفِيلُ', a: 'الفِيلَ', c: 'الفِيلُ كَبِيرٌ جِدًّا وَلَهُ خُرْطُومٌ طَوِيلٌ!', food: [['عشب', 'ورق', 'فاكه', 'موز', 'شجر', 'نبات'], 'العُشْبَ وَأَوْرَاقَ الشَّجَرِ'], home: [['غاب', 'حديق'], 'فِي الغَابَةِ'] },
  { k: ['زراف'], n: 'الزَّرَافَةُ', a: 'الزَّرَافَةَ', f: 1, c: 'الزَّرَافَةُ طَوِيلَةٌ جِدًّا، وَرَقَبَتُهَا طَوِيلَةٌ!', food: [['ورق', 'شجر', 'عشب', 'نبات'], 'أَوْرَاقَ الشَّجَرِ'], home: [['غاب', 'حديق'], 'فِي الغَابَةِ'] },
  { k: ['سمك'], n: 'السَّمَكَةُ', a: 'السَّمَكَةَ', f: 1, c: 'السَّمَكَةُ تَسْبَحُ بِسُرْعَةٍ!', food: [['طحلب', 'دود', 'نبات', 'خبز', 'طعام', 'سمك'], 'النَّبَاتَاتِ الصَّغِيرَةَ'], home: [['ماء', 'بحر', 'نهر', 'حوض', 'مياه', 'ميه'], 'فِي المَاءِ'] },
  { k: ['عصفور', 'طاير', 'طائر', 'طير', 'ببغا'], n: 'العُصْفُورُ', a: 'العُصْفُورَ', c: 'العُصْفُورُ يَطِيرُ وَيُغَرِّدُ، مِثْلِي أَنَا!', food: [['حب', 'قمح', 'دود', 'خبز', 'بذور'], 'الحُبُوبَ'], home: [['شجر', 'عش', 'سما', 'قفص'], 'فِي العُشِّ فَوْقَ الشَّجَرَةِ'] },
  { k: ['قرد'], n: 'القِرْدُ', a: 'القِرْدَ', c: 'القِرْدُ ذَكِيٌّ وَيُحِبُّ القَفْزَ!', food: [['موز', 'فاكه', 'فول'], 'المَوْزَ'], home: [['غاب', 'شجر', 'حديق'], 'فِي الغَابَةِ'] },
  { k: ['بقر'], n: 'البَقَرَةُ', a: 'البَقَرَةَ', f: 1, c: 'البَقَرَةُ تُعْطِينَا الحَلِيبَ!', food: [['عشب', 'برسيم', 'تبن', 'نبات'], 'العُشْبَ'], home: [['مزرع', 'حقل'], 'فِي المَزْرَعَةِ'] },
  { k: ['خروف', 'غنم', 'خرفان'], n: 'الخَرُوفُ', a: 'الخَرُوفَ', c: 'الخَرُوفُ صُوفُهُ نَاعِمٌ!', food: [['عشب', 'برسيم'], 'العُشْبَ'], home: [['مزرع', 'حقل'], 'فِي المَزْرَعَةِ'] },
  { k: ['دب'], n: 'الدُّبُّ', a: 'الدُّبَّ', c: 'الدُّبُّ كَبِيرٌ وَيُحِبُّ العَسَلَ!', food: [['عسل', 'سمك', 'فاكه'], 'العَسَلَ وَالسَّمَكَ'], home: [['غاب', 'جبل', 'كهف'], 'فِي الغَابَةِ'] },
  { k: ['جمل'], n: 'الجَمَلُ', a: 'الجَمَلَ', c: 'الجَمَلُ يَصْبِرُ عَلَى العَطَشِ!', food: [['عشب', 'نبات', 'شوك'], 'العُشْبَ'], home: [['صحرا'], 'فِي الصَّحْرَاءِ'] },
  { k: ['دجاج', 'فرخ', 'كتكوت'], n: 'الدَّجَاجَةُ', a: 'الدَّجَاجَةَ', f: 1, c: 'الدَّجَاجَةُ تُعْطِينَا البَيْضَ!', food: [['حب', 'قمح', 'ذر', 'خبز'], 'الحُبُوبَ'], home: [['مزرع', 'بيت', 'قن'], 'فِي المَزْرَعَةِ'] },
  { k: ['بط'], n: 'البَطَّةُ', a: 'البَطَّةَ', f: 1, c: 'البَطَّةُ تَسْبَحُ فِي المَاءِ!', food: [['حب', 'خبز', 'سمك', 'نبات', 'عشب'], 'الحُبُوبَ'], home: [['ماء', 'بحير', 'نهر', 'مزرع', 'ميه'], 'فِي المَاءِ'] },
  { k: ['نمر'], n: 'النَّمِرُ', a: 'النَّمِرَ', c: 'النَّمِرُ سَرِيعٌ وَمُخَطَّطٌ!', food: [['لحم'], 'اللَّحْمَ'], home: [['غاب', 'حديق'], 'فِي الغَابَةِ'] },
  { k: ['سلحف'], n: 'السُّلَحْفَاةُ', a: 'السُّلَحْفَاةَ', f: 1, c: 'السُّلَحْفَاةُ بَطِيئَةٌ وَلَهَا بَيْتٌ عَلَى ظَهْرِهَا!', food: [['خس', 'عشب', 'نبات', 'خضار'], 'الخَسَّ وَالعُشْبَ'], home: [['بحر', 'ماء', 'حديق', 'بيت', 'ميه'], 'فِي المَاءِ وَعَلَى الأَرْضِ'] }
];
var C_COLORS = [
  { k: ['احمر', 'حمرا'], n: 'الأَحْمَرُ', like: 'مِثْلُ التُّفَّاحَةِ' }, { k: ['ازرق', 'زرقا'], n: 'الأَزْرَقُ', like: 'مِثْلُ السَّمَاءِ' },
  { k: ['اخضر', 'خضرا'], n: 'الأَخْضَرُ', like: 'مِثْلُ العُشْبِ' }, { k: ['اصفر', 'صفرا'], n: 'الأَصْفَرُ', like: 'مِثْلُ الشَّمْسِ' },
  { k: ['برتقال'], n: 'البُرْتُقَالِيُّ', like: 'مِثْلُ البُرْتُقَالَةِ' }, { k: ['بنفسج', 'موف'], n: 'البَنَفْسَجِيُّ', like: 'مِثْلُ العِنَبِ' },
  { k: ['ورد', 'بمبي', 'زهري'], n: 'الوَرْدِيُّ', like: 'مِثْلُ الوَرْدَةِ' }, { k: ['ابيض', 'بيضا'], n: 'الأَبْيَضُ', like: 'مِثْلُ الثَّلْجِ' },
  { k: ['اسود', 'سودا'], n: 'الأَسْوَدُ', like: 'مِثْلُ اللَّيْلِ' }, { k: ['بني'], n: 'البُنِّيُّ', like: 'مِثْلُ الشُّوكُولَاتَةِ' }
];
// the colour questions: [id, question, right colour (index in C_COLORS), the answer as a sentence]
var C_COLOR_Q = [['sky', 'مَا لَوْنُ السَّمَاءِ؟', 1, 'السَّمَاءُ زَرْقَاءُ.'], ['banana', 'مَا لَوْنُ المَوْزِ؟', 3, 'المَوْزُ أَصْفَرُ.'],
  ['grass', 'مَا لَوْنُ العُشْبِ؟', 2, 'العُشْبُ أَخْضَرُ.'], ['milk', 'وَمَا لَوْنُ الحَلِيبِ؟', 7, 'الحَلِيبُ أَبْيَضُ.']];
var C_FOODS = [
  { k: ['ارز', 'رز'], n: 'الأَرُزُّ' }, { k: ['مكرون', 'معكرون', 'باستا'], n: 'المَكَرُونَةُ', f: 1 }, { k: ['بيتزا'], n: 'البِيتْزَا', f: 1 },
  { k: ['دجاج', 'فراخ'], n: 'الدَّجَاجُ' }, { k: ['سمك'], n: 'السَّمَكُ' }, { k: ['لحم', 'كفت'], n: 'اللَّحْمُ' }, { k: ['خبز', 'عيش'], n: 'الخُبْزُ' },
  { k: ['بيض'], n: 'البَيْضُ' }, { k: ['جبن'], n: 'الجُبْنُ' }, { k: ['بطاطس', 'بطاطا'], n: 'البَطَاطِسُ', f: 1 }, { k: ['شورب', 'حسا'], n: 'الشُّورْبَةُ', f: 1 },
  { k: ['كشري'], n: 'الكُشَرِيُّ' }, { k: ['برجر'], n: 'البُرْجَرُ' }, { k: ['فول'], n: 'الفُولُ' }, { k: ['ملوخي'], n: 'المُلُوخِيَّةُ', f: 1 }
];
var C_FRUITS = [
  { k: ['تفاح'], n: 'التُّفَّاحُ' }, { k: ['موز'], n: 'المَوْزُ' }, { k: ['برتقال'], n: 'البُرْتُقَالُ' }, { k: ['عنب'], n: 'العِنَبُ' },
  { k: ['فراول'], n: 'الفَرَاوِلَةُ', f: 1 }, { k: ['بطيخ'], n: 'البَطِّيخُ' }, { k: ['مانج'], n: 'المَانْجُو' }, { k: ['خوخ'], n: 'الخَوْخُ' },
  { k: ['تمر', 'بلح'], n: 'التَّمْرُ' }, { k: ['كمثر'], n: 'الكُمَّثْرَى', f: 1 }
];
var C_DRINKS = [
  { k: ['حليب', 'لبن'], r: 'الحَلِيبُ يُقَوِّي العِظَامَ!' }, { k: ['عصير'], r: 'العَصِيرُ لَذِيذٌ وَمُفِيدٌ!' },
  { k: ['ماء', 'ميه', 'مياه'], r: 'المَاءُ مُهِمٌّ جِدًّا لِلْجِسْمِ!' }, { k: ['شاي'], r: 'الشَّايُ دَافِئٌ!' }, { k: ['كاكاو', 'شوكولات'], r: 'الكَاكَاوُ لَذِيذٌ!' }
];
// answers of one kind: [words to listen for, Koko's reply]
var C_COOK = [[['ماما', 'امي', 'والدت'], 'طَعَامُ مَامَا لَذِيذٌ دَائِمًا!'], [['بابا', 'ابي', 'ابوي', 'والدي'], 'بَابَا طَبَّاخٌ مَاهِرٌ!'], [['جد', 'تيت', 'ستي', 'نان'], 'طَعَامُ الجَدَّةِ لَذِيذٌ جِدًّا!']];
var C_PLAY = [[['كره', 'كور'], 'اللَّعِبُ بِالكُرَةِ مُمْتِعٌ!'], [['رسم', 'تلوين', 'لون'], 'الرَّسْمُ جَمِيلٌ!'], [['مكعب', 'ليجو'], 'المُكَعَّبَاتُ مُمْتِعَةٌ!'],
  [['استغماي', 'غميض', 'جري', 'سباق', 'نجري'], 'الجَرْيُ وَاللَّعِبُ مُمْتِعٌ!'], [['قص', 'كتاب', 'حكاي', 'نقرا'], 'القِصَصُ جَمِيلَةٌ!']];
var C_DID = [[['مدرس', 'حضان', 'روض'], 'المَدْرَسَةُ مَكَانٌ جَمِيلٌ لِلتَّعَلُّمِ!'], [['لعب'], 'اللَّعِبُ مُمْتِعٌ!'], [['رسم', 'لون'], 'الرَّسْمُ جَمِيلٌ!'],
  [['قرا', 'كتاب', 'ذاكر', 'درس'], 'القِرَاءَةُ تَجْعَلُنَا أَذْكِيَاءَ!'], [['اكل', 'فطر', 'غدا'], 'بِالهَنَاءِ وَالشِّفَاءِ!'], [['نمت', 'نام'], 'النَّوْمُ مُفِيدٌ لِلْجِسْمِ!'],
  [['خرج', 'حديق', 'نزه', 'تمشي'], 'النُّزْهَةُ مُمْتِعَةٌ!']];
var C_TOY = [[['دمي', 'عروس'], 'الدُّمْيَةُ لُعْبَةٌ جَمِيلَةٌ!'], [['كره', 'كور'], 'الكُرَةُ لُعْبَةٌ مُمْتِعَةٌ!'], [['سيار', 'عربي'], 'السَّيَّارَاتُ سَرِيعَةٌ وَمُمْتِعَةٌ!'],
  [['مكعب', 'ليجو'], 'المُكَعَّبَاتُ مُمْتِعَةٌ!'], [['دراج', 'عجل'], 'الدَّرَّاجَةُ مُمْتِعَةٌ!']];
var C_YES = ['نعم', 'ايوه', 'ايوا', 'اه', 'اجل', 'طبعا', 'اكيد'], C_NO = ['لا', 'لم', 'ليس', 'مش', 'ما', 'مفيش', 'ابدا'];
var C_LINES = {
  hello: 'مَرْحَبًا يَا {name}! أَنَا كُوكُو 🦜 هَيَّا نَتَكَلَّمُ! اِخْتَارِي مَوْضُوعًا.',
  pick: 'اِخْتَارِي مَوْضُوعًا أَوَّلًا 👆', pickNew: 'اِخْتَارِي مَوْضُوعًا جَدِيدًا 👆',
  again: 'لَمْ أَسْمَعْكِ جَيِّدًا 🦜 قُولِيهَا مَرَّةً أُخْرَى',
  what: 'لَمْ أَفْهَمْ جَيِّدًا 🦜', ok: 'حَسَنًا.', right: 'صَحِيح!', notQuite: 'لَيْسَ تَمَامًا.',
  bye: 'اِسْتَمْتَعْتُ بِالكَلَامِ مَعَكِ يَا {name}! اِخْتَارِي مَوْضُوعًا آخَرَ 🦜'
};

/* ----- understanding an answer ----- */
function cNorm(t) { return norm(t).replace(/ة/g, 'ه'); }
function cHas(a, list) { return list.some(function (k) { return a.indexOf(k) > -1; }); }
function cWord(a, list) { var w = a.split(/\s+/); return list.some(function (k) { return w.indexOf(k) > -1; }); } // short words: whole word only
function cFind(a, items) { for (var i = 0; i < items.length; i++) if (cHas(a, items[i].k)) return items[i]; return null; }
function cPair(a, pairs) { for (var i = 0; i < pairs.length; i++) if (cHas(a, pairs[i][0])) return pairs[i][1]; return null; }

// Koko's sentences that depend on the answer (also listed for the voice recordings, see cAllLines)
var CT = {
  eatQ: function (A) { return 'مَاذَا ' + (A.f ? 'تَأْكُلُ ' : 'يَأْكُلُ ') + A.n + '؟'; },
  eatA: function (A) { return A.n + ' ' + (A.f ? 'تَأْكُلُ ' : 'يَأْكُلُ ') + A.food[1] + '.'; },
  eatH: function (A) { return (A.f ? 'تَأْكُلُ ' : 'يَأْكُلُ ') + A.food[1]; },
  liveQ: function (A) { return 'أَيْنَ ' + (A.f ? 'تَعِيشُ ' : 'يَعِيشُ ') + A.n + '؟'; },
  liveA: function (A) { return A.n + ' ' + (A.f ? 'تَعِيشُ ' : 'يَعِيشُ ') + A.home[1] + '.'; },
  liveH: function (A) { return (A.f ? 'تَعِيشُ ' : 'يَعِيشُ ') + A.home[1]; },
  seenQ: function (A) { return 'هَلْ رَأَيْتِ ' + A.a + ' مِنْ قَبْلُ؟'; },
  color: function (c) { return 'اللَّوْنُ ' + c.n + ' جَمِيلٌ، ' + c.like + '!'; },
  food: function (f) { return f.n + (f.f ? ' لَذِيذَةٌ' : ' لَذِيذٌ') + '! أَمَّا أَنَا فَأُحِبُّ الحُبُوبَ.'; },
  fruit: function (f) { return f.n + (f.f ? ' مُفِيدَةٌ وَلَذِيذَةٌ!' : ' مُفِيدٌ وَلَذِيذٌ!'); }
};
// a question with one right colour
function cColorNode(i) {
  var d = C_COLOR_Q[i], next = C_COLOR_Q[i + 1] ? C_COLOR_Q[i + 1][0] : 'end', right = C_COLORS[d[2]];
  return { q: d[1], hints: [d[3].replace(/\.$/, '')],
    on: function (a) { var c = cFind(a, C_COLORS); return c === right ? [C_LINES.right + ' ' + d[3], next] : c ? [C_LINES.notQuite + ' ' + d[3], next] : null; },
    skip: d[3], next: next };
}

/* ----- the conversations: each question listens for an answer (on -> [reply, next question]) ----- */
// on() returns null when Koko did not understand: it asks once more, then says `skip` and goes on to `next`
var C_TOPICS = [
  { id: 'animals', icon: '🐾', t: 'الحَيَوَانَات', a: 'عَنِ الحَيَوَانَاتِ', start: 'fav', nodes: {
    fav: { q: 'مَا حَيَوَانُكِ المُفَضَّلُ؟', hints: ['أُحِبُّ القِطَّةَ', 'أُحِبُّ الأَسَدَ'],
      on: function (a, x) { var A = cFind(a, C_ANIMALS); if (!A) return null; x.A = A; return [A.c, 'eat']; },
      skip: function (x) { x.A = C_ANIMALS[1]; return 'حَسَنًا! أَنَا أُحِبُّ القِطَّةَ.'; }, next: 'eat' },
    eat: { q: function (x) { return CT.eatQ(x.A); }, hints: function (x) { return [CT.eatH(x.A)]; },
      on: function (a, x) { return cHas(a, x.A.food[0]) ? [C_LINES.right + ' ' + CT.eatA(x.A), 'live'] : null; },
      skip: function (x) { return CT.eatA(x.A); }, next: 'live' },
    live: { q: function (x) { return CT.liveQ(x.A); }, hints: function (x) { return [CT.liveH(x.A)]; },
      on: function (a, x) { return cHas(a, x.A.home[0]) ? [C_LINES.right + ' ' + CT.liveA(x.A), 'seen'] : null; },
      skip: function (x) { return CT.liveA(x.A); }, next: 'seen' },
    seen: { q: function (x) { return CT.seenQ(x.A); }, hints: ['نَعَمْ', 'لَا'],
      on: function (a) { return cWord(a, C_NO) ? ['رُبَّمَا قَرِيبًا فِي حَدِيقَةِ الحَيَوَانِ!', 'other'] : cWord(a, C_YES) || cHas(a, ['شفت', 'رايت', 'حديق']) ? ['مَا أَجْمَلَ ذَلِكَ!', 'other'] : null; },
      skip: C_LINES.ok, next: 'other' },
    other: { q: 'وَمَا حَيَوَانٌ آخَرُ تُحِبِّينَهُ؟', hints: ['أُحِبُّ الأَرْنَبَ', 'أُحِبُّ الحِصَانَ'],
      on: function (a) { var A = cFind(a, C_ANIMALS); return A ? [A.c, 'end'] : null; }, skip: C_LINES.ok, next: 'end' } } },
  { id: 'colors', icon: '🎨', t: 'الأَلْوَان', a: 'عَنِ الأَلْوَانِ', start: 'fav', nodes: {
    fav: { q: 'مَا لَوْنُكِ المُفَضَّلُ؟', hints: ['الأَحْمَرُ', 'الأَزْرَقُ'],
      on: function (a) { var c = cFind(a, C_COLORS); return c ? [CT.color(c), 'sky'] : null; }, skip: 'حَسَنًا! أَنَا أُحِبُّ اللَّوْنَ الأَخْضَرَ.', next: 'sky' },
    sky: cColorNode(0), banana: cColorNode(1), grass: cColorNode(2), milk: cColorNode(3) } },
  { id: 'food', icon: '🍎', t: 'الأَكْل', a: 'عَنِ الأَكْلِ', start: 'fav', nodes: {
    fav: { q: 'مَا أَكْلُكِ المُفَضَّلُ؟', hints: ['أُحِبُّ الأَرُزَّ', 'أُحِبُّ المَكَرُونَةَ'],
      on: function (a) { var f = cFind(a, C_FOODS), r = f ? null : cFind(a, C_FRUITS); return f ? [CT.food(f), 'fruit'] : r ? [CT.fruit(r), 'fruit'] : null; }, skip: C_LINES.ok, next: 'fruit' },
    fruit: { q: 'أَيُّ فَاكِهَةٍ تُحِبِّينَ؟', hints: ['أُحِبُّ التُّفَّاحَ', 'أُحِبُّ المَوْزَ'],
      on: function (a) { var f = cFind(a, C_FRUITS); return f ? [CT.fruit(f), 'drink'] : null; }, skip: 'الفَاكِهَةُ مُفِيدَةٌ لِلْجِسْمِ.', next: 'drink' },
    drink: { q: 'مَاذَا تَشْرَبِينَ فِي الصَّبَاحِ؟', hints: ['أَشْرَبُ الحَلِيبَ', 'أَشْرَبُ العَصِيرَ'],
      on: function (a) { var d = cFind(a, C_DRINKS); return d ? [d.r, 'today'] : null; }, skip: C_LINES.ok, next: 'today' },
    today: { q: 'مَاذَا أَكَلْتِ اليَوْمَ؟', hints: ['أَكَلْتُ خُبْزًا وَجُبْنًا'],
      on: function (a) { return cFind(a, C_FOODS) || cFind(a, C_FRUITS) ? ['بِالهَنَاءِ وَالشِّفَاءِ!', 'end'] : null; }, skip: C_LINES.ok, next: 'end' } } },
  { id: 'family', icon: '👨‍👩‍👧', t: 'عَائِلَتِي', a: 'عَنْ عَائِلَتِكِ', start: 'sib', nodes: {
    sib: { q: 'كَمْ أَخًا وَأُخْتًا عِنْدَكِ؟', hints: ['عِنْدِي أَخٌ وَاحِدٌ', 'لَيْسَ عِنْدِي إِخْوَةٌ'],
      on: function (a) {
        return cHas(a, ['مفيش', 'عنديش', 'وحيد', 'ليس']) || /^\s*(لا|ولا)(\s|$)/.test(a) ? ['لَا بَأْسَ! أَنَا صَدِيقُكِ.', 'cook']
          : cHas(a, ['واحد', 'اخ', 'اتنين', 'اثن', 'ثلاث', 'تلات', 'اربع', 'خمس']) ? ['مَا شَاءَ اللَّهُ! العَائِلَةُ جَمِيلَةٌ.', 'cook'] : null; },
      skip: C_LINES.ok, next: 'cook' },
    cook: { q: 'مَنْ يَطْبُخُ فِي بَيْتِكُمْ؟', hints: ['مَامَا تَطْبُخُ', 'بَابَا يَطْبُخُ'],
      on: function (a) { var r = cPair(a, C_COOK); return r ? [r, 'play'] : null; }, skip: C_LINES.ok, next: 'play' },
    play: { q: 'مَاذَا تَلْعَبِينَ مَعَ عَائِلَتِكِ؟', hints: ['نَلْعَبُ بِالكُرَةِ', 'نَرْسُمُ مَعًا'],
      on: function (a) { var r = cPair(a, C_PLAY); return r ? [r, 'story'] : null; }, skip: C_LINES.ok, next: 'story' },
    story: { q: 'مَنْ يَقْرَأُ لَكِ القِصَصَ؟', hints: ['مَامَا تَقْرَأُ لِي', 'أَنَا أَقْرَأُ وَحْدِي'],
      on: function (a) {
        return cHas(a, ['وحدي', 'لوحدي', 'بنفسي']) || cWord(a, ['انا']) ? ['مُمْتَاز! القِرَاءَةُ تَجْعَلُنَا أَذْكِيَاءَ!', 'end']
          : cPair(a, C_COOK) ? ['مَا أَجْمَلَ القِرَاءَةَ مَعَ العَائِلَةِ!', 'end'] : null; },
      skip: C_LINES.ok, next: 'end' } } },
  { id: 'day', icon: '☀️', t: 'يَوْمِي', a: 'عَنْ يَوْمِكِ', start: 'how', nodes: {
    how: { q: 'كَيْفَ حَالُكِ اليَوْمَ؟', hints: ['أَنَا بِخَيْرٍ، الحَمْدُ لِلَّهِ'],
      on: function (a) {
        return cHas(a, ['تعب', 'زعل', 'حزين', 'مريض', 'عيان', 'مش كويس', 'وحش', 'مش بخير']) ? ['سَلَامَتُكِ! أَتَمَنَّى أَنْ يَكُونَ يَوْمُكِ أَجْمَلَ.', 'did']
          : cHas(a, ['بخير', 'حمد', 'كويس', 'تمام', 'جيد', 'سعيد', 'مبسوط', 'زين']) ? ['الحَمْدُ لِلَّهِ! أَنَا سَعِيدٌ بِذَلِكَ.', 'did'] : null; },
      skip: C_LINES.ok, next: 'did' },
    did: { q: 'مَاذَا فَعَلْتِ اليَوْمَ؟', hints: ['ذَهَبْتُ إِلَى المَدْرَسَةِ', 'لَعِبْتُ فِي البَيْتِ'],
      on: function (a) { var r = cPair(a, C_DID); return r ? [r, 'toy'] : null; }, skip: C_LINES.ok, next: 'toy' },
    toy: { q: 'مَا لُعْبَتُكِ المُفَضَّلَةُ؟', hints: ['أُحِبُّ الدُّمْيَةَ', 'أُحِبُّ الكُرَةَ'],
      on: function (a) { var r = cPair(a, C_TOY); return r ? [r, 'sleep'] : null; }, skip: C_LINES.ok, next: 'sleep' },
    sleep: { q: 'مَتَى تَنَامِينَ؟', hints: ['أَنَامُ فِي اللَّيْلِ', 'أَنَامُ مُبَكِّرًا'],
      on: function (a) { return cHas(a, ['ليل', 'مسا', 'بدري', 'مبكر', 'ساع', 'ثامن', 'تاسع', 'سبع', 'ثمان', 'تسع', 'عشا']) ? ['النَّوْمُ المُبَكِّرُ يَجْعَلُنَا نَشِيطِينَ!', 'end'] : null; },
      skip: C_LINES.ok, next: 'end' } } }
];
var C = { topic: null, node: null, x: {}, retry: 0, turns: 0, history: [], hints: [], rec: null, listening: false, busy: false, last: '' };
function cVal(v) { return typeof v === 'function' ? v(C.x) : v; }

// every line Koko can say in the script (for the voice recordings)
function cAllLines() {
  var out = Object.keys(C_LINES).map(function (k) { return C_LINES[k]; });
  C_ANIMALS.forEach(function (A) { [A.c, CT.eatQ(A), CT.eatA(A), CT.eatH(A), CT.liveQ(A), CT.liveA(A), CT.liveH(A), CT.seenQ(A)].forEach(function (t) { out.push(t); }); });
  C_COLORS.forEach(function (c) { out.push(CT.color(c)); });
  C_FOODS.forEach(function (f) { out.push(CT.food(f)); });
  C_FRUITS.forEach(function (f) { out.push(CT.fruit(f)); });
  C_DRINKS.forEach(function (d) { out.push(d.r); });
  [C_COOK, C_PLAY, C_DID, C_TOY].forEach(function (list) { list.forEach(function (p) { out.push(p[1]); }); });
  C_COLOR_Q.forEach(function (d) { out.push(d[1], d[3]); });
  C_TOPICS.forEach(function (tp) {
    out.push('هَيَّا نَتَكَلَّمُ ' + tp.a + '!');
    Object.keys(tp.nodes).forEach(function (id) {
      var n = tp.nodes[id];
      [n.q, n.skip].forEach(function (v) { if (typeof v === 'string') out.push(v); });
      if (Array.isArray(n.hints)) n.hints.forEach(function (h) { out.push(h); });
    });
  });
  ['حَسَنًا! أَنَا أُحِبُّ القِطَّةَ.', 'رُبَّمَا قَرِيبًا فِي حَدِيقَةِ الحَيَوَانِ!', 'مَا أَجْمَلَ ذَلِكَ!', 'بِالهَنَاءِ وَالشِّفَاءِ!', 'لَا بَأْسَ! أَنَا صَدِيقُكِ.',
   'مَا شَاءَ اللَّهُ! العَائِلَةُ جَمِيلَةٌ.', 'مُمْتَاز! القِرَاءَةُ تَجْعَلُنَا أَذْكِيَاءَ!', 'مَا أَجْمَلَ القِرَاءَةَ مَعَ العَائِلَةِ!',
   'سَلَامَتُكِ! أَتَمَنَّى أَنْ يَكُونَ يَوْمُكِ أَجْمَلَ.', 'الحَمْدُ لِلَّهِ! أَنَا سَعِيدٌ بِذَلِكَ.', 'النَّوْمُ المُبَكِّرُ يَجْعَلُنَا نَشِيطِينَ!'].forEach(function (t) { out.push(t); });
  return out;
}

/* ----- speaking and showing ----- */
function cSpeak(t) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(gx(t).replace(/[\u{1F300}-\u{1FAFF}☀-➿️‍]/gu, '').split('{name}').join(S.name));
    u.lang = 'ar-SA'; u.rate = 0.8; u.pitch = 1.3; // a bright parrot voice (when the phone's voice is used)
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function cFill(t) { return gx(t).split('{name}').join(S.name); }
function cLog(who, text) {
  var row = mEl('div', 'cRow ' + (who === 'kid' ? 'cKid' : 'cKoko')), log = $('cLog');
  if (who === 'koko') row.appendChild(mEl('span', 'cAv', '🦜'));
  row.appendChild(mEl('div', 'cMsg', who === 'koko' ? cFill(text) : text));
  if (who === 'kid') row.appendChild(mEl('span', 'cAv', pCur().avatar));
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}
function cKoko(text, hints) {
  C.last = text; C.hints = hints || [];
  C.history.push({ who: 'koko', text: text });
  cLog('koko', text); cSpeak(text); cHints();
}
function cHints() {
  var box = $('cHints');
  box.textContent = '';
  if (!C.hints.length) return;
  box.appendChild(mEl('span', 'cHintT', gx('💡 يُمْكِنُكِ أَنْ تَقُولِي:')));
  C.hints.forEach(function (h) {
    var b = mEl('button', 'cHint', cFill(h));
    b.onclick = function () { cSpeak(h); }; // hear it, then say it
    box.appendChild(b);
  });
}
function cTopics() {
  var box = $('cTopics');
  box.textContent = '';
  C_TOPICS.forEach(function (tp) {
    var b = mEl('button', 'cTopic' + (C.topic === tp ? ' on' : ''), tp.icon + ' ' + tp.t);
    b.onclick = function () { cStart(tp); };
    box.appendChild(b);
  });
}
function cEnter() {
  cTopics();
  if (!C.topic && !$('cLog').children.length) { C.history = []; cKoko(C_LINES.hello, []); }
}
function cStart(tp) {
  cStop();
  C.topic = tp; C.node = tp.nodes[tp.start]; C.x = {}; C.retry = 0; C.turns = 0; C.history = [];
  $('cLog').textContent = '';
  cTopics();
  cKoko('هَيَّا نَتَكَلَّمُ ' + tp.a + '! ' + cVal(C.node.q), cVal(C.node.hints));
}
function cEnd(say) { // the conversation is over: a star
  C.topic = null; C.node = null; cTopics();
  S.stars++; trackStar('chat'); save(); renderHud(); soundStar(); confetti(30);
  var pill = $('starsPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  cKoko((say ? say + ' ' : '') + C_LINES.bye, []);
}

/* ----- the child talks ----- */
function cStop() {
  if (C.listening && C.rec) { try { C.rec.abort(); } catch (e) {} }
  C.listening = false; $('cMic').classList.remove('on'); $('cCard').classList.remove('listening');
}
function cListen() {
  if (C.busy) return;
  if (!C.topic) { cKoko(C_LINES.pick, []); return; }
  if (!SR) { $('cNote').textContent = 'التعرف على الصوت غير متاح في هذا المتصفح.'; return; }
  if (C.listening) { try { C.rec.stop(); } catch (e) {} return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  var rec = new SR(), got = false;
  rec.lang = 'ar-SA'; rec.interimResults = false; rec.maxAlternatives = 3; rec.continuous = false;
  C.rec = rec;
  rec.onstart = function () { C.listening = true; $('cMic').classList.add('on'); $('cCard').classList.add('listening'); $('cNote').textContent = ''; };
  rec.onresult = function (e) {
    got = true;
    var alts = [];
    for (var j = 0; j < e.results[0].length; j++) alts.push((e.results[0][j].transcript || '').trim());
    alts = alts.filter(Boolean);
    if (alts.length) cAnswer(alts[0], alts);
  };
  rec.onerror = function (e) {
    got = true;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') $('cNote').textContent = 'الميكروفون مقفول. اسمحوا بالميكروفون للعبة.';
    else if (e.error !== 'aborted') cKoko(C_LINES.again, C.hints);
  };
  rec.onend = function () { cStop(); if (!got) $('cNote').textContent = gx('اِضْغَطِي 🎤 وَتَكَلَّمِي'); };
  try { rec.start(); } catch (e) { cStop(); }
}
function cAnswer(text, alts) {
  cLog('kid', text);
  C.history.push({ who: 'kid', text: text });
  C.turns++;
  if (S.chatAI && aiBase()) cAI(alts || [text]); else cScript(alts || [text]);
}
// without AI: understand the answer (any of the recognizer's versions), reply to it, ask the next question
function cScript(alts) {
  var node = C.node, res = null;
  if (!node) { cKoko(C_LINES.pick, []); return; }
  for (var i = 0; i < alts.length && !res; i++) res = node.on(cNorm(alts[i]), C.x);
  if (!res && C.retry < 1) { // not understood: say so and ask the same question once more
    C.retry++; track('chat', null, false); soundTry();
    cKoko(C_LINES.what + ' ' + cVal(node.q), cVal(node.hints));
    return;
  }
  var say = res ? res[0] : cVal(node.skip), next = res ? res[1] : node.next;
  track('chat', null, !!res);
  if (res) soundGood();
  C.retry = 0;
  if (next === 'end' || !C.topic.nodes[next]) { cEnd(say); return; }
  C.node = C.topic.nodes[next];
  cKoko(say + ' ' + cVal(C.node.q), cVal(C.node.hints));
}
// with AI: Claude answers; if the server does not answer, the script goes on
function cAI(alts) {
  C.busy = true; $('cMic').disabled = true; $('cNote').textContent = '🦜 …';
  var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
  fetch(aiBase() + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
    body: JSON.stringify({ topic: C.topic.t, age: pCur().age, gender: pCur().gender === 'boy' ? 'boy' : 'girl', history: C.history.slice(-10) }) })
    .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
    .then(function (r) {
      if (!r || !r.reply) throw new Error('empty');
      clearTimeout(timer); C.busy = false; $('cMic').disabled = false; $('cNote').textContent = '';
      track('chat', null, true); soundGood();
      if (r.done) { C.topic = null; C.node = null; cTopics(); S.stars++; trackStar('chat'); save(); renderHud(); soundStar(); confetti(30); }
      cKoko(r.reply, r.done ? [] : (r.hints || []).slice(0, 2));
    })
    .catch(function () { clearTimeout(timer); C.busy = false; $('cMic').disabled = false; $('cNote').textContent = ''; cScript(alts); });
}
$('cMic').onclick = cListen;
$('cHear').onclick = function () { if (C.last) cSpeak(C.last); };
$('cNew').onclick = function () { cStop(); C.topic = null; C.node = null; C.history = []; $('cLog').textContent = ''; cTopics(); cKoko(C_LINES.pickNew, []); };
