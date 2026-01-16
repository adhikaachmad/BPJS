-- Rename kantorWilayah to kepwil and kantorCabang to kcKabupaten
-- Add kakabKabupaten field

-- SQLite doesn't support RENAME COLUMN directly in older versions
-- We'll use a pragma to handle this

-- Step 1: Rename kantorWilayah to kepwil
ALTER TABLE "User" RENAME COLUMN "kantorWilayah" TO "kepwil";

-- Step 2: Rename kantorCabang to kcKabupaten
ALTER TABLE "User" RENAME COLUMN "kantorCabang" TO "kcKabupaten";

-- Step 3: Add kakabKabupaten column
ALTER TABLE "User" ADD COLUMN "kakabKabupaten" TEXT;
