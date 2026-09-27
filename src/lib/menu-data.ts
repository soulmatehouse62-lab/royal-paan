import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const MENU_TAG = "menu";

export type MenuEntry = {
  id: string;
  name: string;
  nameHi: string | null;
  price: number;
  variants: { name: string; price: number }[];
  category: string;
  isAvailable: boolean;
};

/**
 * The whole menu, cached across requests and invalidated with
 * revalidateTag(MENU_TAG) whenever an item changes. New Order, the Menu
 * screen and the public /m page all read from here, so they rarely touch
 * the database.
 */
export const getMenu = unstable_cache(
  async (): Promise<MenuEntry[]> => {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameHi: true, price: true, variants: true, category: true, isAvailable: true },
    });
    return items.map((i) => ({ ...i, variants: i.variants.map((v) => ({ name: v.name, price: v.price })) }));
  },
  ["menu-v2"],
  { tags: [MENU_TAG], revalidate: 3600 },
);

/** Categories in first-seen order, from an already sorted menu. */
export function categoriesOf(items: MenuEntry[]): string[] {
  return Array.from(new Set(items.map((i) => i.category)));
}
