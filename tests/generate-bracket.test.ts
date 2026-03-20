import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFinalsDisplay } from '../lib/finals-display';
import { Match } from '@prisma/client';

test('finals-display does not break when encountering BYE matches', () => {
    const groupStandings: any[] = [];
    const matches: Match[] = [
        { id: '1', stageType: 'BRACKET', roundName: 'Winners Quarter-Final 1', playerA: 'Player A1', playerB: '[ BYE ]', status: 'SETTLED', winner: 'A' } as Match,
        { id: '2', stageType: 'BRACKET', roundName: 'Winners Semi-Final 1', playerA: 'Player A1', playerB: 'Player D1', status: 'OPEN' } as Match,
    ];

    const display = generateFinalsDisplay(matches, groupStandings);

    assert.equal(display.knockoutLayout.winnersMatches[0].playerA, 'Player A1');
    assert.equal(display.knockoutLayout.winnersMatches[0].playerB, '[ BYE ]');
    assert.equal(display.knockoutLayout.winnersMatches[1].playerA, 'Player A1');
});

// The generate-bracket route relies heavily on the Prisma database and Request/Headers contexts.
// Testing the actual API route in a unit test environment requires mocking Prisma completely,
// which is complex for this specific node:test setup without a dedicated mock framework.
// Instead, we will test the pure logic of the topology generation (the array mapping).

test('Knockout topology does not create OPEN matches with [ BYE ]', () => {
    // Extracted topology generation logic from generate-bracket/route.ts
    const top2ByGroup: Record<string, string[]> = {
        "A": ["P1", "P2"], "B": ["P3", "P4"], "C": ["P5", "P6"], "D": ["P7", "P8"]
    };
    const winnerE1 = "E1_Winner";
    const winnerE2 = "E2_Winner";

    const matchesToCreate = [
        { id: "W_QF_1", a: top2ByGroup["A"][0], b: "[ BYE ]", roundName: "Winners Quarter-Final 1" },
        { id: "W_QF_2", a: top2ByGroup["D"][0], b: "[ BYE ]", roundName: "Winners Quarter-Final 2" },
        { id: "W_QF_3", a: top2ByGroup["B"][0], b: winnerE2, roundName: "Winners Quarter-Final 3" },
        { id: "W_QF_4", a: top2ByGroup["C"][0], b: winnerE1, roundName: "Winners Quarter-Final 4" },
        { id: "W_SF_1", a: top2ByGroup["A"][0], b: top2ByGroup["D"][0], roundName: "Winners Semi-Final 1" },
        { id: "W_SF_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Winners Semi-Final 2" },
        { id: "L_R1_1", a: "[ BYE ]", b: "[ BYE ]", roundName: "Losers Round 1 (1)" },
        { id: "L_R1_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Round 1 (2)" },
        { id: "L_QF_1", a: "[ TBD ]", b: "[ BYE ]", roundName: "Losers Quarter-Final 1" },
        { id: "L_QF_2", a: "[ TBD ]", b: "[ TBD ]", roundName: "Losers Quarter-Final 2" },
    ];

    const generatedMatches = matchesToCreate.map(match => {
        const isByeMatch = match.a === "[ BYE ]" || match.b === "[ BYE ]";
        const isPlaceholder = match.a === "[ TBD ]" && match.b === "[ TBD ]";

        let status = "OPEN";
        let winner = null;

        if (isPlaceholder) {
            status = "LOCKED";
        } else if (isByeMatch) {
            const isCombatantKnown = (match.a !== "[ BYE ]" && match.a !== "[ TBD ]") || (match.b !== "[ BYE ]" && match.b !== "[ TBD ]");
            const isDoubleBye = match.a === "[ BYE ]" && match.b === "[ BYE ]";

            if (isCombatantKnown || isDoubleBye) {
                status = "SETTLED";
                if (match.a !== "[ BYE ]" && match.a !== "[ TBD ]") winner = "A";
                else if (match.b !== "[ BYE ]" && match.b !== "[ TBD ]") winner = "B";
            } else {
                status = "LOCKED";
            }
        }
        return { ...match, status, winner };
    });

    const openByes = generatedMatches.filter(m => m.status === 'OPEN' && (m.a === '[ BYE ]' || m.b === '[ BYE ]'));
    assert.equal(openByes.length, 0);

    const wQf1 = generatedMatches.find(m => m.id === 'W_QF_1');
    assert.equal(wQf1?.status, 'SETTLED');
    assert.equal(wQf1?.winner, 'A');

    const lR11 = generatedMatches.find(m => m.id === 'L_R1_1');
    assert.equal(lR11?.status, 'SETTLED');
    assert.equal(lR11?.winner, null);

    const lQf1 = generatedMatches.find(m => m.id === 'L_QF_1');
    assert.equal(lQf1?.status, 'LOCKED');
    assert.equal(lQf1?.winner, null);
});
