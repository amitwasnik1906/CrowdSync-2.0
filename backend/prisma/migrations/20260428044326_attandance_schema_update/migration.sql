/*
  Warnings:

  - You are about to drop the column `entryTime` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `exitTime` on the `Attendance` table. All the data in the column will be lost.
  - Added the required column `time` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "entryTime",
DROP COLUMN "exitTime",
ADD COLUMN     "time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;
