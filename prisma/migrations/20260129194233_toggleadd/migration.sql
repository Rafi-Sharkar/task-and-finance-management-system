-- AlterTable
ALTER TABLE "notification-toggle" ADD COLUMN     "DocumentApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "Finance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "Payment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ProjectAssignment" BOOLEAN NOT NULL DEFAULT true;
