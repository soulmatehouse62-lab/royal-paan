import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { orderWhere, parseOrderFilters } from "@/lib/order-filters";
import { csvResponse, csvRow, rupees } from "@/lib/csv";
import { formatDateTime, toYmd } from "@/lib/time";
import { formatOrderNumber } from "@/lib/pricing";

const BATCH = 500;

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const where = orderWhere(parseOrderFilters(req.nextUrl.searchParams));

  return csvResponse(
    `orders-${toYmd()}.csv`,
    ["Order", "Date", "Customer", "Phone", "Table", "Items", "Subtotal", "Discount", "Total", "Paid", "Due", "Status", "Paid by"],
    async (cursor) => {
      const orders = await prisma.order.findMany({
        where,
        orderBy: { id: "asc" }, // ObjectIds grow with time: oldest first, stable cursor
        take: BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          customerName: true,
          customerPhone: true,
          tableNumber: true,
          subtotal: true,
          discountAmount: true,
          total: true,
          amountPaid: true,
          balanceDue: true,
          status: true,
          items: { select: { itemName: true, variantName: true, quantity: true } },
          payments: { select: { method: true } },
        },
      });
      return {
        rows: orders.map((o) =>
          csvRow([
            formatOrderNumber(o.orderNumber),
            formatDateTime(o.createdAt),
            o.customerName,
            o.customerPhone,
            o.tableNumber,
            o.items.map((i) => `${i.quantity}x ${i.itemName}${i.variantName ? ` (${i.variantName})` : ""}`).join("; "),
            rupees(o.subtotal),
            rupees(o.discountAmount),
            rupees(o.total),
            rupees(o.amountPaid),
            rupees(o.balanceDue),
            o.status,
            Array.from(new Set(o.payments.map((p) => p.method))).join(" + "),
          ]),
        ),
        cursor: orders.length === BATCH ? orders[orders.length - 1].id : undefined,
      };
    },
  );
}
