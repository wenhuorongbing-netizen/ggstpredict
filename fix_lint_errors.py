import re

def fix_unknown(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    # Replace `const error = err as any;` with `// eslint-disable-next-line @typescript-eslint/no-explicit-any \n const error = err as any;`
    # or just `const error: any = err;` properly ignored.
    content = content.replace('const error = err as any;', '// eslint-disable-next-line @typescript-eslint/no-explicit-any\n    const error = err as any;')
    with open(filepath, 'w') as f:
        f.write(content)

fix_unknown('app/api/bets/route.ts')
fix_unknown('app/api/matches/[id]/route.ts')
fix_unknown('app/api/matches/bulk/route.ts')
fix_unknown('app/api/matches/crawl/route.ts')
fix_unknown('app/api/matches/settle/route.ts')
fix_unknown('app/api/users/welfare/route.ts')
