import { prisma } from "@/lib/db";

async function seedTables() {
  console.log("Seeding tables...");

  const tables = [
    // Indoor Tables
    { tableNumber: "1", name: "Table 1", capacity: 2, area: "INDOOR" as const },
    { tableNumber: "2", name: "Table 2", capacity: 2, area: "INDOOR" as const },
    { tableNumber: "3", name: "Table 3", capacity: 4, area: "INDOOR" as const },
    { tableNumber: "4", name: "Table 4", capacity: 4, area: "INDOOR" as const },
    { tableNumber: "5", name: "Table 5", capacity: 6, area: "INDOOR" as const },
    // Outdoor Tables
    { tableNumber: "6", name: "Outdoor 1", capacity: 4, area: "OUTDOOR" as const },
    { tableNumber: "7", name: "Outdoor 2", capacity: 4, area: "OUTDOOR" as const },
    { tableNumber: "8", name: "Outdoor 3", capacity: 6, area: "OUTDOOR" as const },
    // AC Hall
    { tableNumber: "9", name: "Hall A-1", capacity: 8, area: "AC_HALL" as const },
    { tableNumber: "10", name: "Hall A-2", capacity: 8, area: "AC_HALL" as const },
  ];

  for (const table of tables) {
    const existing = await prisma.table.findUnique({
      where: { tableNumber: table.tableNumber },
    });

    if (!existing) {
      const created = await prisma.table.create({
        data: table,
      });
      console.log(`✓ Created ${created.name}`);
    } else {
      console.log(`- Table ${table.tableNumber} already exists`);
    }
  }

  console.log("✓ Table seeding complete");
}

seedTables()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
