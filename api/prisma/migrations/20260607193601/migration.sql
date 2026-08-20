-- DropIndex
DROP INDEX "Job_company_idx";

-- DropIndex
DROP INDEX "Job_location_idx";

-- DropIndex
DROP INDEX "Job_type_idx";

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "description" SET DEFAULT '';
