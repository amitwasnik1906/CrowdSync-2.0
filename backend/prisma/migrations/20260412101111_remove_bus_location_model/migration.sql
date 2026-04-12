/*
  Warnings:

  - You are about to drop the column `location` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the `BusLocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BusLocation" DROP CONSTRAINT "BusLocation_busId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "location",
ADD COLUMN     "locationName" TEXT;

-- DropTable
DROP TABLE "BusLocation";
