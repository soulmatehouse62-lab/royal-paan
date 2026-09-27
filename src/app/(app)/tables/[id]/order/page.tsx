import { getMenu } from "@/lib/menu-data";
import { TableOrderPageClient } from "./page-client";

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tableId } = await params;
  const menuItems = await getMenu();
  const availableMenu = menuItems.filter((m) => m.isAvailable);

  return <TableOrderPageClient tableId={tableId} initialMenu={availableMenu} />;
}
