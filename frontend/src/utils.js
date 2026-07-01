// Utility helpers for the dashboard

export function formatNumber(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 5)  return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return formatDate(iso);
}

export function seaLabel(sea) {
  switch (sea) {
    case 1: return "Sea 1";
    case 2: return "Sea 2";
    case 3: return "Sea 3 (Third)";
    default: return `Sea ${sea}`;
  }
}

export function seaClass(sea) {
  switch (sea) {
    case 1: return "s1";
    case 2: return "s2";
    case 3: return "s3";
    default: return "s1";
  }
}

export function levelColor(lv) {
  if (lv >= 2400) return "#f59e0b";  // Max — gold
  if (lv >= 1500) return "#8b5cf6";  // Sea 3 — purple
  if (lv >= 700)  return "#3b82f6";  // Sea 2 — blue
  return "#06b6d4";                  // Sea 1 — cyan
}

// Fruit tier
const MYTHICAL = ["Leopard Fruit", "Dragon Fruit", "Kitsune Fruit"];
const LEGENDARY = ["Dough Fruit", "Soul Fruit", "Venom Fruit", "Control Fruit", "Spirit Fruit", "Mammoth Fruit", "T-Rex Fruit"];
const RARE = ["Quake Fruit", "Blizzard Fruit", "Gravity Fruit", "Portal Fruit", "Phoenix Fruit", "Rumble Fruit", "Pain Fruit", "Magma Fruit"];

export function fruitTier(fruit) {
  if (!fruit || fruit === "None") return null;
  if (MYTHICAL.includes(fruit))  return "Mythical";
  if (LEGENDARY.includes(fruit)) return "Legendary";
  if (RARE.includes(fruit))      return "Rare";
  return "Common";
}

export function fruitTierColor(tier) {
  switch (tier) {
    case "Mythical":  return "#f59e0b";
    case "Legendary": return "#8b5cf6";
    case "Rare":      return "#3b82f6";
    case "Common":    return "#94a3b8";
    default:          return "#475569";
  }
}
