const fs = require('fs');
let file = 'lib/tournament-data.ts';
let content = fs.readFileSync(file, 'utf-8');

// The tests fail because the implementation of `normalizePlayerName` title-cases things unexpectedly
// or because `PLAYER_ALIASES` overrides things.

// Let's modify the PLAYER_ALIASES in lib/tournament-data.ts
// Actually it says: 'Tyurara' vs 'TyuRaRa'.
// "A.b.a-lover" vs "A.B.A-Lover"
// The prompt says "Fix the implementation or the tests so that the baseline is entirely green."
