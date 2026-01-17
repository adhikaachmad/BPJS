-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubKategori" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "kategoriId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubKategori_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubKategori" ("createdAt", "deskripsi", "id", "kategoriId", "nama", "slug", "updatedAt") SELECT "createdAt", "deskripsi", "id", "kategoriId", "nama", "slug", "updatedAt" FROM "SubKategori";
DROP TABLE "SubKategori";
ALTER TABLE "new_SubKategori" RENAME TO "SubKategori";
CREATE UNIQUE INDEX "SubKategori_slug_key" ON "SubKategori"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
