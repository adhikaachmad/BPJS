-- CreateTable
CREATE TABLE "PeriodeTest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subKategoriId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tanggal" DATETIME,
    "jamMulai" DATETIME,
    "jamBerakhir" DATETIME,
    "doCheckBerakhir" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PeriodeTest_subKategoriId_fkey" FOREIGN KEY ("subKategoriId") REFERENCES "SubKategori" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SoalPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodeTestId" INTEGER NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsiA" TEXT NOT NULL,
    "opsiB" TEXT NOT NULL,
    "opsiC" TEXT NOT NULL,
    "opsiD" TEXT NOT NULL,
    "jawabanBenar" TEXT NOT NULL,
    "pembahasan" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SoalPeriode_periodeTestId_fkey" FOREIGN KEY ("periodeTestId") REFERENCES "PeriodeTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestSessionPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "periodeTestId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestSessionPeriode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestSessionPeriode_periodeTestId_fkey" FOREIGN KEY ("periodeTestId") REFERENCES "PeriodeTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JawabanPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testSessionPeriodeId" INTEGER NOT NULL,
    "soalPeriodeId" INTEGER NOT NULL,
    "jawaban" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JawabanPeriode_testSessionPeriodeId_fkey" FOREIGN KEY ("testSessionPeriodeId") REFERENCES "TestSessionPeriode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HasilTestPeriode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testSessionPeriodeId" INTEGER NOT NULL,
    "totalSoal" INTEGER NOT NULL,
    "benar" INTEGER NOT NULL,
    "salah" INTEGER NOT NULL,
    "tidakDijawab" INTEGER NOT NULL DEFAULT 0,
    "skor" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HasilTestPeriode_testSessionPeriodeId_fkey" FOREIGN KEY ("testSessionPeriodeId") REFERENCES "TestSessionPeriode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PeriodeTest_subKategoriId_bulan_tahun_key" ON "PeriodeTest"("subKategoriId", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "TestSessionPeriode_userId_periodeTestId_key" ON "TestSessionPeriode"("userId", "periodeTestId");

-- CreateIndex
CREATE UNIQUE INDEX "JawabanPeriode_testSessionPeriodeId_soalPeriodeId_key" ON "JawabanPeriode"("testSessionPeriodeId", "soalPeriodeId");

-- CreateIndex
CREATE UNIQUE INDEX "HasilTestPeriode_testSessionPeriodeId_key" ON "HasilTestPeriode"("testSessionPeriodeId");
