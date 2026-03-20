import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFinalsDisplay } from '../lib/finals-display';
import { Match } from '@prisma/client';

test('generateFinalsDisplay generates placeholder structure when no bracket matches exist', () => {
    const groupStandings = [
        { groupName: 'A', status: { isConfirmed: false }, standings: [] },
        { groupName: 'B', status: { isConfirmed: false }, standings: [] },
        { groupName: 'C', status: { isConfirmed: false }, standings: [] },
        { groupName: 'D', status: { isConfirmed: false }, standings: [] }
    ];
    const matches: Match[] = [];

    const display = generateFinalsDisplay(matches, groupStandings);

    assert.equal(display.extraMatches.length, 2);
    assert.equal(display.extraMatches[0].playerA, 'Runner-up Group A');
    assert.equal(display.knockoutLayout.winnersMatches.length, 7); // 4 WQF, 2 WSF, 1 WF
    assert.equal(display.knockoutLayout.winnersMatches[0].playerA, 'Winner of Group A');
});

test('generateFinalsDisplay uses confirmed group names', () => {
    const groupStandings = [
        { groupName: 'A', status: { isConfirmed: true }, standings: [{playerName: 'P1'}, {playerName: 'P2'}] }
    ];
    const matches: Match[] = [];

    const display = generateFinalsDisplay(matches, groupStandings);

    assert.equal(display.extraMatches[0].playerA, 'P2');
    assert.equal(display.knockoutLayout.winnersMatches[0].playerA, 'P1');
});

test('generateFinalsDisplay uses real bracket if it exists', () => {
    const groupStandings: any[] = [];
    const matches: Match[] = [{
        id: 'REAL_MATCH',
        stageType: 'BRACKET',
        roundName: 'Winners Quarter-Final 1',
        playerA: 'RealPlayerA',
        playerB: 'RealPlayerB'
    } as Match];

    const display = generateFinalsDisplay(matches, groupStandings);

    assert.equal(display.knockoutLayout.winnersMatches[0].playerA, 'RealPlayerA');
    // Ensure placeholder nodes aren't added alongside real match
    assert.equal(display.knockoutLayout.winnersMatches.length, 1);
});
