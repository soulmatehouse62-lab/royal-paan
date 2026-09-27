import { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function TableLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const table = await prisma.table.findUnique({
    where: { id },
  });

  if (!table) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/tables"
              className="p-2 rounded-lg hover:bg-cream-deep transition"
              title="Back to tables"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-ink">
                {table.name || `Table ${table.tableNumber}`}
              </h1>
              <p className="text-xs text-muted">Capacity: {table.capacity} seats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {children}
      </div>
    </div>
  );
}
