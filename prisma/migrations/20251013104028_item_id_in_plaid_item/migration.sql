/*
  Warnings:

  - A unique constraint covering the columns `[itemId]` on the table `PlaidItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `itemId` to the `PlaidItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."PlaidItem" ADD COLUMN     "itemId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "public"."PlaidItem"("itemId");
