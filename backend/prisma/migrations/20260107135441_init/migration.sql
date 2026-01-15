/*
  Warnings:

  - Added the required column `slug` to the `SubKategori` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `posisi` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubKategori" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kategoriId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubKategori_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubKategori" ("createdAt", "deskripsi", "id", "kategoriId", "nama", "updatedAt") SELECT "createdAt", "deskripsi", "id", "kategoriId", "nama", "updatedAt" FROM "SubKategori";
DROP TABLE "SubKategori";
ALTER TABLE "new_SubKategori" RENAME TO "SubKategori";
CREATE UNIQUE INDEX "SubKategori_slug_key" ON "SubKategori"("slug");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nip" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "posisi" TEXT NOT NULL,
    "kantorCabang" TEXT,
    "kantorWilayah" TEXT,
    "subKategoriId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_subKategoriId_fkey" FOREIGN KEY ("subKategoriId") REFERENCES "SubKategori" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "id", "nama", "nip", "subKategoriId", "updatedAt") SELECT "createdAt", "id", "nama", "nip", "subKategoriId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_nip_key" ON "User"("nip");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
