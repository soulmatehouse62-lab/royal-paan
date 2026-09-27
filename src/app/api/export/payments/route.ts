import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseOrderFilters } from "@/lib/order-filters";
import { csvResponse, csvRow, rupees } from "@/lib/csv";
import { dayRange, formatDateTime, toYmd } from "@/lib/time";
import { formatOrderNumber } from "@/lib/pricing";

const BATCH = 1000;

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { from, to, method } = parseOrderFilters(req.nextUrl.searchParams);

  const where: Prisma.PaymentWhereInput = {};
  if (from || to) {
    const r = dayRange(from ?? "2000-01-01", to ?? "2999-12-31");
    where.paidAt = { gte: r.start, lt: r.end };
  }
  if (method) where.method = method;

  return csvResponse(`payments-${toYmd()}.csv`, ["Paid at", "Order", "Customer", "Phone", "Method", "Amount"], async (cursor) => {
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        paidAt: true,
        method: true,
        amount: true,
        order: { select: { orderNumber: true, customerName: true, customerPhone: true } },
      },
    });
    return {
      rows: payments.map((p) =>
        csvRow([
          formatDateTime(p.paidAt),
          formatOrderNumber(p.order.orderNumber),
          p.order.customerName,
          p.order.customerPhone,
          p.method,
          rupees(p.amount),
        ]),
      ),
      cursor: payments.length === BATCH ? payments[payments.length - 1].id : undefined,
    };
  });
}
