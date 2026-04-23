require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@crowdsync.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@crowdsync.com",
      password: hashedPassword,
    },
  });

  console.log("Admin created:", admin.email);

  // Create sample bus
  const bus = await prisma.bus.upsert({
    where: { busNumber: "BUS-001" },
    update: {},
    create: {
      busNumber: "BUS-001",
      routeName: "Route A - Downtown",
      capacity: 40,
    },
  });

  console.log("Bus created:", bus.busNumber);

  // Create sample driver, assigned to the bus
  const driver = await prisma.driver.upsert({
    where: { licenseNumber: "DL-12345" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      phone: "+911111111111",
      licenseNumber: "DL-12345",
      faceId: "DRIVER-FACE-001",
      busId: bus.id,
    },
  });

  console.log("Driver created:", driver.name);

  // Create sample parent
  const parent = await prisma.parent.upsert({
    where: { phone: "+1234567890" },
    update: {},
    create: {
      name: "John Doe",
      phone: "+1234567890",
      email: "john@example.com",
    },
  });

  console.log("Parent created:", parent.name);

  // Create sample student
  const student = await prisma.student.upsert({
    where: { faceId: "FACE-001" },
    update: {},
    create: {
      name: "Jane Doe",
      class: "Grade 5",
      faceId: "FACE-001",
      parentId: parent.id,
      busId: bus.id,
    },
  });

  console.log("Student created:", student.name);

  // Create sample attendance (last 3 days) — idempotent per (studentId, date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendanceDays = [
    {
      dayOffset: 0,
      entry: { h: 7, m: 30 },
      exit: null, // still on the bus today
      locationName: "Main Gate",
    },
    {
      dayOffset: -1,
      entry: { h: 7, m: 28 },
      exit: { h: 14, m: 45 },
      locationName: "Main Gate",
    },
    {
      dayOffset: -2,
      entry: { h: 7, m: 32 },
      exit: { h: 14, m: 40 },
      locationName: "Main Gate",
    },
  ];

  for (const a of attendanceDays) {
    const date = new Date(today);
    date.setDate(date.getDate() + a.dayOffset);

    const existing = await prisma.attendance.findFirst({
      where: { studentId: student.id, date },
    });
    if (existing) continue;

    const entryTime = new Date(date);
    entryTime.setHours(a.entry.h, a.entry.m, 0, 0);

    const exitTime = a.exit ? new Date(date) : null;
    if (exitTime) exitTime.setHours(a.exit.h, a.exit.m, 0, 0);

    await prisma.attendance.create({
      data: {
        studentId: student.id,
        busId: bus.id,
        entryTime,
        exitTime,
        locationName: a.locationName,
        date,
      },
    });
  }

  console.log(`Attendance seeded for ${student.name} (last 3 days)`);

  // Create sample notifications for the parent — idempotent per title
  const notifications = [
    {
      title: "Bus arriving soon",
      body: `${bus.busNumber} is 5 minutes away from the pickup point.`,
      type: "bus_eta",
      read: false,
    },
    {
      title: "Student boarded",
      body: `${student.name} boarded ${bus.busNumber} at ${new Date().toDateString()}.`,
      type: "attendance_entry",
      read: false,
    },
    {
      title: "Student dropped off",
      body: `${student.name} was dropped off at Main Gate.`,
      type: "attendance_exit",
      read: true,
    },
    {
      title: "Welcome to CrowdSync",
      body: "Your account has been linked. You'll get live updates about your child's bus here.",
      type: "system",
      read: true,
    },
  ];

  for (const n of notifications) {
    const existing = await prisma.notification.findFirst({
      where: { parentId: parent.id, title: n.title },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: { ...n, parentId: parent.id },
    });
  }

  console.log(`Notifications seeded for ${parent.name}`);

  console.log("\nSeed completed successfully!");
  console.log("Admin login: admin@crowdsync.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
