export const ECONOMY_BASELINE = 1000;
export const MEGAPHONE_DURATION_MINUTES = 120;

export type ShopItemId =
  | "fd_shield"
  | "fatal_counter"
  | "robbie_hex"
  | "salt_megaphone";

export interface ShopItemDefinition {
  id: ShopItemId;
  name: string;
  shortName: string;
  cost: number;
  icon: string;
  description: string;
  flavor: string;
  holdLabel: string;
  accent: "red" | "gold" | "blue" | "violet";
  requiresTarget?: boolean;
  requiresMessage?: boolean;
  usageHint?: string;
  visibilityHint?: string;
}

export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    id: "fd_shield",
    name: "FD 完美防御",
    shortName: "FD 护盾",
    cost: 100,
    icon: "🛡️",
    description: "下注时可消耗 1 层护盾。押错后本金照扣，但连胜不会清零。",
    flavor: "穷人的连胜险，专门保护那条快要开始滚雪球的连胜。",
    holdLabel: "当前护盾",
    accent: "gold",
    usageHint: "在下注确认弹窗中勾选使用。失败后只保住连胜，不返还本金。",
    visibilityHint: "下注动态和个人资料都会显示你这次用了 FD 护盾。",
  },
  {
    id: "fatal_counter",
    name: "致命打康",
    shortName: "打康标记",
    cost: 300,
    icon: "⚡",
    description: "下注时可启用并填写预测比分。猜中胜负且比分完全一致时，纯利润额外 +50%。",
    flavor: "不是只押输赢，而是逼你把整场比赛的节奏也一起押进去。",
    holdLabel: "当前标记",
    accent: "red",
    usageHint: "下注确认时勾选使用，并填写完整预测比分。",
    visibilityHint: "下注动态和个人资料会公开显示你这次的打康预测比分。",
  },
  {
    id: "robbie_hex",
    name: "紫色的罗比印记",
    shortName: "罗比印记",
    cost: 1500,
    icon: "🔮",
    description: "选择当前赛程中的一位选手，为他的头像永久贴上显眼的 [罗比!] 标签。",
    flavor: "不加数值，只加心理压力。全场都知道你在毒奶谁。",
    holdLabel: "已贴标签",
    accent: "violet",
    requiresTarget: true,
    usageHint: "购买时立刻选择目标选手，提交后马上生效。",
    visibilityHint: "大厅、对局卡和头像展示区都会公开显示这个标签。",
  },
  {
    id: "salt_megaphone",
    name: "高频扩音器",
    shortName: "扩音器",
    cost: 100,
    icon: "📣",
    description: "在首页顶部发送一条持续 120 分钟的滚动横幅，可同时存在多条。",
    flavor: "便宜、吵、有效，最适合赛前放话和粉丝互喷。",
    holdLabel: "在飞条数",
    accent: "blue",
    requiresMessage: true,
    usageHint: "购买时直接填写内容，提交后立刻出现在首页顶部。",
    visibilityHint: "所有在线用户都会看到这条横幅，直到 120 分钟后过期。",
  },
];

export const SHOP_ITEMS_BY_ID = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item]),
) as Record<ShopItemId, ShopItemDefinition>;

export function getShopItem(itemId: string): ShopItemDefinition | null {
  if (itemId in SHOP_ITEMS_BY_ID) {
    return SHOP_ITEMS_BY_ID[itemId as ShopItemId];
  }

  return null;
}

export interface InventorySnapshot {
  fdShields: number;
  fatalCounters: number;
  robbieHexes: number;
  activeMegaphones: number;
}

export function getHoldingCount(inventory: InventorySnapshot, itemId: ShopItemId): number {
  switch (itemId) {
    case "fd_shield":
      return inventory.fdShields;
    case "fatal_counter":
      return inventory.fatalCounters;
    case "robbie_hex":
      return inventory.robbieHexes;
    case "salt_megaphone":
      return inventory.activeMegaphones;
  }
}

export function stringifyPurchaseDetails(details: Record<string, string | number | boolean | null | undefined>) {
  return JSON.stringify(details);
}

export function parsePurchaseDetails(details: string | null | undefined) {
  if (!details) {
    return null;
  }

  try {
    return JSON.parse(details) as Record<string, string | number | boolean | null>;
  } catch {
    return null;
  }
}
