// Shared by server and client. Labels come from t(`kirana.cat.${value}`) and t(`kirana.unit.${unit}`).
import type { ExpenseCategory } from "@prisma/client";

export const EXPENSE_CATEGORIES = [
  "RATION",
  "VEGETABLES",
  "DAIRY",
  "GAS",
  "STAFF_ADVANCE",
  "SALARY",
  "ELECTRICITY",
  "RENT",
  "OTHER",
] as const satisfies readonly ExpenseCategory[];

export const ITEM_UNITS = ["kg", "g", "L", "ml", "pcs", "pkt", "dozen"] as const;
export type ItemUnit = (typeof ITEM_UNITS)[number];

/** Paid to a person: the staff name is required. */
export const needsStaff = (c: ExpenseCategory) => c === "STAFF_ADVANCE" || c === "SALARY";

/** Bought goods: the form opens with an item list. */
export const hasItems = (c: ExpenseCategory) => c === "RATION" || c === "VEGETABLES" || c === "DAIRY" || c === "OTHER";
