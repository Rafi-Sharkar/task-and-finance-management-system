/*
  Warnings:

  - Added the required column `expectedValue` to the `Provision` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Provision" ADD COLUMN     "expectedValue" DOUBLE PRECISION NOT NULL;
