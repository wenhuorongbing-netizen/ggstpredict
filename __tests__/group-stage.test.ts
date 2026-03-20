import { evaluateGroupStatus } from "../lib/group-stage";

describe("evaluateGroupStatus", () => {
  it("should evaluate an empty group", () => {
    const status = evaluateGroupStatus("A", [], null);
    expect(status.isComplete).toBe(false);
    expect(status.playerCount).toBe(0);
    expect(status.scheduledMatchCount).toBe(0);
    expect(status.settledMatchCount).toBe(0);
  });

  it("should correctly identify a complete 4-player group", () => {
    const matches = [
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P2", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P3", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P4", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P2", playerB: "P3", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P2", playerB: "P4", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P3", playerB: "P4", status: "SETTLED" },
    ];

    const status = evaluateGroupStatus("A", matches, null);
    expect(status.isComplete).toBe(true);
    expect(status.playerCount).toBe(4);
    expect(status.scheduledMatchCount).toBe(6);
    expect(status.settledMatchCount).toBe(6);
  });

  it("should correctly identify an incomplete group", () => {
    const matches = [
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P2", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P3", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P1", playerB: "P4", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P2", playerB: "P3", status: "SETTLED" },
      { groupName: "A", stageType: "GROUP", playerA: "P2", playerB: "P4", status: "OPEN" },
      { groupName: "A", stageType: "GROUP", playerA: "P3", playerB: "P4", status: "SETTLED" },
    ];

    const status = evaluateGroupStatus("A", matches, null);
    expect(status.isComplete).toBe(false);
    expect(status.playerCount).toBe(4);
    expect(status.scheduledMatchCount).toBe(6);
    expect(status.settledMatchCount).toBe(5);
  });
});
