"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { run } from "@/lib/action";
import { prisma, withTransaction, isObjectId, ActionError } from "@/lib/db";
import { MENU_TAG } from "@/lib/menu-data";
import { suggestHindiName } from "@/lib/hindi-names";

const price = z.number().int().min(0, "err.priceNegative").max(10_000_000, "err.priceHigh");

const menuItemSchema = z
  .object({
    id: z.string().refine(isObjectId).optional().nullable(),
    name: z.string().trim().min(1, "err.enterName").max(80),
    nameHi: z.string().trim().max(80).optional().nullable(),
    category: z.string().trim().min(1, "err.enterCategory").max(40),
    price: price.optional(),
    variants: z
      .array(z.object({ name: z.string().trim().min(1, "err.sizeName").max(30), price }))
      .max(6, "err.maxSizes"),
    isAvailable: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.variants.length === 1) ctx.addIssue({ code: "custom", message: "err.twoSizes" });
    const names = v.variants.map((x) => x.name.toLowerCase());
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "err.sizeUnique" });
    if (v.variants.length === 0 && v.price === undefined) ctx.addIssue({ code: "custom", message: "err.enterPrice" });
  });

function refreshMenu() {
  revalidateTag(MENU_TAG);
  revalidatePath("/menu");
  revalidatePath("/m");
  revalidatePath("/");
}

export async function saveMenuItemAction(input: unknown) {
  return run(async () => {
    await requireAdmin();
    const v = menuItemSchema.parse(input);
    const data = {
      name: v.name,
      nameHi: v.nameHi || null,
      category: v.category,
      variants: v.variants,
      // Items with sizes store their lowest size price as the headline price.
      price: v.variants.length ? Math.min(...v.variants.map((x) => x.price)) : v.price!,
      isAvailable: v.isAvailable,
    };
    if (v.id) {
      const res = await prisma.menuItem.updateMany({ where: { id: v.id }, data });
      if (res.count === 0) throw new ActionError("err.itemDeleted");
    } else {
      await prisma.menuItem.create({ data });
    }
    refreshMenu();
    return null;
  });
}

export async function setAvailabilityAction(id: string, isAvailable: boolean) {
  return run(async () => {
    await requireUser(); // staff can switch availability too
    if (!isObjectId(id)) throw new ActionError("err.unknownItem");
    await prisma.menuItem.updateMany({ where: { id }, data: { isAvailable: Boolean(isAvailable) } });
    refreshMenu();
    return null;
  });
}

export async function deleteMenuItemAction(id: string) {
  return run(async () => {
    await requireAdmin();
    if (!isObjectId(id)) throw new ActionError("err.unknownItem");
    // Past bills keep their snapshots; only the link back to the menu is cleared.
    await withTransaction(async (tx) => {
      await tx.orderItem.updateMany({ where: { menuItemId: id }, data: { menuItemId: null } });
      await tx.menuItem.deleteMany({ where: { id } });
    });
    refreshMenu();
    return null;
  });
}

/**
 * Fill in Hindi names for menu items that don't have one, and copy them onto
 * past bill lines of those items. Items with a word we don't know are skipped
 * and returned, so an admin can type those by hand.
 */
export async function fillHindiNamesAction() {
  return run(async () => {
    await requireAdmin();
    const items = await prisma.menuItem.findMany({ select: { id: true, name: true, nameHi: true } });
    const missing = items.filter((i) => !i.nameHi?.trim());
    const skipped: string[] = [];
    let filled = 0;
    for (const item of missing) {
      const nameHi = suggestHindiName(item.name);
      if (!nameHi) {
        skipped.push(item.name);
        continue;
      }
      await prisma.menuItem.update({ where: { id: item.id }, data: { nameHi } });
      // Old bills of this item show the Hindi name too (only lines without one).
      await prisma.orderItem.updateMany({
        where: { menuItemId: item.id, OR: [{ itemNameHi: null }, { itemNameHi: { isSet: false } }] },
        data: { itemNameHi: nameHi },
      });
      filled++;
    }
    if (filled) refreshMenu();
    return { filled, skipped };
  });
}
