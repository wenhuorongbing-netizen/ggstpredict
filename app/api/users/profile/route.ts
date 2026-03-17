import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFatalCounterBonus, isFatalCounterExactHit } from "@/lib/bet-effects";
import { getShopItem, parsePurchaseDetails } from "@/lib/shop-catalog";

type Choice = "A" | "B";

function getBetPoolTotals(match: {
  bets: Array<{ amount: number; choice: string }>;
  poolInjectA: number;
  poolInjectB: number;
}) {
  const userPoolA = match.bets
    .filter((entry) => entry.choice === "A")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const userPoolB = match.bets
    .filter((entry) => entry.choice === "B")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    userPoolA,
    userPoolB,
    poolA: userPoolA + (match.poolInjectA || 0),
    poolB: userPoolB + (match.poolInjectB || 0),
  };
}

function getPurchaseSummary(itemId: string, details: Record<string, string | number | boolean | null> | null) {
  switch (itemId) {
    case "fd_shield":
      return "购入 FD 护盾 x1";
    case "fatal_counter":
      return "购入 致命打康 x1";
    case "robbie_hex":
      return `对 ${String(details?.targetPlayer ?? "未知选手")} 贴上罗比印记`;
    case "salt_megaphone":
      return `发送扩音器：${String(details?.message ?? "")}`;
    default:
      return "完成一笔黑市交易";
  }
}

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const now = new Date();
    const [user, robbieHexCount, activeMegaphones] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          bets: {
            include: {
              match: {
                include: {
                  bets: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          purchases: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      }),
      prisma.robbieHex.count({ where: { createdById: userId } }),
      prisma.megaphoneMessage.count({
        where: {
          userId,
          expiresAt: { gt: now },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const purchases = user.purchases.map((purchase) => {
      const item = getShopItem(purchase.item);
      const details = parsePurchaseDetails(purchase.details);

      return {
        id: purchase.id,
        item: purchase.item,
        itemName: item?.name ?? purchase.item,
        shortName: item?.shortName ?? purchase.item,
        icon: item?.icon ?? "🛒",
        accent: item?.accent ?? "gold",
        cost: purchase.cost,
        status: purchase.status,
        details,
        summary: getPurchaseSummary(purchase.item, details),
        usageHint: item?.usageHint ?? null,
        visibilityHint: item?.visibilityHint ?? null,
        createdAt: purchase.createdAt,
      };
    });

    const bets = user.bets.map((bet) => {
      const { userPoolA, userPoolB, poolA, poolB } = getBetPoolTotals({
        bets: bet.match.bets,
        poolInjectA: bet.match.poolInjectA,
        poolInjectB: bet.match.poolInjectB,
      });

      const isWinner = bet.match.status === "SETTLED" && bet.match.winner === bet.choice;
      const isLoser = bet.match.status === "SETTLED" && Boolean(bet.match.winner) && bet.match.winner !== bet.choice;
      let profit = 0;

      if (isWinner) {
        const winningPool = bet.match.winner === "A" ? poolA : poolB;
        let losingPool = bet.match.winner === "A" ? poolB : poolA;

        if (losingPool > 0 && winningPool > 0 && losingPool >= winningPool * 9) {
          losingPool += 2000;
        }

        const userWinningPool = bet.match.winner === "A" ? userPoolA : userPoolB;
        const share = userWinningPool > 0 ? bet.amount / userWinningPool : 0;
        const baseProfit = share * losingPool;
        const fatalBonus = getFatalCounterBonus({
          choice: bet.choice as Choice,
          usedFatalCounter: bet.usedFatalCounter,
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
          winner: bet.match.winner as Choice,
          scoreA: bet.match.scoreA,
          scoreB: bet.match.scoreB,
          profit: baseProfit,
        });
        profit = Math.floor(baseProfit + fatalBonus);
      }

      const choiceName = bet.choice === "A" ? bet.match.playerA : bet.match.playerB;
      const usedItems = [
        bet.usedFdShield ? "FD 护盾" : null,
        bet.usedFatalCounter ? `致命打康 ${bet.predictedScoreA ?? "?"}-${bet.predictedScoreB ?? "?"}` : null,
      ].filter(Boolean);

      return {
        id: bet.id,
        amount: bet.amount,
        betOn: bet.choice,
        betOnName: choiceName,
        createdAt: bet.createdAt,
        usedFdShield: bet.usedFdShield,
        usedFatalCounter: bet.usedFatalCounter,
        predictedScoreA: bet.predictedScoreA,
        predictedScoreB: bet.predictedScoreB,
        usedItems,
        fatalHit: isFatalCounterExactHit({
          choice: bet.choice as Choice,
          usedFatalCounter: bet.usedFatalCounter,
          predictedScoreA: bet.predictedScoreA,
          predictedScoreB: bet.predictedScoreB,
          winner: (bet.match.winner as Choice) ?? "A",
          scoreA: bet.match.scoreA,
          scoreB: bet.match.scoreB,
          profit: 0,
        }),
        fdSavedStreak: isLoser && bet.usedFdShield,
        profit,
        resultLabel:
          bet.match.status === "OPEN" || bet.match.status === "LOCKED"
            ? "待结算"
            : bet.match.status === "CANCELED"
              ? "已撤销"
              : isWinner
                ? `命中 +${profit.toLocaleString()} W$`
                : `失利 -${bet.amount.toLocaleString()} W$`,
        match: {
          id: bet.match.id,
          playerA: bet.match.playerA,
          playerB: bet.match.playerB,
          charA: bet.match.charA,
          charB: bet.match.charB,
          status: bet.match.status,
          winner: bet.match.winner,
          scoreA: bet.match.scoreA,
          scoreB: bet.match.scoreB,
          poolA,
          poolB,
        },
      };
    });

    const history = [
      ...purchases.map((purchase) => ({
        id: `purchase-${purchase.id}`,
        kind: "purchase" as const,
        createdAt: purchase.createdAt,
        title: purchase.itemName,
        summary: purchase.summary,
        amountLabel: `-${purchase.cost.toLocaleString()} W$`,
        accent: purchase.accent,
        icon: purchase.icon,
        details: purchase.details,
      })),
      ...bets.map((bet) => ({
        id: `bet-${bet.id}`,
        kind: "bet" as const,
        createdAt: bet.createdAt,
        title: `${bet.match.playerA} vs ${bet.match.playerB}`,
        summary: `押注 ${bet.betOnName} · ${bet.amount.toLocaleString()} W$`,
        amountLabel: bet.resultLabel,
        accent: bet.betOn === "A" ? "red" : "blue",
        icon: bet.usedFatalCounter ? "⚡" : bet.usedFdShield ? "🛡️" : "🎫",
        details: {
          usedItems: bet.usedItems,
          fdSavedStreak: bet.fdSavedStreak,
          fatalHit: bet.fatalHit,
        },
      })),
    ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    const safeUser = {
      id: user.id,
      displayName: user.displayName,
      nameColor: user.nameColor,
      points: user.points,
      winStreak: user.winStreak,
      fdShields: user.fdShields,
      fatalCounters: user.fatalCounters,
      robbieHexes: robbieHexCount,
      activeMegaphones,
      purchases,
      bets,
      history,
    };

    return NextResponse.json({ user: safeUser }, { status: 200 });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "读取个人资料失败" }, { status: 500 });
  }
}
