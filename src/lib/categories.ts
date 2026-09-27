import {
  Coffee,
  CookingPot,
  CupSoda,
  Flame,
  GlassWater,
  IceCreamCone,
  Leaf,
  Milk,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";

/** Categories that get sizes (Medium / Large) switched on automatically. */
export const DRINK_CATEGORIES = ["Tea", "Coffee", "Shakes", "Lassi", "Beverages", "Juices", "Cold Drinks"];

export const isDrinkCategory = (category: string) =>
  DRINK_CATEGORIES.some((c) => c.toLowerCase() === category.trim().toLowerCase());

export type CategoryStyle = { icon: LucideIcon; color: string; soft: string };

const KNOWN: Record<string, CategoryStyle> = {
  paan: { icon: Leaf, color: "#1E6B38", soft: "#E3F1E6" },
  tea: { icon: Coffee, color: "#9A5B1E", soft: "#F8EBDD" },
  coffee: { icon: Coffee, color: "#6B4226", soft: "#F2E7DE" },
  shakes: { icon: CupSoda, color: "#B0156C", soft: "#FBE6F1" },
  lassi: { icon: Milk, color: "#2F6FA3", soft: "#E4EFF8" },
  beverages: { icon: GlassWater, color: "#0E7C86", soft: "#DFF3F4" },
  juices: { icon: GlassWater, color: "#D2691E", soft: "#FCEBDD" },
  "cold drinks": { icon: CupSoda, color: "#0E7C86", soft: "#DFF3F4" },
  starters: { icon: Flame, color: "#C2410C", soft: "#FDEBE1" },
  snacks: { icon: Sandwich, color: "#B7791F", soft: "#FBF0D9" },
  "main course": { icon: Soup, color: "#A63A2B", soft: "#FAE6E2" },
  breads: { icon: Wheat, color: "#A67C2E", soft: "#F8EFDC" },
  rice: { icon: CookingPot, color: "#7A6A1F", soft: "#F4F0DA" },
  thali: { icon: UtensilsCrossed, color: "#7B3F8C", soft: "#F2E5F5" },
  desserts: { icon: IceCreamCone, color: "#C0457A", soft: "#FBE5EF" },
  salads: { icon: Salad, color: "#3F7D2B", soft: "#E7F3E1" },
  chinese: { icon: Flame, color: "#B91C1C", soft: "#FCE4E4" },
  pizza: { icon: Pizza, color: "#C2410C", soft: "#FDEBE1" },
};

/** Stable colour for a category we don't know, derived from a hash of its name. */
function hashHue(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function categoryStyle(category: string): CategoryStyle {
  const key = category.trim().toLowerCase();
  const known = KNOWN[key];
  if (known) return known;
  const hue = hashHue(key);
  return { icon: Utensils, color: `hsl(${hue} 55% 36%)`, soft: `hsl(${hue} 60% 94%)` };
}

const CATEGORY_HI: Record<string, string> = {
  paan: "पान",
  tea: "चाय",
  coffee: "कॉफ़ी",
  shakes: "शेक",
  lassi: "लस्सी",
  beverages: "पेय",
  juices: "जूस",
  "cold drinks": "कोल्ड ड्रिंक",
  starters: "स्टार्टर",
  snacks: "नाश्ता",
  "main course": "मेन कोर्स",
  breads: "रोटी",
  rice: "चावल",
  thali: "थाली",
  desserts: "मिठाई",
  salads: "सलाद",
  chinese: "चाइनीज़",
  pizza: "पिज़्ज़ा",
};

/** Category name to show. Categories are stored in English; known ones get a Hindi label. */
export function categoryLabel(category: string, locale: "hi" | "en"): string {
  return (locale === "hi" && CATEGORY_HI[category.trim().toLowerCase()]) || category;
}

const SIZE_HI: Record<string, string> = {
  small: "छोटा",
  medium: "मीडियम",
  large: "बड़ा",
  regular: "रेगुलर",
  half: "हाफ़",
  full: "फ़ुल",
  single: "सिंगल",
  double: "डबल",
};

/** Size name to show, e.g. "Large" → "बड़ा". */
export function sizeName(size: string, locale: "hi" | "en"): string {
  return (locale === "hi" && SIZE_HI[size.trim().toLowerCase()]) || size;
}
