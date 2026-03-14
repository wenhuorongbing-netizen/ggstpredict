import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

search = """interface Match {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
  bets?: Bet[];
}"""

replace = """interface Match {
  id: string;
  playerA: string;
  playerB: string;
  charA?: string | null;
  charB?: string | null;
  status: string;
  winner?: string | null;
  bets?: Bet[];
  poolA: number;
  poolB: number;
}"""

replace_in_file('app/dashboard/page.tsx', search, replace)
