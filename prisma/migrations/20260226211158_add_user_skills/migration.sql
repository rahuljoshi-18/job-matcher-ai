-- AlterTable
ALTER TABLE "users" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
