-- Rename nip to npp
ALTER TABLE "User" RENAME COLUMN "nip" TO "npp";

-- Add vendor column
ALTER TABLE "User" ADD COLUMN "vendor" TEXT;
