-- AlterTable
ALTER TABLE "Soal" ADD COLUMN "pembahasan" TEXT;

-- CreateTable
CREATE TABLE "Materi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "judul" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "videoUrl" TEXT,
    "pdfUrl" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "modulId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Materi_modulId_fkey" FOREIGN KEY ("modulId") REFERENCES "Modul" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MateriProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "modulId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MateriProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MateriProgress_modulId_fkey" FOREIGN KEY ("modulId") REFERENCES "Modul" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Modul" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'JITU',
    "deskripsi" TEXT,
    "gradientFrom" TEXT NOT NULL,
    "gradientTo" TEXT NOT NULL,
    "icon" TEXT,
    "durasi" INTEGER NOT NULL DEFAULT 30,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "subKategoriId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Modul_subKategoriId_fkey" FOREIGN KEY ("subKategoriId") REFERENCES "SubKategori" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Modul" ("createdAt", "deskripsi", "durasi", "gradientFrom", "gradientTo", "icon", "id", "nama", "subKategoriId", "updatedAt") SELECT "createdAt", "deskripsi", "durasi", "gradientFrom", "gradientTo", "icon", "id", "nama", "subKategoriId", "updatedAt" FROM "Modul";
DROP TABLE "Modul";
ALTER TABLE "new_Modul" RENAME TO "Modul";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MateriProgress_userId_modulId_key" ON "MateriProgress"("userId", "modulId");
