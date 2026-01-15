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
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "jadwalMulai" DATETIME,
    "jadwalSelesai" DATETIME,
    "publishDoCheck" DATETIME,
    "subKategoriId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Modul_subKategoriId_fkey" FOREIGN KEY ("subKategoriId") REFERENCES "SubKategori" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Modul" ("createdAt", "deskripsi", "durasi", "gradientFrom", "gradientTo", "icon", "id", "nama", "subKategoriId", "tipe", "updatedAt", "urutan") SELECT "createdAt", "deskripsi", "durasi", "gradientFrom", "gradientTo", "icon", "id", "nama", "subKategoriId", "tipe", "updatedAt", "urutan" FROM "Modul";
DROP TABLE "Modul";
ALTER TABLE "new_Modul" RENAME TO "Modul";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
