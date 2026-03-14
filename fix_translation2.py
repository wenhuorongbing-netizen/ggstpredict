import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix Dashboard text too
replace_in_file('app/dashboard/page.tsx', 'LIVE INTEL', '实时战报 (LIVE INTEL)')
replace_in_file('app/dashboard/page.tsx', 'No network activity. Be the first to deploy.', '暂无动态，成为第一个部署的人吧。')
replace_in_file('app/dashboard/page.tsx', 'MATCHES DETECTED', '赛事列表')
replace_in_file('app/dashboard/page.tsx', 'OPEN FOR BETTING', '可下注')
replace_in_file('app/dashboard/page.tsx', 'LOCKED/SETTLING', '已锁定/结算中')
replace_in_file('app/dashboard/page.tsx', 'No active matches found. Check back later.', '目前没有进行中的赛事，请稍后再来看看。')
replace_in_file('app/dashboard/page.tsx', 'No locked matches found.', '目前没有已锁定的赛事。')
replace_in_file('app/dashboard/page.tsx', 'WINNER', '胜者 (WINNER)')
replace_in_file('app/dashboard/page.tsx', 'CANCEL', '取消')
replace_in_file('app/dashboard/page.tsx', 'CONFIRM DEPLOYMENT', '确认下注')

# Verify admin page translation
replace_in_file('app/admin/page.tsx', 'NEW BATTLE DEPLOYMENT', '新建赛事 (DEPLOYMENT)')
replace_in_file('app/admin/page.tsx', 'Tournament URL', '赛事源地址')
replace_in_file('app/admin/page.tsx', 'BULK INSERT (RAW DATA)', '批量导入 (BULK INSERT)')
replace_in_file('app/admin/page.tsx', 'SYSTEM CONTROLS', '系统控制 (CONTROLS)')

# Make sure all app layout links are correctly translated as per prompt
replace_in_file('components/AppLayout.tsx', '⚙️ 账户武装', '⚙️ 账户设置')
replace_in_file('components/AppLayout.tsx', '📖 情报中心', '📖 用户手册')
replace_in_file('components/AppLayout.tsx', '👑 悬赏通缉', '👑 排行榜')
replace_in_file('components/AppLayout.tsx', '🏆 终极赛程', '🏆 比赛赛程')
replace_in_file('components/AppLayout.tsx', '🚨 统帅指挥', '🚨 管理员面板')
replace_in_file('components/AppLayout.tsx', 'ACTIVE FIGHTER:', '当前玩家:')
