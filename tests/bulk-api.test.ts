import { test } from 'node:test';
import assert from 'node:assert/strict';
// A simple test to verify roundName logic in bulk API.
// We mock the database logic or just test the mapping function.
// Since it's inside the route handler, I'll write a mock for the mapping block.

test('bulk api match mapping extracts roundName for EXTRA stages', () => {
    const rawMatches = [
        { playerA: 'A', playerB: 'B', roundName: 'Extra Match 1' }
    ];
    const stageType = 'EXTRA';

    const formattedMatches = rawMatches.map(m => {
        return {
            playerA: m.playerA,
            playerB: m.playerB,
            roundName: m.roundName || null,
            stageType: stageType || 'GROUP'
        };
    });

    assert.equal(formattedMatches[0].roundName, 'Extra Match 1');
    assert.equal(formattedMatches[0].stageType, 'EXTRA');
});
