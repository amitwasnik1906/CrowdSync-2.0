require("dotenv").config();
const prisma = require("../src/config/prisma");

(async () => {
  try {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    console.log(`Today (UTC midnight): ${today.toISOString()}`);

    const todayRows = await prisma.busDailyHistory.findMany({
      where: { date: today },
      select: {
        busId: true,
        date: true,
        driverId: true,
        driverName: true,
        driverPhoto: true,
        driverPhotoPublicId: true,
      },
    });

    console.log(`\nTodayBusDailyHistory rows: ${todayRows.length}`);
    for (const r of todayRows) {
      console.log(JSON.stringify(r, null, 2));
    }

    const anyWithPhoto = await prisma.busDailyHistory.findMany({
      where: { driverPhoto: { not: null } },
      select: { busId: true, date: true, driverName: true, driverPhoto: true },
      orderBy: { date: "desc" },
      take: 5,
    });
    console.log(`\nMost-recent rows ever with a driverPhoto: ${anyWithPhoto.length}`);
    for (const r of anyWithPhoto) {
      console.log(`  busId=${r.busId} date=${r.date.toISOString().slice(0,10)} driver=${r.driverName} url=${r.driverPhoto?.slice(0,80)}...`);
    }

    const buses = await prisma.bus.findMany({
      select: { id: true, busNumber: true, driver: { select: { id: true, name: true, faceId: true } } },
    });
    console.log(`\nBuses & assigned drivers:`);
    for (const b of buses) {
      console.log(`  bus#${b.id} ${b.busNumber} → driver=${b.driver ? `${b.driver.name} (faceId=${b.driver.faceId})` : "—"}`);
    }
  } catch (e) {
    console.error("ERROR:", e.message);
    if (e.code === "P2022" || /column.+does not exist/i.test(e.message)) {
      console.error("\n>>> Likely the migration has NOT been applied to the database.");
      console.error(">>> Run:  cd backend && npx prisma migrate deploy");
    }
  } finally {
    await prisma.$disconnect();
  }
})();
