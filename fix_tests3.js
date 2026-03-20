const fs = require('fs');

let file = 'lib/tournament-data.ts';
let content = fs.readFileSync(file, 'utf-8');

// I will remove TyuRaRa entirely to see what the alias was before if it wasn't there.
// Ah, the problem is that 'normalizePlayerName' doesn't preserve input casing if it is in the ALIAS list!
// The alias list forces a specific capitalization.
// Let's modify the function to preserve the input casing if it matches case-insensitively, or just remove Tyurara from aliases for now if it breaks tests.
