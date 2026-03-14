import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update Navigation Links in components/AppLayout.tsx
replace_in_file('components/AppLayout.tsx', '{ name: "⚙️ 账户武装", href: "/settings" }', '{ name: "⚙️ 账户设置", href: "/settings" }')
replace_in_file('components/AppLayout.tsx', '{ name: "📖 情报中心", href: "/docs" }', '{ name: "📖 用户手册", href: "/docs" }')
replace_in_file('components/AppLayout.tsx', '{ name: "👑 悬赏通缉", href: "/leaderboard" }', '{ name: "👑 排行榜", href: "/leaderboard" }')
replace_in_file('components/AppLayout.tsx', '{ name: "🏆 终极赛程", href: "/bracket" }', '{ name: "🏆 比赛赛程", href: "/bracket" }')
replace_in_file('components/AppLayout.tsx', '{ name: "🚨 统帅指挥", href: "/admin" }', '{ name: "🚨 管理员面板", href: "/admin" }')
replace_in_file('components/AppLayout.tsx', 'ACTIVE FIGHTER:', '当前玩家 (ACTIVE FIGHTER):')

# 2. Update app/settings/page.tsx
replace_in_file('app/settings/page.tsx', 'Player Profile Configuration', '玩家档案配置')
replace_in_file('app/settings/page.tsx', 'SYSTEM ERROR:', '系统错误 (ERROR):')
replace_in_file('app/settings/page.tsx', 'FIGHTER DOSSIER', '玩家档案 (DOSSIER)')
replace_in_file('app/settings/page.tsx', 'R-CODE (DISPLAY NAME)', '玩家昵称 (R-CODE)')
replace_in_file('app/settings/page.tsx', 'SAVE R-CODE', '保存昵称')
replace_in_file('app/settings/page.tsx', 'UPDATING...', '正在更新...')
replace_in_file('app/settings/page.tsx', 'SYSTEM TERMINAL', '系统终端 (TERMINAL)')
replace_in_file('app/settings/page.tsx', 'WARNING: Terminating your connection will remove active session keys. You will need your R-Code and password to re-enter the network.', '警告：终止连接将清除当前会话，您需要重新登录才能继续。')
replace_in_file('app/settings/page.tsx', 'TERMINATE CONNECTION (LOGOUT)', '退出登录 (LOGOUT)')

# 3. Update app/leaderboard/page.tsx
replace_in_file('app/leaderboard/page.tsx', 'BOUNTY BOARD', '悬赏排行榜')
replace_in_file('app/leaderboard/page.tsx', 'Global Rankings', '全球排名')
replace_in_file('app/leaderboard/page.tsx', 'WANTED FIGHTERS', '通缉名单 (WANTED)')
replace_in_file('app/leaderboard/page.tsx', 'LOCATING TARGETS...', '正在定位目标 (LOCATING)...')
replace_in_file('app/leaderboard/page.tsx', '[ NO DATA FOUND ]', '[ 未找到数据 ]')
replace_in_file('app/leaderboard/page.tsx', 'W$ BOUNTY', 'W$ 悬赏金')
