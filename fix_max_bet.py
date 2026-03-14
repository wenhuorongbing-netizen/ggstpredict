import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Update API route
api_search = """  try {
    const { userId, matchId, choice, amount } = await request.json();

    if (!userId || !matchId || !choice || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }"""
api_replace = """  try {
    const { userId, matchId, choice, amount } = await request.json();

    if (!userId || !matchId || !choice || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    if (amount > 500) {
      return NextResponse.json(
        { error: "绝对防御机制：单场比赛最高下注额不可超过 500 积分 (Faultless Defense)" },
        { status: 400 }
      );
    }"""
replace_in_file('app/api/bets/route.ts', api_search, api_replace)

# Update Dashboard Input Max
dash_search = """                        type="number"
                        min="0"
                        value={betAmount[match.id] || ""}"""
dash_replace = """                        type="number"
                        min="0"
                        max="500"
                        value={betAmount[match.id] || ""}"""
replace_in_file('app/dashboard/page.tsx', dash_search, dash_replace)

# Update Dashboard logic to clamp bet locally
dash_onChange_search = """onChange={(e) => setBetAmount((prev) => ({ ...prev, [match.id]: parseInt(e.target.value) || 0 }))}"""
dash_onChange_replace = """onChange={(e) => {
                          let val = parseInt(e.target.value) || 0;
                          if (val > 500) val = 500;
                          setBetAmount((prev) => ({ ...prev, [match.id]: val }));
                        }}"""
replace_in_file('app/dashboard/page.tsx', dash_onChange_search, dash_onChange_replace)
