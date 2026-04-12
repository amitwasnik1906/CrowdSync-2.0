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

  console.log("\nSeed completed successfully!");
  console.log("Admin login: admin@crowdsync.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
