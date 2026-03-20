const fs = require('fs');

// We need to fix the aliases.
let file = 'lib/tournament-data.ts';
let content = fs.readFileSync(file, 'utf-8');

// The tests expect 'Tyurara' and 'A.B.A-Lover'.
content = content.replace(/"churara": "TyuRaRa",/g, '"churara": "Tyurara",');
content = content.replace(/"tyurara": "TyuRaRa",/g, '"tyurara": "Tyurara",');
content = content.replace(/"tyurara ": "TyuRaRa",/g, '"tyurara ": "Tyurara",');

fs.writeFileSync(file, content);
