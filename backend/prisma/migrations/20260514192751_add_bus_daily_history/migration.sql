-- CreateTable
CREATE TABLE "BusDailyHistory" (
    "id" SERIAL NOT NULL,
    "busId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "driverId" INTEGER,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "points" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusDailyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusDailyHistory_busId_date_idx" ON "BusDailyHistory"("busId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BusDailyHistory_busId_date_key" ON "BusDailyHistory"("busId", "date");

-- AddForeignKey
ALTER TABLE "BusDailyHistory" ADD CONSTRAINT "BusDailyHistory_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
