/* Plaque Hunter — content and tuning. Everything a designer would want to change lives here. */
(function () {
  const PH = (window.PH = window.PH || {});
  PH.VERSION = '0.2.0';

  // The CURAPROX palette, from the Curaprox Apps Design System (tokens.json). No other hue is used anywhere.
  PH.C = {
    blue: '#003DA5', blueDk: '#002E7D', blue80: '#3364B7', blue60: '#668BC9', blue40: '#99B1DB', blue20: '#CCD8ED',
    white: '#FFFFFF', bg: '#EDEDED', bg2: '#EAF0FA', grey: '#706F6F', soft: '#9D9D9C', rule: '#D8DFED',
    ink: '#0A1F44', ink2: '#132B57', // the system's dark surfaces: the world inside the mouth
    sky: '#8BB8E8', yellow: '#FCE300', orange: '#FF8200', orchid: '#F277C6', cerise: '#E31C79',
    gum: '#F9BBE3', gumLight: '#FCDDF1', // Orchid Pink tints (50% and 25% on white)
  };

  // CURAPROX wordmark, taken from templates/curaprox-applications-white.svg.
  PH.WORDMARK = { viewBox: '283 208 1037 160', d: "m1257.03 288.028-44.38 77.664h19.09l34.42-61.706 34.46 61.706h19.07l-44.37-77.664 40.64-72.428h-19.14l-30.66 56.515-30.61-56.515h-19.15zm-132.78-59.482c34.42 0 61.48 28.06 61.48 62.111 0 33.821-27.44 62.089-61.48 62.089s-61.5-28.279-61.5-62.089c0-34.04 27.09-62.111 61.5-62.111m0-15.519c-42.82 0-78.24 34.828-78.24 77.827 0 43.196 35.42 77.444 78.24 77.444 42.81 0 78.25-34.27 78.25-77.444 0-42.999-35.42-77.827-78.22-77.827m-164.824 86.775h4.14l45.374 65.912h20.54L981.733 298.4c23.097-1.982 37.587-18.301 37.587-41.4 0-33.832-26.47-41.378-54.957-41.378h-21.642V365.67h16.724v-65.868zm0-68.66h4.918c20.152 0 38.226 2.387 38.226 27.063 0 23.296-19.082 26.888-37.986 26.888h-5.158zm-107.092 0h6.166c19.506 0 39.22 1.807 39.22 26.285 0 21.489-15.717 27.064-34.248 27.064h-11.138zm0 68.868h12.146c12.551 0 25.464-1.599 35.584-9.933 9.408-7.777 14.359-20.12 14.359-32.266 0-13.351-5.816-26.472-16.944-34.248-10.952-7.557-24.281-7.941-37.238-7.941h-24.676V365.67h16.758v-65.714zm-81.837 7.579h-50.753l25.683-60.084zm6.572 15.531 17.721 42.594h18.52l-67.488-157.276-69.274 157.287h18.323l18.104-42.594h64.094zm-182.708-23.318h4.151l45.387 65.912h20.503L616.679 298.4c23.077-1.982 37.6-18.301 37.6-41.4 0-33.832-26.472-41.378-54.926-41.378h-21.708V365.67h16.735v-65.868zm0-68.66h4.973c20.097 0 38.223 2.387 38.223 27.063 0 23.296-19.112 26.888-38.026 26.888h-5.17zm-143.739-15.52h-16.724v93.95c0 17.118 1.599 30.853 14.742 43.382 10.153 9.978 24.675 15.333 38.793 15.333a55.22 55.22 0 0 0 40.371-17.107c11.938-12.343 13.142-25.3 13.142-41.619v-93.939h-16.691v89.361c0 11.752.613 24.873-7.36 34.434-6.955 8.379-18.718 13.329-29.462 13.329-10.952 0-23.69-5.159-30.239-14.337-6.966-9.539-6.572-22.266-6.572-33.426zm-44.587 12.168a72.4 72.4 0 0 0-44.795-14.742 78.49 78.49 0 0 0-78.222 78.189c0 42.616 35.825 77.04 78.222 77.04a77.1 77.1 0 0 0 44.795-14.731v-20.711c-11.949 11.938-28.476 19.9-45.376 19.9-33.634 0-60.906-29.057-60.906-62.089s27.074-62.111 60.479-62.111a64.25 64.25 0 0 1 45.77 19.89z" };

  PH.QUADS = ['Top right', 'Top left', 'Bottom left', 'Bottom right'];
  PH.SURFACES = ['Outside', 'Inside', 'Chewing'];

  // The field guide. `where` is shown before a Plaqling is found, `line` after.
  PH.SPECIES = [
    { id: 'filmo', name: 'Filmo', color: '#FCE300', rarity: 'Common', where: 'Anywhere there is fresh film', line: 'First to arrive, last to leave. Naps wherever it lands.' },
    { id: 'gumlin', name: 'Gumlin', color: '#F277C6', rarity: 'Common', where: 'Along the gumline', line: 'Hugs the edge where pearl meets shore. Easy to miss, happy to stay.' },
    { id: 'stickler', name: 'Stickler', color: '#FF8200', rarity: 'Common', where: 'In older, orange film', line: 'Has been here since yesterday and likes it that way. Give it a little longer.' },
    { id: 'speckle', name: 'Speckles', color: '#CCD8ED', rarity: 'Common', where: 'Chewing surfaces', line: 'Never travel alone. Find one and two more are close.' },
    { id: 'mole', name: 'Molar Mole', color: '#668BC9', rarity: 'Uncommon', where: 'The back teeth', line: 'Settles at the very back, where it expects nobody to look.' },
    { id: 'imp', name: 'Sugar Imp', color: '#E31C79', rarity: 'Uncommon', where: 'After sugar rain', line: 'Arrives with the sweets and runs laps, leaving film behind it.' },
    { id: 'yawnster', name: 'Yawnster', color: '#8BB8E8', rarity: 'Uncommon', where: 'Morning tide only', line: 'Moved in overnight. Still half asleep when the morning tide comes.' },
    { id: 'nightcap', name: 'Nightcap', color: '#3364B7', rarity: 'Uncommon', where: 'Evening tide only', line: 'Turns up at bedtime hoping everyone is too tired to hunt.' },
    { id: 'gapper', name: 'Gapper', color: '#99B1DB', rarity: 'Uncommon', where: 'Between two teeth', line: 'Lives where the 5,460 cannot reach. Only a Prime gets through.' },
    { id: 'wirewalker', name: 'Wire Walker', color: '#8BB8E8', rarity: 'Uncommon', where: 'On braces', line: 'Treats a bracket like a balcony. Hold still and the swarm focuses it out.' },
    { id: 'troll', name: 'Bridge Troll', color: '#668BC9', rarity: 'Rare', where: 'Under a bridge', line: 'Lives under the bridge and charges no toll. A Prime slid underneath moves it on.' },
    { id: 'lurker', name: 'Pit Lurker', color: '#003DA5', rarity: 'Special', where: 'In a hole, after a check-up', line: 'Sits in a hole and feeds the film around it. It only leaves when the hole is fixed.' },
    { id: 'glimmer', name: 'Glimmer', color: '#FFFFFF', rarity: 'Rare', where: 'On a 3-day streak', line: 'Only shows itself to hunters who keep coming back.' },
    { id: 'goldie', name: 'Goldie', color: '#FCE300', rarity: 'Rare', where: 'On a 7-day streak', line: 'A whole week of tides. Goldie is impressed, and caught.' },
    { id: 'tot', name: 'Tartar Tot', color: '#EDEDED', rarity: 'Special', where: 'Stays put until a check-up', line: 'Hardened and going nowhere. The 5,460 cannot move it. Your dental pro can.' },
  ];
  PH.SPECIES_BY_ID = Object.fromEntries(PH.SPECIES.map((s) => [s.id, s]));

  PH.RANKS = [
    { name: 'Rookie', at: 0 }, { name: 'Scout', at: 1200 }, { name: 'Tracker', at: 4000 },
    { name: 'Ranger', at: 10000 }, { name: 'Guardian', at: 22000 }, { name: 'Legend', at: 45000 },
  ];

  // Swarm colourways, palette only. `rank` is the rank index that unlocks it.
  PH.SKINS = [
    { id: 'blue', name: 'Blue', colors: ['#003DA5', '#3364B7', '#668BC9'], handle: '#003DA5', rank: 0 },
    { id: 'cerise', name: 'Cerise', colors: ['#E31C79', '#F277C6', '#E31C79'], handle: '#E31C79', rank: 1 },
    { id: 'sky', name: 'Sky', colors: ['#8BB8E8', '#3364B7', '#003DA5'], handle: '#8BB8E8', rank: 2 },
    { id: 'tangerine', name: 'Tangerine', colors: ['#FF8200', '#FF8200', '#E31C79'], handle: '#FF8200', rank: 3 },
    { id: 'orchid', name: 'Orchid', colors: ['#F277C6', '#E31C79', '#003DA5'], handle: '#F277C6', rank: 4 },
    { id: 'ink', name: 'Ink', colors: ['#0A1F44', '#003DA5', '#8BB8E8'], handle: '#0A1F44', rank: 5 },
  ];

  PH.BADGES = [
    { id: 'first', name: 'First tide', how: 'Finish your first hunt' },
    { id: 'both', name: 'Both tides', how: 'Hunt morning and evening on the same day' },
    { id: 'soft', name: 'Soft touch', how: 'Keep the swarm together 90% of a hunt' },
    { id: 'gleam', name: 'Full gleam', how: 'Finish a hunt 98% clean' },
    { id: 'prime', name: 'Gap minder', how: 'Clear three quarters of the gaps in a tide hunt' },
    { id: 'prime7', name: 'Gap keeper', how: 'Do that on 7 different days' },
    { id: 'call3', name: 'House calls', how: 'Earn a star in 3 house calls' },
    { id: 'callAll', name: 'On call', how: 'Three stars in every house call' },
    { id: 'kit5', name: 'Fully kitted', how: 'Take one piece of kit to level 5' },
    { id: 's3', name: '3-day streak', how: 'Hunt 3 days in a row' },
    { id: 's7', name: 'One full week', how: 'Hunt 7 days in a row' },
    { id: 's14', name: 'Fortnight', how: 'Hunt 14 days in a row' },
    { id: 's30', name: 'Thirty tides strong', how: 'Hunt 30 days in a row' },
    { id: 'early', name: 'Early riser', how: 'Hunt before 7 in the morning' },
    { id: 'owl', name: 'Night owl', how: 'Hunt after 10 in the evening' },
    { id: 'guide6', name: 'Field notes', how: 'Find 6 kinds of Plaqling' },
    { id: 'guideAll', name: 'Complete guide', how: 'Find every Plaqling' },
    { id: 'fresh', name: 'Fresh 5460', how: 'Swap in a new brush' },
  ];

  // Shown on the results screen. Habit wording only, no clinical claims: check with Curaden before any public use.
  PH.TIPS = [
    'Two minutes, twice a day. The tide keeps the same hours you do.',
    'Slow and soft keeps the 5,460 together. Your real brush likes the same.',
    'Small circles reach more than long scrubs.',
    'Outside, inside, chewing. Same order every time, so nothing gets skipped.',
    'The back pearls are the easiest to forget. Molar Moles count on it.',
    'Gappers only move for a Prime. In and out, gently, once a day.',
    'Hold still on a tricky spot and the swarm tightens to a single tuft.',
    'A brush gets tired after about three months. So does a swarm.',
  ];

  // Kit you carry, as cards. A hand of three is dealt at every pass; playing one costs a charge.
  // Charges come back at each pass and with every third catch. Win a hunt with two stars to add a card to the deck.
  PH.CARDS = [
    { id: 'rinse', name: 'Rinse blast', product: 'Mouthwash', icon: 'drops', text: 'Tap a spot. The splash loosens sticky film and dazes Plaqlings.' },
    { id: 'pulse', name: 'Sonic pulse', product: 'Hydrosonic', icon: 'waves', text: 'A pulse rolls across the whole side and loosens sticky film.' },
    { id: 'foam', name: 'Foam up', product: 'Toothpaste', icon: 'sparkles', text: 'For 6 seconds the swarm lifts film twice as fast.' },
    { id: 'single', name: 'Single tuft', product: 'CS single', icon: 'cross', text: 'For 6 seconds the swarm stays focused while it moves.' },
    { id: 'primes', name: 'Prime pack', product: 'CPS prime', icon: 'sides', text: 'For 8 seconds a gap clears in one gentle stroke.' },
    { id: 'soft', name: 'Soft guard', product: 'CS 5460', icon: 'feather', text: 'For 8 seconds the swarm cannot scatter and sore gums stay calm.' },
  ];
  PH.CARDS_BY_ID = Object.fromEntries(PH.CARDS.map((c) => [c.id, c]));
  PH.START_DECK = ['rinse', 'rinse', 'pulse', 'foam', 'single'];
  PH.DECK_MAX = 12;

  // Standing upgrades, bought with shine. Levels 0 to 5.
  PH.KIT = [
    { id: 'fil', name: 'CS 5460 filaments', what: 'More of the swarm lifting film at once.' },
    { id: 'soft', name: 'Soft touch', what: 'The swarm holds together at higher speed.' },
    { id: 'glide', name: 'CPS prime glide', what: 'A Prime clears a gap in fewer strokes.' },
    { id: 'focus', name: 'CS single focus', what: 'Hold still and the swarm tightens to a single tuft sooner.' },
  ];
  PH.KIT_MAX = 5;
  PH.kitCost = (lvl) => 250 * (lvl + 1) * (lvl + 1);
  PH.MASTERY = [{ id: 'brush', name: 'Brushing' }, { id: 'idb', name: 'Interdental' }, { id: 'tools', name: 'Kit work' }];

  // House calls: other mouths, each with its own trouble, laid out as a route. A call opens once any call it leads `from` has a star.
  // feats are per quadrant (0 top right, 1 top left, 2 bottom left, 3 bottom right); 'all' applies to every side.
  PH.MISSIONS = [
    { id: 'rounds', name: 'First rounds', who: 'A quiet mouth', blurb: 'Plain teeth and fresh film. Learn the swarm, the gaps and the focus.', zones: [0, 3], feats: {}, row: 0, from: [] },
    { id: 'sam', name: 'Sweet tooth', who: 'Sam', blurb: 'Sugar rain on every side, and Sugar Imps running laps.', zones: [1, 2], feats: { all: ['sugar'] }, row: 1, from: ['rounds'] },
    { id: 'mila', name: 'Braces', who: 'Mila', blurb: 'Film hides round every bracket. Hold still there and the swarm focuses.', zones: [0, 1], feats: { 0: ['braces'], 1: ['braces'] }, row: 1, from: ['rounds'] },
    { id: 'noor', name: 'Sore gums', who: 'Noor', blurb: 'A tender gumline. Go slowly there, or it flinches.', zones: [3, 2], feats: { 3: ['sore', 'sore'], 2: ['sore', 'sore'] }, row: 2, from: ['sam', 'mila'] },
    { id: 'otto', name: 'The bridge', who: 'Otto', blurb: 'A bridge and a crown. Something lives under the bridge.', zones: [0, 3], feats: { 0: ['bridge'], 3: ['crown', 'bridge'] }, row: 2, from: ['sam', 'mila'] },
    { id: 'jo', name: 'The hole', who: 'Jo', blurb: 'A hole keeps feeding film. Clean round it. Fixing it is a check-up job.', zones: [2, 3], feats: { 2: ['hole'], 3: ['hole', 'sore'] }, row: 3, from: ['noor', 'otto'] },
    { id: 'ravi', name: 'Wisdom', who: 'Ravi', blurb: 'Half-hidden back teeth. Only a focused swarm gets in.', zones: [1, 2], feats: { 1: ['wisdom'], 2: ['wisdom', 'crown'] }, row: 3, from: ['noor', 'otto'] },
    { id: 'house', name: 'Full house', who: 'Everything at once', blurb: 'Braces, a bridge, a hole and sore gums, on all four sides.', zones: [0, 1, 2, 3], feats: { 0: ['braces'], 1: ['bridge', 'sore'], 2: ['hole', 'wisdom'], 3: ['crown', 'sore'] }, row: 4, from: ['jo', 'ravi'] },
  ];

  PH.TUNE = {
    zoneSecs: 30, shortZoneSecs: 12, swarm: 420,
    vGentle: 24, vFast: 60,          // leader speed (world units/s) where the swarm starts and finishes scattering
    autoAfter: 1.6,                  // seconds without touch before Fila leads
    autoPower: 0.6, autoPowerEasy: 0.95,
    brushLifeDays: 90,
  };
})();
