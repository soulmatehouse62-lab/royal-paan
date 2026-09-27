import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { digitsOnly, escapeRegex, nameWords } from "@/lib/phone";

export type CustomerMatch = { phone: string; phoneKey: string; name: string | null };
export type CustomerLookup = {
  matches: CustomerMatch[];
  /** Set when the query is a full phone number we know. */
  exact: (CustomerMatch & { dueTotal: number; dueCount: number }) | null;
};

const LIMIT = 6;

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  const empty: CustomerLookup = { matches: [], exact: null };
  if (!q) return NextResponse.json(empty);

  const isPhone = /^[+\d\s-]+$/.test(q);
  let matches: CustomerMatch[] = [];
  let exact: CustomerLookup["exact"] = null;

  if (isPhone) {
    const digits = digitsOnly(q);
    if (digits.length < 3) return NextResponse.json(empty);
    const key = digits.length >= 10 ? digits.slice(-10) : null;

    const [found, dues] = await Promise.all([
      prisma.customer.findMany({
        // Anchored prefix on the indexed phoneKey. With a country code typed,
        // fall back to the last 10 digits.
        where: key ? { phoneKey: key } : { phoneKey: { startsWith: digits } },
        orderBy: { lastVisitAt: "desc" },
        take: LIMIT,
        select: { phone: true, phoneKey: true, name: true },
      }),
      key
        ? prisma.order.aggregate({ where: { phoneKey: key, balanceDue: { gt: 0 } }, _sum: { balanceDue: true }, _count: true })
        : null,
    ]);
    matches = found;
    if (key && found[0]) {
      exact = { ...found[0], dueTotal: dues?._sum.balanceDue ?? 0, dueCount: dues?._count ?? 0 };
    }
  } else {
    // Prefix match on any word of the name, using the nameWords index.
    const words = nameWords(q);
    if (words.length === 0) return NextResponse.json(empty);
    const filter = { $and: words.map((w) => ({ nameWords: { $regex: `^${escapeRegex(w)}` } })) };
    const raw = (await prisma.customer.findRaw({
      filter,
      options: { sort: { lastVisitAt: -1 }, limit: LIMIT, projection: { phone: 1, phoneKey: 1, name: 1 } },
    })) as unknown as CustomerMatch[];
    matches = raw.map((r) => ({ phone: r.phone, phoneKey: r.phoneKey, name: r.name ?? null }));
  }

  return NextResponse.json({ matches, exact } satisfies CustomerLookup, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
