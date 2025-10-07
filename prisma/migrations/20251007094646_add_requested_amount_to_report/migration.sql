/*
  Warnings:

  - Added the required column `requestedAmount` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "requestedAmount" DOUBLE PRECISION NOT NULL;
