-- CreateTable
CREATE TABLE "MateriPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodeTestId" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "videoType" TEXT,
    "videoUrl" TEXT,
    "videoFile" TEXT,
    "pdfFile" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MateriPeriode_periodeTestId_fkey" FOREIGN KEY ("periodeTestId") REFERENCES "PeriodeTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MateriProgressPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "periodeTestId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MateriProgressPeriode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MateriProgressPeriode_periodeTestId_fkey" FOREIGN KEY ("periodeTestId") REFERENCES "PeriodeTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MateriProgressPeriode_userId_periodeTestId_key" ON "MateriProgressPeriode"("userId", "periodeTestId");

-- RedefineIndex
DROP INDEX "User_nip_key";
CREATE UNIQUE INDEX "User_npp_key" ON "User"("npp");
